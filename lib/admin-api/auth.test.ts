// @vitest-environment node
import { createHash } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import { authenticate, type AdminDb } from './auth'

const secret = `mcp_${'a'.repeat(64)}`
function dbFixture(options: { rejected?: boolean; dbError?: boolean } = {}) {
  const rpc = vi.fn(async () => ({
    data: options.rejected ? null : { id: 'token', owner_id: 'owner', name: 'Script' },
    error: options.dbError ? { message: 'private DB details' } : null,
  }))
  return { db: { rpc } as unknown as AdminDb, rpc }
}

describe('PAT authentication', () => {
  it('requires Bearer PAT even when a browser cookie is present', async () => {
    for (const headers of [{ Cookie: 'session=valid' }, { Authorization: 'Bearer arbitrary' }, { Authorization: `Basic ${secret}` }] as Record<string, string>[]) {
      const f = dbFixture()
      await expect(authenticate(new Request('https://site.test', { headers }), f.db)).rejects.toMatchObject({ status: 401 })
      expect(f.rpc).not.toHaveBeenCalled()
    }
  })
  it('passes only the hash to atomic authentication and returns the accepted principal', async () => {
    const f = dbFixture()
    expect(await authenticate(new Request('https://site.test', { headers: { Authorization: `Bearer ${secret}` } }), f.db)).toEqual({ id: 'token', owner_id: 'owner', name: 'Script' })
    expect(f.rpc).toHaveBeenCalledExactlyOnceWith('admin_api_authenticate', { p_token_hash: createHash('sha256').update(secret).digest('hex') })
    expect(JSON.stringify(f.rpc.mock.calls)).not.toContain(secret)
  })
  it('rejects a token whose owner, membership or active state fails final acceptance', async () => {
    const f = dbFixture({ rejected: true })
    await expect(authenticate(new Request('https://site.test', { headers: { Authorization: `Bearer ${secret}` } }), f.db)).rejects.toMatchObject({ status: 401, code: 'unauthorized' })
  })
  it('fails closed without leaking database messages', async () => {
    const f = dbFixture({ dbError: true })
    await expect(authenticate(new Request('https://site.test', { headers: { Authorization: `Bearer ${secret}` } }), f.db)).rejects.toMatchObject({ status: 500, message: 'The operation could not be completed' })
  })
})
