// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'
const state = vi.hoisted(() => ({ getClaims: vi.fn(), rpc: vi.fn(), signOut: vi.fn() }))
vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    auth: { getClaims: state.getClaims, signOut: state.signOut },
    rpc: state.rpc,
  }),
}))
import { updateSession } from './middleware'
describe('admin middleware', () => {
  it('allows public pages and redirects unauthenticated admins', async () => {
    state.getClaims.mockResolvedValue({ data: { claims: null } })
    expect((await updateSession(new NextRequest('http://localhost/book'))).status).toBe(200)
    expect(
      (await updateSession(new NextRequest('http://localhost/admin'))).headers.get('location'),
    ).toContain('/auth/login')
  })
  it('allows administrators and rejects signed-in nonadmins', async () => {
    state.getClaims.mockResolvedValue({ data: { claims: { sub: 'user' } } })
    state.rpc.mockResolvedValue({ data: true })
    expect((await updateSession(new NextRequest('http://localhost/admin'))).status).toBe(200)
    state.rpc.mockResolvedValue({ data: false })
    expect(
      (await updateSession(new NextRequest('http://localhost/admin'))).headers.get('location'),
    ).toContain('/auth/error')
    expect(state.signOut).toHaveBeenCalled()
  })
})
