/**
 * Validation + boundary behaviour of submitWorkshopSubscription. Supabase +
 * Resend are stubbed at module entry so the test stays at the boundary
 * (input -> result shape + which side effects fired).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { __resetRateLimitForTests } from '@/lib/rate-limit'

const mockRecipientMaybeSingle = vi.fn(async () => ({
  data: { value: 'maria@example.com' },
  error: null,
}))
const mockInsert = vi.fn<(subscriber: Record<string, unknown>) => Promise<{ error: null }>>(async () => ({ error: null }))
const mockSend = vi.fn<(message: { to: string; replyTo: string; subject: string; text: string }) => Promise<{ error: null }>>(async () => ({ error: null }))

// supabase admin client — chained query builder. The action inserts into
// workshop_subscribers, then reads app_settings via `.select().eq().maybeSingle()`.
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === 'app_settings') {
        return {
          select: () => ({
            eq: () => ({ maybeSingle: mockRecipientMaybeSingle }),
          }),
        }
      }
      // workshop_subscribers insert
      return { insert: mockInsert }
    },
  }),
}))

vi.mock('next/headers', () => ({
  headers: async () => ({
    get: (key: string) => (key === 'user-agent' ? 'test-agent' : null),
  }),
}))

vi.mock('resend', () => ({
  Resend: class {
    emails = { send: mockSend }
  },
}))

async function loadAction() {
  const mod = await import('./actions')
  return mod.submitWorkshopSubscription
}

function fd(fields: Record<string, string | string[]>): FormData {
  const f = new FormData()
  const defaults = { seasons: ['spring'], cities: ['berlin'] }
  for (const [k, v] of Object.entries({ ...defaults, ...fields })) {
    for (const value of Array.isArray(v) ? v : [v]) f.append(k, value)
  }
  return f
}

describe('submitWorkshopSubscription', () => {
  beforeEach(() => {
    __resetRateLimitForTests()
    mockRecipientMaybeSingle.mockClear()
    mockRecipientMaybeSingle.mockResolvedValue({
      data: { value: 'maria@example.com' },
      error: null,
    })
    mockInsert.mockClear()
    mockSend.mockClear()
    delete process.env.RESEND_API_KEY
  })

  it('rejects invalid email', async () => {
    const submit = await loadAction()
    const result = await submit(fd({ email: 'not-an-email' }))
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/email/i) })
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('treats honeypot fills as silent success', async () => {
    const submit = await loadAction()
    const result = await submit(
      fd({ email: 'fan@example.com', website: 'http://bot.example.com' })
    )
    expect(result).toEqual({ ok: true })
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('enforces the per-IP rate limit (3 / 10 min)', async () => {
    const submit = await loadAction()
    const ok1 = await submit(fd({ email: 'fan@example.com' }))
    const ok2 = await submit(fd({ email: 'fan@example.com' }))
    const ok3 = await submit(fd({ email: 'fan@example.com' }))
    const ok4 = await submit(fd({ email: 'fan@example.com' }))
    expect(ok1).toEqual({ ok: true })
    expect(ok2).toEqual({ ok: true })
    expect(ok3).toEqual({ ok: true })
    expect(ok4.ok).toBe(false)
    expect(mockInsert).toHaveBeenCalledTimes(3)
  })

  it('happy path inserts the subscriber and returns ok', async () => {
    const submit = await loadAction()
    const result = await submit(fd({ email: 'fan@example.com' }))
    expect(result).toEqual({ ok: true })
    expect(mockInsert).toHaveBeenCalledTimes(1)
    expect(mockInsert.mock.calls[0][0]).toMatchObject({
      email: 'fan@example.com',
      seasons: ['spring'],
      cities: ['berlin'],
      user_agent: 'test-agent',
    })
    expect(mockInsert.mock.calls[0][0]).toHaveProperty('ip_hash')
  })

  it('sends a Resend notification titled "New workshop subscriber"', async () => {
    process.env.RESEND_API_KEY = 'test-key'
    const submit = await loadAction()
    const result = await submit(fd({ email: 'fan@example.com', seasons: ['spring', 'summer'], cities: ['berlin', 'hamburg', 'paris'] }))
    expect(result).toEqual({ ok: true })
    expect(mockSend).toHaveBeenCalledTimes(1)
    const sent = mockSend.mock.calls[0][0]
    expect(sent).toMatchObject({
      to: 'maria@example.com',
      replyTo: 'fan@example.com',
      subject: 'New workshop subscriber',
    })
    expect(sent.text).toContain('fan@example.com')
    expect(sent.text).toContain('Seasons: Spring, Summer')
    expect(sent.text).toContain('Cities: Berlin, Hamburg, Paris')
  })

  it.each([
    { seasons: [], cities: ['berlin'], error: /season/i },
    { seasons: ['spring'], cities: [], error: /city/i },
    { seasons: ['spring', 'winter'], cities: ['berlin'], error: /season/i },
    { seasons: ['spring'], cities: ['paris', 'london'], error: /city/i },
    { seasons: ['__proto__'], cities: ['berlin'], error: /season/i },
  ])('rejects missing or unsupported preferences: $seasons / $cities', async ({ seasons, cities, error }) => {
    const submit = await loadAction()
    const result = await submit(fd({ email: 'fan@example.com', seasons, cities }))
    expect(result).toEqual({ ok: false, error: expect.stringMatching(error) })
    expect(mockInsert).not.toHaveBeenCalled()
    expect(mockSend).not.toHaveBeenCalled()
  })

  it('saves multiple choices once each in a stable order', async () => {
    const submit = await loadAction()
    const result = await submit(fd({
      email: 'fan@example.com',
      seasons: ['summer', 'spring', 'summer'],
      cities: ['paris', 'hamburg', 'berlin', 'paris'],
    }))
    expect(result).toEqual({ ok: true })
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
      seasons: ['spring', 'summer'],
      cities: ['berlin', 'hamburg', 'paris'],
    }))
  })

  it('still persists the subscriber when RESEND_API_KEY is unset', async () => {
    const submit = await loadAction()
    const result = await submit(fd({ email: 'fan@example.com' }))
    expect(result).toEqual({ ok: true })
    expect(mockInsert).toHaveBeenCalledTimes(1)
    expect(mockSend).not.toHaveBeenCalled()
  })

  it('still succeeds (subscriber saved) when no recipient is configured', async () => {
    process.env.RESEND_API_KEY = 'test-key'
    mockRecipientMaybeSingle.mockResolvedValueOnce({ data: { value: '' }, error: null })
    const submit = await loadAction()
    const result = await submit(fd({ email: 'fan@example.com' }))
    expect(result).toEqual({ ok: true })
    expect(mockInsert).toHaveBeenCalledTimes(1)
    expect(mockSend).not.toHaveBeenCalled()
  })
})
