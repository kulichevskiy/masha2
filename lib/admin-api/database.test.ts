// @vitest-environment node
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const owner = '00000000-0000-4000-8000-000000000001'
const token = '00000000-0000-4000-8000-000000000002'
const migrationDir = join(process.cwd(), 'supabase/migrations')
let db: PGlite

async function audit(resource: string, action: string, tokenId = token) {
  const id = randomUUID()
  await db.query(`insert into public.api_audit_log (id, token_id, token_name, operation, resource)
    values ($1, $2, 'Test token', $3, $4)`, [id, tokenId, action, resource])
  return id
}
async function mutate(resource: string, action: string, id = '', version: number | null = null,
  data: unknown = {}, auditId?: string, tokenId = token) {
  const log = auditId ?? await audit(resource, action, tokenId)
  const result = await db.query<{ result: Record<string, unknown> }>(
    'select public.admin_api_mutate($1,$2,$3,$4,$5::jsonb,$6,$7) as result',
    [resource, action, id, version, JSON.stringify(data), tokenId, log])
  return result.rows[0].result
}
function uploadInput(id: string) {
  return {
    purpose: 'media', kind: 'photo', bucket: 'photos', storage_path: `photos/api/${id}/source.jpg`,
    poster_path: null, expires_at: new Date(Date.now() + 3600000).toISOString(),
    metadata: { purpose: 'media', kind: 'photo', filename: 'source.jpg', content_type: 'image/jpeg', size: 100, width: 640, height: 480 },
  }
}
async function photo(position: number) {
  return (await db.query<{ id: string; version: number }>(
    'insert into photos(storage_path, position) values ($1,$2) returning id, version',
    [`test/${randomUUID()}.jpg`, position])).rows[0]
}

