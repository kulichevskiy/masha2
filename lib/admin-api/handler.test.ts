// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AdminDb } from './auth'
import { handleApi } from './handler'
import { ApiError } from './errors'

const mocks = vi.hoisted(() => ({ authenticate: vi.fn(), invalidate: vi.fn() }))
vi.mock('./auth', () => ({ authenticate: mocks.authenticate }))
vi.mock('next/cache', () => ({ revalidatePath: mocks.invalidate }))
const id = '00000000-0000-4000-8000-000000000003'
function fixture(options: { rows?: unknown[]; rpcData?: unknown; rpcError?: { message: string }; upload?: unknown; files?: unknown[] } = {}) {
  const calls: unknown[][] = []
  const rpc = vi.fn(async (...args: unknown[]) => { calls.push(['rpc', ...args]); return { data: options.rpcData ?? { id, version: 2 }, error: options.rpcError ?? null } })
  const storage = { from: vi.fn(() => ({
    list: vi.fn(async () => ({ data: options.files ?? [], error: null })),
    remove: vi.fn(async () => ({ data: [], error: null })),
    createSignedUploadUrl: vi.fn(async (path: string) => { calls.push(['signed', path]); return { data: { signedUrl: `https://storage.test/${path}?token=storage-secret` }, error: null } }),
  })) }
  const db = { rpc, storage, from: (table: string) => {
    let mode = 'select'
    const resolved = (single: boolean) => ({ error: null, data: table === 'api_audit_log' ? single ? { id: 'audit' } : [] : table === 'api_storage_cleanup' ? [] : table === 'api_uploads' ? options.upload : single ? options.rows?.[0] ?? null : options.rows ?? [] })
    const chain = {
      select: (...args: unknown[]) => { calls.push([table, 'select', ...args]); return chain },
      insert: (data: unknown) => { mode = 'insert'; calls.push([table, mode, data]); return chain },
      update: (data: unknown) => { mode = 'update'; calls.push([table, mode, data]); return chain },
      delete: () => { mode = 'delete'; return chain },
      eq: (...args: unknown[]) => { calls.push([table, 'eq', ...args]); return chain },
      contains: (...args: unknown[]) => { calls.push([table, 'contains', ...args]); return chain },
      order: (...args: unknown[]) => { calls.push([table, 'order', ...args]); return chain },
      limit: (...args: unknown[]) => { calls.push([table, 'limit', ...args]); return chain },
      range: (...args: unknown[]) => { calls.push([table, 'range', ...args]); return chain },
      maybeSingle: async () => resolved(true), single: async () => resolved(true),
      then: (resolve: (v: unknown) => unknown) => Promise.resolve(resolved(false)).then(resolve),
    }
    return chain
  } }
  return { db: db as unknown as AdminDb, rpc, calls, storage }
}
function request(path: string, method = 'GET', value?: unknown, etag?: string) {
  return new Request(`https://site.test/api/v1/${path}`, { method, headers: { Authorization: 'Bearer test', ...(value === undefined ? {} : { 'Content-Type': 'application/json' }), ...(etag ? { 'If-Match': etag } : {}) }, body: value === undefined ? undefined : JSON.stringify(value) })
}
beforeEach(() => { vi.clearAllMocks(); mocks.authenticate.mockResolvedValue({ id: 'token', name: 'Script', owner_id: 'owner' }) })

