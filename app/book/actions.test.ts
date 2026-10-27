import { beforeEach, describe, it, expect, vi } from 'vitest'
import { __resetRateLimitForTests } from '@/lib/rate-limit'
const mocks = vi.hoisted(() => ({ recipient: vi.fn(), insert: vi.fn(), send: vi.fn() }))
vi.mock('next/headers', () => ({
  headers: async () => new Headers({ 'x-forwarded-for': '127.0.0.1', 'user-agent': 'test' }),
}))
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle:
            table === 'app_settings'
              ? mocks.recipient
              : async () => ({ data: { name: 'Portrait' }, error: null }),
        }),
      }),
      insert: mocks.insert,
    }),
  }),
}))
vi.mock('resend', () => ({
  Resend: class {
    emails = { send: mocks.send }
  },
}))
import { submitBookingRequest } from './actions'
function form(values: Record<string, string | undefined> = {}) {
  const fd = new FormData()
  for (const [key, value] of Object.entries({
    email: 'client@example.org',
    message: 'Portrait enquiry',
    ...values,
  }))
    fd.set(key, value ?? '')
  return fd
}
beforeEach(() => {
  __resetRateLimitForTests()
  mocks.recipient.mockResolvedValue({ data: { value: 'recipient@example.org' }, error: null })
  mocks.insert.mockResolvedValue({ error: null })
  mocks.send.mockResolvedValue({ error: null })
  vi.stubEnv('RESEND_API_KEY', 'test-key')
})
describe('booking submission', () => {
  it('persists the enquiry and sends its selected tier snapshot', async () => {
    expect(await submitBookingRequest(form({ tier_id: 'tier' }))).toEqual({ ok: true })
    expect(mocks.insert).toHaveBeenLastCalledWith(
      expect.objectContaining({
        email: 'client@example.org',
        tier_id: 'tier',
        message: 'Portrait enquiry',
      }),
    )
    expect(mocks.send).toHaveBeenLastCalledWith(
      expect.objectContaining({
        subject: 'New booking request — Portrait',
        replyTo: 'client@example.org',
      }),
    )
  })
  it('accepts general enquiries without a message or mail service', async () => {
    vi.stubEnv('RESEND_API_KEY', '')
    expect(await submitBookingRequest(form({ message: '' }))).toEqual({ ok: true })
    expect(mocks.insert).toHaveBeenLastCalledWith(
      expect.objectContaining({ message: null, tier_id: null }),
    )
  })
  it.each([
    { email: 'invalid' },
    { email: 'a'.repeat(255) + '@x.org' },
    { message: 'x'.repeat(2001) },
  ])('rejects invalid fields %j', async (values) => {
    expect((await submitBookingRequest(form(values))).ok).toBe(false)
  })
  it('drops honeypots before persistence', async () => {
    mocks.insert.mockClear()
    expect(await submitBookingRequest(form({ website: 'bot' }))).toEqual({ ok: true })
    expect(mocks.insert).not.toHaveBeenCalled()
  })
  it('fails closed when recipient lookup fails or is unconfigured', async () => {
    for (const response of [
      { data: null, error: { message: 'offline' } },
      { data: null, error: null },
    ]) {
      mocks.recipient.mockResolvedValue(response)
      expect((await submitBookingRequest(form())).ok).toBe(false)
    }
  })
  it('reports persistence failure', async () => {
    mocks.insert.mockResolvedValue({ error: { message: 'offline' } })
    expect((await submitBookingRequest(form())).ok).toBe(false)
  })
})