beforeAll(async () => {
  db = new PGlite()
  // Minimal Supabase platform schema; every application migration below is real.
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role bypassrls;
    create schema auth;
    create table auth.users (id uuid primary key, email text, banned_until timestamptz);
    create function auth.uid() returns uuid language sql as $$ select null::uuid $$;
    create function auth.jwt() returns jsonb language sql as $$ select '{}'::jsonb $$;
    create schema storage;
    create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid, metadata jsonb);
    alter table storage.objects enable row level security;
  `)
  for (const file of readdirSync(migrationDir).filter(file => file.endsWith('.sql')).sort()) {
    await db.exec(readFileSync(join(migrationDir, file), 'utf8'))
  }
  await db.query('insert into auth.users(id,email) values ($1, $2)', [owner, 'admin@example.com'])
  await db.query('insert into admin_emails(email) values ($1)', ['admin@example.com'])
  await db.query(`insert into api_tokens(id,owner_id,name,prefix,token_hash) values ($1,$2,'Test token','mcp_test',repeat('a',64))`, [token, owner])
}, 30_000)
afterAll(async () => { await db?.close() })

describe('admin API database contract', () => {
  it('enables RLS, removes public access and grants RPC only to service_role', async () => {
    const tables = ['api_tokens', 'api_audit_log', 'api_uploads', 'api_storage_cleanup']
    for (const table of tables) {
      expect((await db.query<{ enabled: boolean }>('select relrowsecurity as enabled from pg_class where oid=$1::regclass', [`public.${table}`])).rows[0].enabled).toBe(true)
      for (const role of ['anon', 'authenticated']) {
        expect((await db.query<{ access: boolean }>('select has_table_privilege($1,$2,\'SELECT,INSERT,UPDATE,DELETE\') as access', [role, `public.${table}`])).rows[0].access).toBe(false)
      }
    }
    for (const signature of ['public.admin_api_mutate(text,text,text,integer,jsonb,uuid,uuid)', 'public.admin_api_authenticate(text)']) {
      for (const role of ['anon', 'authenticated', 'service_role']) {
        expect((await db.query<{ access: boolean }>("select has_function_privilege($1,$2,'EXECUTE') as access", [role, signature])).rows[0].access).toBe(role === 'service_role')
      }
    }
    await db.exec('set role anon')
    try {
      await expect(db.query("select public.admin_api_authenticate('hash')")).rejects.toThrow(/permission denied/)
      await expect(db.query('select * from public.api_tokens')).rejects.toThrow(/permission denied/)
      await expect(db.query("select public.admin_api_mutate('media','delete','',1,'{}',null,null)")).rejects.toThrow(/permission denied/)
    } finally { await db.exec('reset role') }
  })

  it('authenticates only current active admin tokens and records last use atomically', async () => {
    const authenticate = async (hash = 'a'.repeat(64)) => (await db.query<{ principal: unknown }>(
      'select public.admin_api_authenticate($1) as principal', [hash])).rows[0].principal
    expect(await authenticate()).toEqual({ id: token, owner_id: owner, name: 'Test token' })
    expect((await db.query<{ last_used_at: string | null }>('select last_used_at from api_tokens where id=$1', [token])).rows[0].last_used_at).not.toBeNull()
    expect(await authenticate('c'.repeat(64))).toBeNull()
    await db.exec("delete from admin_emails where email='admin@example.com'")
    try { expect(await authenticate()).toBeNull() }
    finally { await db.exec("insert into admin_emails(email) values ('admin@example.com')") }
    await db.query('update api_tokens set revoked_at=now() where id=$1', [token])
    try { expect(await authenticate()).toBeNull() }
    finally { await db.query('update api_tokens set revoked_at=null where id=$1', [token]) }
    await db.query("update auth.users set banned_until=now()+interval '1 day' where id=$1", [owner])
    try { expect(await authenticate()).toBeNull() }
    finally { await db.query('update auth.users set banned_until=null where id=$1', [owner]) }
  })

  it('rejects a deleted owner without advancing last use for removed admins', async () => {
    const otherOwner = randomUUID()
    const otherToken = randomUUID()
    await db.query('insert into auth.users(id,email) values ($1,$2)', [otherOwner, 'removed@example.com'])
    await db.query(`insert into api_tokens(id,owner_id,name,prefix,token_hash) values ($1,$2,'Removed','mcp_removed',repeat('d',64))`, [otherToken, otherOwner])
    const authenticate = async () => (await db.query<{ principal: unknown }>(
      "select public.admin_api_authenticate(repeat('d',64)) as principal")).rows[0].principal
    expect(await authenticate()).toBeNull()
    expect((await db.query<{ last_used_at: string | null }>('select last_used_at from api_tokens where id=$1', [otherToken])).rows[0].last_used_at).toBeNull()
    await db.query('delete from auth.users where id=$1', [otherOwner])
    expect(await authenticate()).toBeNull()
  })

  it('rejects stale writes after ordinary UI changes and preserves an interrupted audit', async () => {
    const item = await photo(10)
    await db.query("update photos set title='UI title', version=999 where id=$1", [item.id])
    const log = await audit('media', 'update')
    await expect(mutate('media', 'update', item.id, item.version, { title: 'Stale agent' }, log)).rejects.toThrow('conflict')
    expect((await db.query('select title,version from photos where id=$1', [item.id])).rows)
      .toEqual([{ title: 'UI title', version: 2 }])
    expect((await db.query('select status,completed_at from api_audit_log where id=$1', [log])).rows)
      .toEqual([{ status: 'started', completed_at: null }])
    expect(await mutate('media', 'update', item.id, 2, { title: 'Fresh agent' })).toMatchObject({ title: 'Fresh agent', version: 3 })
  })

  it('serializes competing API writes so only one expected version wins', async () => {
    const item = await photo(20)
    const logs = await Promise.all([audit('media', 'update'), audit('media', 'update')])
    const results = await Promise.allSettled(logs.map((log, i) => mutate('media','update',item.id,1,{ title: `Writer ${i}` },log)))
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1)
    expect(results.filter(result => result.status === 'rejected')).toHaveLength(1)
    expect((await db.query('select version from photos where id=$1', [item.id])).rows).toEqual([{ version: 2 }])
  })

  it('reorders only selected slots and rolls back all items when one version is stale', async () => {
    const first = await photo(100)
    const omitted = await photo(200)
    const last = await photo(300)
    const log = await audit('media', 'reorder')
    await expect(mutate('media', 'reorder', '', null, { items: [{ id: last.id, version: 1 }, { id: first.id, version: 99 }] }, log)).rejects.toThrow('conflict')
    expect((await db.query('select position,version from photos where id=$1', [last.id])).rows).toEqual([{ position: 300, version: 1 }])
    await mutate('media', 'reorder', '', null, { items: [{ id: last.id, version: 1 }, { id: first.id, version: 1 }] })
    expect((await db.query('select id,position,version from photos where id=any($1::uuid[]) order by position', [[first.id, omitted.id, last.id]])).rows)
      .toEqual([{ id: last.id, position: 100, version: 2 }, { id: omitted.id, position: 200, version: 1 }, { id: first.id, position: 300, version: 2 }])
    expect((await db.query('select status from api_audit_log where id=$1', [log])).rows).toEqual([{ status: 'started' }])
    await expect(mutate('media', 'reorder', '', null, { items: [{ id: last.id, version: 2 }, { id: last.id, version: 2 }] })).rejects.toThrow('invalid_request')
  })

  it('normalizes tied legacy positions while preserving omitted visual slots', async () => {
    const tied = await Promise.all([photo(90000), photo(90000), photo(90000)])
    const before = (await db.query<{ id: string }>('select id from photos order by position,id')).rows.map(row => row.id)
    const selected = before.filter(id => tied.some(row => row.id === id))
    const first = selected[0], last = selected[2]
    await mutate('media', 'reorder', '', null, { items: [{ id: last, version: 1 }, { id: first, version: 1 }] })
    const expected = [...before]
    expected[before.indexOf(first)] = last
    expected[before.indexOf(last)] = first
    expect((await db.query<{ id: string }>('select id from photos order by position,id')).rows.map(row => row.id)).toEqual(expected)
    expect((await db.query('select position from photos group by position having count(*)>1')).rows).toEqual([])
    await expect(mutate('media', 'update', selected[1], 1, { title: 'Stale after normalization' })).rejects.toThrow('conflict')
  })

  it('creates with defaults and prepends without touching existing row versions', async () => {
    const old = await mutate('tiers', 'create', '', null, { name: 'Old tier', price_text: '100 €' })
    const log = await audit('tiers', 'create')
    const created = await mutate('tiers', 'create', '', null, { name: 'New tier', price_text: '200 €' }, log)
    expect(created).toMatchObject({ name: 'New tier', version: 1, is_active: false })
    expect(Number(created.position)).toBeLessThan(Number(old.position))
    expect((await db.query('select status,resource_id from api_audit_log where id=$1', [log])).rows)
      .toEqual([{ status: 'succeeded', resource_id: created.id }])
    await expect(mutate('tiers', 'create', '', null, { name: 'Missing price' })).rejects.toThrow('invalid_request')
  })

  it('rejects unknown fields and actions, including unknown nested content', async () => {
    const item = await photo(400)
    await expect(mutate('media', 'update', item.id, 1, { storage_path: 'other.jpg' })).rejects.toThrow('invalid_request')
    await expect(mutate('media', 'create', '', null, { title: 'No file' })).rejects.toThrow('invalid_request')
    await expect(mutate('booking-requests', 'update', randomUUID(), 1, { email: 'other@example.com' })).rejects.toThrow('invalid_request')
    await expect(mutate('workshop', 'update', '', 1, { gallery: [{ photo_path: 'x.jpg', secret: 'bad' }] })).rejects.toThrow('invalid_request')
    await expect(mutate('settings', 'update', '', 1, { key: 'other', value: 'x' })).rejects.toThrow('invalid_request')
  })

  it('updates singleton content and settings and versions request deletion', async () => {
    const workshop = await mutate('workshop', 'update', '', 1, { banner_visible: true, sales_open: false })
    expect(workshop).toMatchObject({ banner_visible: true, sales_open: false, version: 2 })
    expect(await mutate('gift-certificate', 'update', '', 1, { gallery: [{ photo_path: 'gift/a.jpg' }] })).toMatchObject({ version: 2 })
    expect(await mutate('settings', 'update', '', 1, { value: 'new@example.com' })).toMatchObject({ key: 'booking_recipient_email', version: 2 })
    const id = (await db.query<{ id: string }>("insert into workshop_subscribers(email) values ('person@example.com') returning id")).rows[0].id
    await expect(mutate('workshop-subscribers', 'delete', id, 2)).rejects.toThrow('conflict')
    expect(await mutate('workshop-subscribers', 'delete', id, 1)).toMatchObject({ id, email: 'person@example.com' })
    expect((await db.query('select id from workshop_subscribers where id=$1', [id])).rows).toEqual([])
  })

  it('checks revocation and current owner membership again inside the transaction', async () => {
    const item = await photo(500)
    await db.query('update api_tokens set revoked_at=now() where id=$1', [token])
    await expect(mutate('media', 'update', item.id, 1, { title: 'Denied' })).rejects.toThrow('unauthorized')
    await db.query('update api_tokens set revoked_at=null where id=$1', [token])
    await db.exec("delete from admin_emails where email='admin@example.com'")
    await expect(mutate('media', 'delete', item.id, 1)).rejects.toThrow('unauthorized')
    await db.exec("insert into admin_emails(email) values ('admin@example.com')")
    expect((await db.query('select version from photos where id=$1', [item.id])).rows).toEqual([{ version: 1 }])
  })

  it('creates upload sessions with an atomic success receipt and rechecks access', async () => {
    const id = randomUUID()
    const input = uploadInput(id)
    const log = await audit('uploads','begin-upload')
    expect(await mutate('uploads','begin-upload',id,null,input,log)).toMatchObject({ id, token_id: token, metadata: input.metadata, completed_at: null })
    expect((await db.query('select status,resource_id from api_audit_log where id=$1', [log])).rows)
      .toEqual([{ status: 'succeeded', resource_id: id }])
    const deniedId = randomUUID()
    await db.query('update api_tokens set revoked_at=now() where id=$1', [token])
    try {
      await expect(mutate('uploads','begin-upload',deniedId,null,uploadInput(deniedId))).rejects.toThrow('unauthorized')
      expect((await db.query('select id from api_uploads where id=$1', [deniedId])).rows).toEqual([])
    } finally { await db.query('update api_tokens set revoked_at=null where id=$1', [token]) }
    await db.exec("delete from admin_emails where email='admin@example.com'")
    try {
      await expect(mutate('uploads','begin-upload',deniedId,null,uploadInput(deniedId))).rejects.toThrow('unauthorized')
    } finally { await db.exec("insert into admin_emails(email) values ('admin@example.com')") }
  })

  it('rejects invalid upload sessions before persisting or completing the audit', async () => {
    const id = randomUUID()
    const valid = uploadInput(id)
    const invalid = [
      { ...valid, unrecognized: true },
      { ...valid, metadata: { ...valid.metadata, unrecognized: true } },
      { ...valid, metadata: { ...valid.metadata, size: 10485761 } },
      { ...valid, metadata: { ...valid.metadata, width: -1 } },
      { ...valid, metadata: { ...valid.metadata, width: '640' } },
      { ...valid, metadata: { ...valid.metadata, filename: '../source.jpg' } },
      { ...valid, metadata: { ...valid.metadata, filename: 'path\\source.jpg' } },
      { ...valid, metadata: { ...valid.metadata, kind: 'video' } },
      { ...valid, metadata: { ...valid.metadata, duration_seconds: 4 } },
      { ...valid, expires_at: 'not a date' },
      { ...valid, expires_at: '2020-01-01T00:00:00Z' },
      { ...valid, kind: 'video', bucket: 'videos', poster_path: 'poster.jpg', metadata: { ...valid.metadata, kind: 'video', content_type: 'video/mp4' } },
    ]
    for (const input of invalid) {
      const log = await audit('uploads','begin-upload')
      await expect(mutate('uploads','begin-upload',id,null,input,log)).rejects.toThrow('invalid_request')
      expect((await db.query('select status from api_audit_log where id=$1', [log])).rows).toEqual([{ status: 'started' }])
    }
    expect((await db.query('select id from api_uploads where id=$1', [id])).rows).toEqual([])
    const videoId = randomUUID()
    const video = { ...uploadInput(videoId), kind: 'video', bucket: 'videos', poster_path: `videos/api/${videoId}/poster.jpg`,
      metadata: { ...valid.metadata, kind: 'video', content_type: 'video/mp4', duration_seconds: 5 } }
    expect(await mutate('uploads','begin-upload',videoId,null,video)).toMatchObject({ id: videoId, kind: 'video' })
  })

  it('finalizes an upload once, replays the result, and queues storage deletion atomically', async () => {
    const id = randomUUID()
    const path = `api/${id}/source.mp4`
    const poster = `api/${id}/poster.jpg`
    await db.query(`insert into api_uploads(id,token_id,purpose,kind,bucket,storage_path,poster_path,metadata,expires_at)
      values ($1,$2,'media','video','videos',$3,$4,$5,now()+interval '1 hour')`,
      [id, token, path, poster, JSON.stringify({ width: 640, height: 480, duration_seconds: 2.5, filename: 'source.mp4' })])
    await expect(mutate('uploads','complete-upload',id)).rejects.toThrow('invalid_request')
    await db.query("insert into storage.objects(bucket_id,name) values ('videos',$1),('videos',$2)", [path, poster])
    const result = await mutate('uploads', 'complete-upload', id)
    expect(result).toMatchObject({ storage_path: path, poster_path: poster, pages: [], kind: 'video', duration_seconds: 2.5, alt_text: 'source', version: 1 })
    expect(await mutate('uploads', 'complete-upload', id)).toEqual(result)
    expect((await db.query('select id from photos where storage_path=$1', [path])).rows).toHaveLength(1)
    await expect(db.query("update api_uploads set storage_path='replaced' where id=$1", [id])).rejects.toThrow('invalid_request')
    await expect(mutate('media', 'delete', String(result.id), 99)).rejects.toThrow('conflict')
    expect((await db.query('select id from api_storage_cleanup where $1=any(paths)', [path])).rows).toEqual([])
    const log = await audit('media','delete')
    await mutate('media', 'delete', String(result.id), 1, {}, log)
    expect((await db.query('select bucket,paths from api_storage_cleanup where $1=any(paths)', [path])).rows)
      .toEqual([{ bucket: 'videos', paths: [path, poster] }])
    expect((await db.query('select id from photos where storage_path=$1', [path])).rows).toEqual([])
    expect((await db.query('select status from api_audit_log where id=$1', [log])).rows).toEqual([{ status: 'succeeded' }])
  })

  it('returns page asset paths without publishing media and rejects expired/foreign sessions', async () => {
    const id = randomUUID()
    const path = `workshop/api/${id}/hero.jpg`
    await db.query(`insert into api_uploads(id,token_id,purpose,kind,bucket,storage_path,metadata,expires_at)
      values ($1,$2,'workshop','photo','photos',$3,$4,now()+interval '1 hour')`,
      [id, token, path, JSON.stringify({ width: 640, height: 480, filename: 'hero.jpg' })])
    await expect(db.query("update api_uploads set metadata='{}' where id=$1", [id])).rejects.toThrow('invalid_request')
    await db.query("insert into storage.objects(bucket_id,name) values ('photos',$1)", [path])
    const otherToken = randomUUID()
    await db.query(`insert into api_tokens(id,owner_id,name,prefix,token_hash) values ($1,$2,'Other','mcp_other',repeat('b',64))`, [otherToken, owner])
    await expect(mutate('uploads','complete-upload',id,null,{},undefined,otherToken)).rejects.toThrow('not_found')
    expect(await mutate('uploads','complete-upload',id)).toEqual({ storage_path: path, bucket: 'photos' })
    expect((await db.query('select id from photos where storage_path=$1', [path])).rows).toEqual([])
    const expired = randomUUID()
    await db.query(`insert into api_uploads(id,token_id,purpose,kind,bucket,storage_path,metadata,expires_at)
      values ($1,$2,'gift','photo','photos',$3,'{}',now()-interval '1 second')`,
      [expired, token, `gift/api/${expired}/old.jpg`])
    await expect(mutate('uploads','complete-upload',expired)).rejects.toThrow('invalid_request')
    expect((await db.query('select completed_at,result from api_uploads where id=$1', [expired])).rows)
      .toEqual([{ completed_at: null, result: null }])
  })

  it('rolls back content writes when transactional success journaling fails', async () => {
    const item = await photo(600)
    const log = await audit('media','update')
    const uploadId = randomUUID()
    const uploadLog = await audit('uploads','begin-upload')
    await db.exec(`create function public.fail_test_audit() returns trigger language plpgsql as $$
      begin if new.status='succeeded' then raise exception 'simulated journal failure'; end if; return new; end $$;
      create trigger fail_test_audit before update on api_audit_log for each row execute function public.fail_test_audit();`)
    try {
      await expect(mutate('media','update',item.id,1,{ title: 'Must roll back' },log)).rejects.toThrow('simulated journal failure')
      expect((await db.query('select title,version from photos where id=$1', [item.id])).rows).toEqual([{ title: null, version: 1 }])
      expect((await db.query('select status from api_audit_log where id=$1', [log])).rows).toEqual([{ status: 'started' }])
      await expect(mutate('uploads','begin-upload',uploadId,null,uploadInput(uploadId),uploadLog)).rejects.toThrow('simulated journal failure')
      expect((await db.query('select id from api_uploads where id=$1', [uploadId])).rows).toEqual([])
      expect((await db.query('select status from api_audit_log where id=$1', [uploadLog])).rows).toEqual([{ status: 'started' }])
    } finally {
      await db.exec('drop trigger fail_test_audit on api_audit_log; drop function public.fail_test_audit()')
    }
  })
})