describe('HTTP administrative contract', () => {
  it('returns JSON 401 before data access when authentication fails', async () => {
    mocks.authenticate.mockRejectedValue(new ApiError(401, 'unauthorized', 'Invalid token'))
    const f = fixture()
    const res = await handleApi(request('media'), ['media'], f.db)
    expect(res.status).toBe(401)
    expect(res.headers.get('WWW-Authenticate')).toBe('Bearer')
    expect(f.calls).toEqual([])
  })
  it('reads hidden content and emits no-store and ETag', async () => {
    const f = fixture({ rows: [{ id, version: 7, pages: [] }] })
    const res = await handleApi(request(`media/${id}`), ['media', id], f.db)
    expect(res.status).toBe(200); expect(res.headers.get('ETag')).toBe('"7"')
    expect(res.headers.get('Cache-Control')).toBe('private, no-store')
    expect(await res.json()).toMatchObject({ data: { pages: [] } })
  })
  it('paginates beyond the old UI cap and selects no customer device metadata', async () => {
    const f = fixture({ rows: Array.from({ length: 101 }, (_, i) => ({ id: i })) })
    const res = await handleApi(request('workshop-subscribers?limit=100&offset=200&season=spring'), ['workshop-subscribers'], f.db)
    const payload = await res.json()
    expect(payload.data).toHaveLength(100); expect(payload.pagination.next_offset).toBe(300)
    expect(f.calls).toContainEqual(['workshop_subscribers', 'range', 200, 300])
    expect(f.calls).toContainEqual(['workshop_subscribers', 'contains', 'seasons', ['spring']])
    const selection = f.calls.find(c => c[1] === 'select')?.[2] as string
    expect(selection).not.toMatch(/ip_hash|user_agent/)
  })
  it('rejects explicitly empty filters instead of returning an unfiltered list', async () => {
    for (const path of ['workshop-subscribers?season=', 'workshop-subscribers?city=', 'media?kind=', 'media?page=']) {
      const f = fixture()
      const res = await handleApi(request(path), [path.split('?')[0]], f.db)
      expect(res.status).toBe(400)
      expect(await res.json()).toMatchObject({ error: { code: 'invalid_request' } })
      expect(f.calls.some(call => call[1] === 'range')).toBe(false)
    }
  })

  it('rejects missing versions and records stable failure codes before any mutation', async () => {
    const f = fixture()
    const res = await handleApi(request(`media/${id}`, 'PATCH', { title: 'Customer secret' }), ['media', id], f.db)
    expect(res.status).toBe(428); expect(f.rpc).not.toHaveBeenCalled()
    expect(f.calls).toContainEqual(['api_audit_log', 'update', expect.objectContaining({ status: 'failed', error_code: 'precondition_required' })])
    expect(JSON.stringify(f.calls)).not.toContain('Customer secret')
  })
  it('passes expected versions to atomic mutations and rejects conflicts without retrying', async () => {
    const f = fixture({ rpcError: { message: 'conflict' } })
    const res = await handleApi(request('workshop', 'PATCH', { sales_open: false }, '"3"'), ['workshop'], f.db)
    expect(res.status).toBe(409)
    expect(f.rpc).toHaveBeenCalledExactlyOnceWith('admin_api_mutate', expect.objectContaining({ p_expected_version: 3, p_resource: 'workshop', p_data: { sales_open: false } }))
  })
  it('sanitizes nested content, changes only supplied fields, and invalidates public pages', async () => {
    const f = fixture()
    const res = await handleApi(request(`faq/${id}`, 'PATCH', { answer: '<p>ok<script>bad()</script></p>' }, '"1"'), ['faq', id], f.db)
    expect(res.status).toBe(200)
    expect(f.rpc).toHaveBeenCalledWith('admin_api_mutate', expect.objectContaining({ p_data: { answer: '<p>ok</p>' } }))
    expect(mocks.invalidate).toHaveBeenCalledWith('/book')
    expect(mocks.invalidate).toHaveBeenCalledWith('/admin')
  })
  it('rejects unknown fields, duplicate reorder IDs and unsupported customer writes', async () => {
    for (const [path, method, body] of [[`media/${id}`, 'PATCH', { storage_path: 'bad' }], ['media/reorder', 'POST', { items: [{ id, version: 1 }, { id, version: 1 }] }], ['workshop-subscribers', 'POST', { email: 'x@example.com' }]] as const) {
      const f = fixture()
      const res = await handleApi(request(path, method, body, '"1"'), path.split('/'), f.db)
      expect([400, 405]).toContain(res.status); expect(f.rpc).not.toHaveBeenCalled()
    }
  })
  it('has no PAT management route and does not journal arbitrary path content', async () => {
    const f = fixture()
    const res = await handleApi(request('tokens/private-value', 'POST', {}), ['tokens', 'private-value'], f.db)
    expect(res.status).toBe(404)
    expect(f.calls).toContainEqual(['api_audit_log', 'insert', expect.objectContaining({ resource: 'unknown', resource_id: null })])
    expect(JSON.stringify(f.calls)).not.toContain('private-value')
  })
  it('signs destinations before atomic session creation and exposes none if access is revoked', async () => {
    const input = { purpose: 'media', kind: 'photo', filename: 'photo.jpg', content_type: 'image/jpeg', size: 123, width: 320, height: 240 }
    const success = fixture()
    const res = await handleApi(request('uploads', 'POST', input), ['uploads'], success.db)
    expect(res.status).toBe(201)
    expect(success.calls.findIndex(c => c[0] === 'signed')).toBeLessThan(success.calls.findIndex(c => c[0] === 'rpc'))
    expect(success.rpc).toHaveBeenCalledWith('admin_api_mutate', expect.objectContaining({ p_action: 'begin-upload', p_data: expect.objectContaining({ metadata: input, bucket: 'photos' }) }))
    expect(await res.json()).toMatchObject({ data: { source: { method: 'PUT' }, poster: null } })
    const revoked = fixture({ rpcError: { message: 'unauthorized' } })
    const denied = await handleApi(request('uploads', 'POST', input), ['uploads'], revoked.db)
    expect(denied.status).toBe(401)
    expect(await denied.text()).not.toContain('storage-secret')
  })

  it('refuses incomplete uploads before finalizing and replays completed sessions', async () => {
    const upload = { id, bucket: 'videos', storage_path: 'videos/session/source.mp4', poster_path: 'videos/session/poster.jpg', metadata: { content_type: 'video/mp4', size: 123 }, expires_at: '2099-01-01', completed_at: null }
    const missing = fixture({ upload })
    const res = await handleApi(request(`uploads/${id}/complete`, 'POST'), ['uploads', id, 'complete'], missing.db)
    expect(res.status).toBe(409); expect(missing.rpc).not.toHaveBeenCalled()
    const replay = fixture({ upload: { ...upload, completed_at: '2026-09-01' } })
    expect((await handleApi(request(`uploads/${id}/complete`, 'POST'), ['uploads', id, 'complete'], replay.db)).status).toBe(200)
    expect(replay.storage.from).not.toHaveBeenCalled()
    expect(replay.rpc).toHaveBeenCalledWith('admin_api_mutate', expect.objectContaining({ p_action: 'complete-upload' }))
  })
})
