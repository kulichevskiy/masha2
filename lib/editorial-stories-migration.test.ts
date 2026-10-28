// @vitest-environment node
/**
 * Contract of supabase/migrations/20261028210000_editorial_stories.sql against
 * a minimal current schema: both tables and their constraints, the cascade and
 * set-null behaviour towards photos, the version bump, and the per-role RLS
 * policies. The Supabase platform pieces the migration leans on
 * (public.is_admin, handle_updated_at, admin_api_bump_version, the anon and
 * authenticated roles) are stubbed the way lib/admin-api/database.test.ts does.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const migration = readFileSync(
  join(process.cwd(), 'supabase/migrations/20261028210000_editorial_stories.sql'),
  'utf8'
)

let db: PGlite

async function insertPhoto(id: string) {
  await db.query('insert into public.photos (id, storage_path) values ($1, $2)', [id, `test/${id}.jpg`])
}

async function insertStory(id: string, slug: string, extra = '') {
  await db.query(
    `insert into public.editorial_stories (id, slug, title ${extra ? ', ' + extra.split('=')[0] : ''})
     values ($1, $2, 'Title' ${extra ? ', ' + extra.split('=')[1] : ''})`,
    [id, slug]
  )
}

const P1 = '00000000-0000-4000-8000-000000000101'
const P2 = '00000000-0000-4000-8000-000000000102'
const S1 = '00000000-0000-4000-8000-000000000201'
const S2 = '00000000-0000-4000-8000-000000000202'

beforeAll(async () => {
  db = new PGlite()
  await db.exec(`
    create role anon;
    create role authenticated;
    grant usage on schema public to anon, authenticated;
    alter default privileges in schema public grant select, insert, update, delete on tables to anon, authenticated;
    create table public.photos (
      id uuid primary key default gen_random_uuid(),
      storage_path text unique not null,
      pages text[] not null default '{}'
    );
    create function public.is_admin() returns boolean language sql as $$ select true $$;
    create function public.handle_updated_at() returns trigger language plpgsql as $$
      begin new.updated_at = now(); return new; end $$;
    create function public.admin_api_bump_version() returns trigger language plpgsql as $$
      begin new.version := old.version + 1; return new; end $$;
  `)
  await db.exec(migration)
}, 30_000)

afterAll(async () => {
  await db?.close()
})

describe('editorial stories migration', () => {
  it('creates both tables with row level security enabled', async () => {
    for (const table of ['editorial_stories', 'editorial_story_photos']) {
      const result = await db.query<{ enabled: boolean }>(
        'select relrowsecurity as enabled from pg_class where oid = $1::regclass',
        [`public.${table}`]
      )
      expect(result.rows[0].enabled).toBe(true)
    }
  })

  it('defines public read of visible rows and admin writes per role and operation', async () => {
    const result = await db.query<{ tablename: string; policyname: string; roles: string[]; cmd: string }>(
      `select tablename, policyname, roles::text[] as roles, cmd from pg_policies
       where schemaname = 'public' and tablename in ('editorial_stories', 'editorial_story_photos')
       order by tablename, policyname`
    )
    const rows = result.rows.map((r) => `${r.tablename}|${r.cmd}|${r.roles.join(',')}|${r.policyname}`)
    expect(rows).toEqual([
      'editorial_stories|DELETE|authenticated|Admins can delete stories',
      'editorial_stories|INSERT|authenticated|Admins can insert stories',
      'editorial_stories|UPDATE|authenticated|Admins can update stories',
      'editorial_stories|SELECT|authenticated|Admins can view all stories',
      'editorial_stories|SELECT|anon|Anon can view visible stories',
      'editorial_stories|SELECT|authenticated|Authenticated can view visible stories',
      'editorial_story_photos|DELETE|authenticated|Admins can delete story photos',
      'editorial_story_photos|INSERT|authenticated|Admins can insert story photos',
      'editorial_story_photos|UPDATE|authenticated|Admins can update story photos',
      'editorial_story_photos|SELECT|authenticated|Admins can view all story photos',
      'editorial_story_photos|SELECT|anon|Anon can view photos of visible stories',
      'editorial_story_photos|SELECT|authenticated|Authenticated can view photos of visible stories',
    ])
  })

  it('stores a story with defaults: hidden, empty subtitle and credits, version 1', async () => {
    await insertStory(S1, 'soft-structure')
    const result = await db.query<{ visible: boolean; subtitle: string; credits: unknown; version: number; position: number }>(
      'select visible, subtitle, credits, version, position from public.editorial_stories where id = $1',
      [S1]
    )
    expect(result.rows[0]).toEqual({ visible: false, subtitle: '', credits: [], version: 1, position: 0 })
  })

  it('rejects malformed slugs, duplicate slugs, blank titles and non-array credits', async () => {
    await expect(insertStory(S2, 'Soft Structure')).rejects.toThrow()
    await expect(insertStory(S2, 'soft--structure')).rejects.toThrow()
    await expect(insertStory(S2, 'soft-structure')).rejects.toThrow()
    await expect(
      db.query("insert into public.editorial_stories (slug, title) values ('blank', '   ')")
    ).rejects.toThrow()
    await expect(
      db.query(`insert into public.editorial_stories (slug, title, credits) values ('obj', 'T', '{"role":"x"}'::jsonb)`)
    ).rejects.toThrow()
  })

  it('bumps version and updated_at on every update', async () => {
    const before = await db.query<{ updated_at: string }>('select updated_at from public.editorial_stories where id = $1', [S1])
    await new Promise((resolve) => setTimeout(resolve, 5))
    await db.query('update public.editorial_stories set subtitle = $1 where id = $2', ['A line', S1])
    const after = await db.query<{ version: number; updated_at: string }>(
      'select version, updated_at from public.editorial_stories where id = $1',
      [S1]
    )
    expect(after.rows[0].version).toBe(2)
    expect(new Date(after.rows[0].updated_at).getTime()).toBeGreaterThan(new Date(before.rows[0].updated_at).getTime())
  })

  it('orders story photos by (story, position) and forbids the same photo twice in a story', async () => {
    await insertPhoto(P1)
    await insertPhoto(P2)
    await db.query('insert into public.editorial_story_photos (story_id, photo_id, position) values ($1, $2, 1), ($1, $3, 0)', [S1, P1, P2])
    await expect(
      db.query('insert into public.editorial_story_photos (story_id, photo_id, position) values ($1, $2, 5)', [S1, P1])
    ).rejects.toThrow()
    const result = await db.query<{ photo_id: string }>(
      'select photo_id from public.editorial_story_photos where story_id = $1 order by position, photo_id',
      [S1]
    )
    expect(result.rows.map((r) => r.photo_id)).toEqual([P2, P1])
  })

  it('lets anon read only visible stories and the join rows of visible stories', async () => {
    await db.query(`insert into public.editorial_stories (id, slug, title, visible) values ($1, 'hidden-story', 'Hidden', false)`, [S2])
    await db.query('insert into public.editorial_story_photos (story_id, photo_id, position) values ($1, $2, 0)', [S2, P2])
    await db.exec('set role anon')
    try {
      const stories = await db.query<{ slug: string }>('select slug from public.editorial_stories order by slug')
      expect(stories.rows).toEqual([])
      const joins = await db.query<{ story_id: string }>('select story_id from public.editorial_story_photos')
      expect(joins.rows).toEqual([])
      await expect(db.query(`insert into public.editorial_stories (slug, title) values ('anon', 'Anon')`)).rejects.toThrow()
    } finally {
      await db.exec('reset role')
    }

    await db.query('update public.editorial_stories set visible = true where id = $1', [S1])
    await db.exec('set role anon')
    try {
      const stories = await db.query<{ slug: string }>('select slug from public.editorial_stories order by slug')
      expect(stories.rows.map((r) => r.slug)).toEqual(['soft-structure'])
      const joins = await db.query<{ story_id: string; photo_id: string }>('select story_id, photo_id from public.editorial_story_photos order by position')
      expect(joins.rows).toEqual([{ story_id: S1, photo_id: P2 }, { story_id: S1, photo_id: P1 }])
    } finally {
      await db.exec('reset role')
    }
    await db.query('delete from public.editorial_stories where id = $1', [S2])
  })

  it('clears the cover and drops join rows when a photo is deleted; deleting a story keeps photos', async () => {
    await db.query('update public.editorial_stories set cover_photo_id = $1 where id = $2', [P2, S1])
    await db.query('delete from public.photos where id = $1', [P2])
    const story = await db.query<{ cover_photo_id: string | null }>('select cover_photo_id from public.editorial_stories where id = $1', [S1])
    expect(story.rows[0].cover_photo_id).toBeNull()
    const joins = await db.query<{ photo_id: string }>('select photo_id from public.editorial_story_photos where story_id = $1', [S1])
    expect(joins.rows.map((r) => r.photo_id)).toEqual([P1])

    await db.query('delete from public.editorial_stories where id = $1', [S1])
    const photos = await db.query<{ id: string }>('select id from public.photos')
    expect(photos.rows.map((r) => r.id)).toEqual([P1])
    const orphans = await db.query<{ n: number }>('select count(*)::int as n from public.editorial_story_photos')
    expect(orphans.rows[0].n).toBe(0)
  })
})
