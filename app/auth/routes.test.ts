// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'
const auth = vi.hoisted(() => ({ exchangeCodeForSession: vi.fn(), verifyOtp: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ auth }) }))
vi.mock('next/navigation', () => ({
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`)
  },
}))
import { GET as callback } from './callback/route'
import { GET as confirm } from './confirm/route'
describe('auth callbacks', () => {
  it('exchanges OAuth codes and defaults to admin', async () => {
    auth.exchangeCodeForSession.mockResolvedValue({ error: null })
    expect(
      (await callback(new NextRequest('http://localhost/auth/callback?code=test'))).headers.get(
        'location',
      ),
    ).toBe('http://localhost/admin')
    expect(
      (
        await callback(new NextRequest('http://localhost/auth/callback?code=test&next=/book'))
      ).headers.get('location'),
    ).toBe('http://localhost/book')
  })
  it('reports missing and rejected OAuth codes', async () => {
    expect(
      (await callback(new NextRequest('http://localhost/auth/callback'))).headers.get('location'),
    ).toContain('/auth/error')
    auth.exchangeCodeForSession.mockResolvedValue({ error: { message: 'Expired' } })
    expect(
      (await callback(new NextRequest('http://localhost/auth/callback?code=test'))).headers.get(
        'location',
      ),
    ).toContain('Expired')
  })
  it('confirms OTP and rejects missing or expired credentials', async () => {
    auth.verifyOtp.mockResolvedValue({ error: null })
    await expect(
      confirm(new NextRequest('http://localhost/auth/confirm?token_hash=x&type=email&next=/admin')),
    ).rejects.toThrow('redirect:/admin')
    await expect(confirm(new NextRequest('http://localhost/auth/confirm'))).rejects.toThrow(
      'No token hash',
    )
    auth.verifyOtp.mockResolvedValue({ error: { message: 'Expired' } })
    await expect(
      confirm(new NextRequest('http://localhost/auth/confirm?token_hash=x&type=email')),
    ).rejects.toThrow('Expired')
  })
})
