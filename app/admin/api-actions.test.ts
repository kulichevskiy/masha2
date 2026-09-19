import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createHash } from 'node:crypto'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(), isAdmin: vi.fn(), admin: vi.fn(), from: vi.fn(), select: vi.fn(), insert: vi.fn(), update: vi.fn(), eq: vi.fn(), is: vi.fn(), range: vi.fn(), single: vi.fn(), maybeSingle: vi.fn(), order: vi.fn(),
}))
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ auth: { getUser: mocks.getUser }, rpc: mocks.isAdmin }) }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: mocks.admin }))
import { createApiToken, getApiAdminData, revokeApiToken } from './api-actions'

const ID = '11111111-1111-4111-8111-111111111111'
const token = { id: ID, name: 'Script', prefix: 'mcp_12345678', created_at: '2026-09-18T00:00:00Z', last_used_at: null, revoked_at: null }
let rows: unknown[]
beforeEach(() => {
  vi.resetAllMocks()
  rows = []
  mocks.getUser.mockResolvedValue({ data: { user: { id: 'admin-user' } }, error: null })
  mocks.isAdmin.mockResolvedValue({ data: true, error: null })
  mocks.admin.mockReturnValue({ from: mocks.from })
  const query = { select: mocks.select, insert: mocks.insert, update: mocks.update, eq: mocks.eq, is: mocks.is, order: mocks.order, range: mocks.range, single: mocks.single, maybeSingle: mocks.maybeSingle, then: (resolve: (value: unknown) => void) => resolve({ data: rows, error: null }) }
  for (const method of [mocks.from, mocks.select, mocks.insert, mocks.update, mocks.eq, mocks.is, mocks.order]) method.mockReturnValue(query)
  mocks.range.mockImplementation(async () => ({ data: rows, error: null }))
  mocks.single.mockResolvedValue({ data: token, error: null })
  mocks.maybeSingle.mockResolvedValue({ data: { id: ID }, error: null })
})

describe('API token admin boundary', () => {
  it.each(['anonymous', 'non-admin', 'membership-error', 'auth-error'])('refuses %s before constructing the service client for every action', async (mode) => {
    if (mode === 'anonymous') mocks.getUser.mockResolvedValue({ data: { user: null }, error: null })
    if (mode === 'non-admin') mocks.isAdmin.mockResolvedValue({ data: false, error: null })
    if (mode === 'membership-error') mocks.isAdmin.mockResolvedValue({ data: true, error: { message: 'private database detail' } })
    if (mode === 'auth-error') mocks.getUser.mockResolvedValue({ data: { user: { id: 'admin-user' } }, error: { message: 'private auth detail' } })
    for (const result of [await createApiToken('Script'), await revokeApiToken(ID), await getApiAdminData()]) expect(result.error).toBeTruthy()
    expect(mocks.admin).not.toHaveBeenCalled()
  })

  it('stores only a SHA-256 hash of a unique 256-bit secret, with owner and prefix', async () => {
    const result = await createApiToken('  Script  ')
    const second = await createApiToken('Other')
    expect(result.data?.secret).toMatch(/^mcp_[a-f0-9]{64}$/)
    expect(second.data?.secret).not.toBe(result.data?.secret)
    const inserted = mocks.insert.mock.calls[0][0]
    expect(inserted).toEqual({ owner_id: 'admin-user', name: 'Script', prefix: result.data?.secret.slice(0, 12), token_hash: createHash('sha256').update(result.data!.secret).digest('hex') })
    expect(JSON.stringify(inserted)).not.toContain(result.data!.secret)
    expect(result.data?.token).toEqual(token)
  })

  it.each(['', '  ', 'a'.repeat(101), null])('rejects invalid token names', async (name) => {
    const result = await createApiToken(name as string)
    expect(result.error).toBeTruthy()
    expect(mocks.admin).not.toHaveBeenCalled()
  })

  it('lists only safe token fields and a stable, bounded journal page', async () => {
    rows = Array.from({ length: 26 }, (_, i) => ({ id: String(i) }))
    const result = await getApiAdminData(25)
    expect(mocks.select.mock.calls.map(([fields]) => fields)).toEqual([
      'id, name, prefix, created_at, last_used_at, revoked_at',
      'id, token_name, operation, resource, resource_id, status, error_code, created_at',
    ])
    expect(mocks.range).toHaveBeenCalledWith(25, 50)
    expect(mocks.order).toHaveBeenCalledWith('created_at', { ascending: false })
    expect(mocks.order).toHaveBeenCalledWith('id', { ascending: false })
    expect(result.data).toMatchObject({ offset: 25, hasNext: true })
    expect(result.data?.entries).toHaveLength(25)
  })

  it.each([-1, 1.5, Infinity, 1_000_001])('rejects invalid journal offsets', async (offset) => {
    expect((await getApiAdminData(offset)).error).toBeTruthy()
    expect(mocks.admin).not.toHaveBeenCalled()
  })

  it('revokes exactly one active token and preserves its history', async () => {
    const result = await revokeApiToken(ID)
    expect(result.data?.revokedAt).toBeTruthy()
    expect(mocks.update).toHaveBeenCalledWith({ revoked_at: result.data?.revokedAt })
    expect(mocks.eq).toHaveBeenCalledWith('id', ID)
    expect(mocks.is).toHaveBeenCalledWith('revoked_at', null)
  })

  it('rejects malformed ids and reports missing or revoked rows', async () => {
    expect((await revokeApiToken('invalid')).error).toBeTruthy()
    expect(mocks.admin).not.toHaveBeenCalled()
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null })
    expect((await revokeApiToken(ID)).error).toBeTruthy()
  })

  it('does not return secrets or raw database errors on failed create or revoke', async () => {
    const failure = { data: null, error: { message: 'private SQL secret' } }
    mocks.single.mockResolvedValue(failure)
    mocks.maybeSingle.mockResolvedValue(failure)
    for (const result of [await createApiToken('Script'), await revokeApiToken(ID)]) {
      expect(result.data).toBeUndefined()
      expect(result.error).toBeTruthy()
      expect(result.error).not.toContain('private SQL secret')
    }
  })
})
