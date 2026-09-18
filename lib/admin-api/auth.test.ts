// @vitest-environment node
import { createHash } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import { authenticate, type AdminDb } from './auth'

const secret = `mcp_${'a'.repeat(64)}`
function dbFixture(options: { revoked?: boolean; member?: boolean; user?: boolean; dbError?: boolean } = {}) {
  const calls: unknown[][] = []
  const db = {
    auth: { admin: { getUserById: vi.fn(async () => ({ data: { user: options.user === false ? null : { id: 'owner', email: 'admin@example.com' } }, error: null })) } },
    from: vi.fn((table: string) => {
      const builder = {
        select: (...args: unknown[]) => { calls.push([table, 'select', ...args]); return builder },
        update: (...args: unknown[]) => { calls.push([table, 'update', ...args]); return builder },
        eq: (...args: unknown[]) => { calls.push([table, 'eq', ...args]); return builder },
        is: () => builder,
        maybeSingle: async () => ({ data: table === 'api_tokens' ? { id: 'token', owner_id: 'owner', name: 'Script', revoked_at: options.revoked ? '2026-01-01' : null } : options.member === false ? null : { email: 'admin@example.com' }, error: options.dbError ? { message: 'private DB details' } : null }),
        then: (resolve: (value: unknown) => unknown) => Promise.resolve({ error: null }).then(resolve),
      }
      return builder
    }),
  }
  return { db: db as unknown as AdminDb, calls, from: db.from }
}

describe('PAT authentication', () => {
  it('requires Bearer PAT even when a browser cookie is present', async () => {
    for (const headers of [{ Cookie: 'session=valid' }, { Authorization: 'Bearer arbitrary' }, { Authorization: `Basic ${secret}` }] as Record<string, string>[]) {
      const f = dbFixture()
      await expect(authenticate(new Request('https://site.test', { headers }), f.db)).rejects.toMatchObject({ status: 401 })
      expect(f.from).not.toHaveBeenCalled()
    }
  })
  it('looks up only a hash, rechecks owner membership and records last use', async () => {
    const f = dbFixture()
    expect(await authenticate(new Request('https://site.test', { headers: { Authorization: `Bearer ${secret}` } }), f.db)).toMatchObject({ id: 'token' })
    expect(f.calls).toContainEqual(['api_tokens', 'eq', 'token_hash', createHash('sha256').update(secret).digest('hex')])
    expect(f.calls).toContainEqual(['admin_emails', 'eq', 'email', 'admin@example.com'])
    expect(JSON.stringify(f.calls)).not.toContain(secret)
  })
  it('rejects revoked tokens, removed admins and deleted users', async () => {
    for (const options of [{ revoked: true }, { member: false }, { user: false }]) {
      const f = dbFixture(options)
      await expect(authenticate(new Request('https://site.test', { headers: { Authorization: `Bearer ${secret}` } }), f.db)).rejects.toMatchObject({ status: 401 })
    }
  })
  it('fails closed without leaking database messages', async () => {
    const f = dbFixture({ dbError: true })
    await expect(authenticate(new Request('https://site.test', { headers: { Authorization: `Bearer ${secret}` } }), f.db)).rejects.toMatchObject({ status: 500, message: 'The operation could not be completed' })
  })
})
