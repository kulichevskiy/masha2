/**
 * Validation half of submitGiftOrder. Supabase + Resend are stubbed at module
 * entry so the test stays at the boundary (input -> result shape).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { __resetRateLimitForTests } from '@/lib/rate-limit'

const mockRecipientMaybeSingle = vi.fn(async () => ({
  data: { value: 'maria@example.com' },
  error: null,
}))
// Amount tiles the action looks up to resolve the posted amount id into the
// chosen price string snapshot.
const AMOUNTS = [
  { id: 'amt_450', price: '450 €' },
  { id: 'amt_600', price: '600 €' },
]
const mockGiftMaybeSingle = vi.fn(async () => ({
  data: { amounts: AMOUNTS },
  error: null,
}))
const mockInsert = vi.fn(async () => ({ error: null }))
const mockSend = vi.fn(async () => ({ error: null }))

// supabase admin client — chained query builder. gift_certificate reads use
// `.select().limit().maybeSingle()`; app_settings uses `.select().eq().maybeSingle()`.
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === 'gift_certificate') {
        return {
          select: () => ({
            limit: () => ({ maybeSingle: mockGiftMaybeSingle }),
          }),
        }
      }
      if (table === 'app_settings') {
        return {
          select: () => ({
            eq: () => ({ maybeSingle: mockRecipientMaybeSingle }),
          }),
        }
      }
      // gift_certificate_requests insert
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

// Action under test is dynamically imported AFTER the mocks register.
async function loadAction() {
  const mod = await import('./actions')
  return mod.submitGiftOrder
}

function fd(fields: Record<string, string>): FormData {
  const f = new FormData()
  for (const [k, v] of Object.entries(fields)) f.append(k, v)
  return f
}

describe('submitGiftOrder', () => {
  beforeEach(() => {
    __resetRateLimitForTests()
    mockRecipientMaybeSingle.mockClear()
    mockGiftMaybeSingle.mockClear()
    mockGiftMaybeSingle.mockResolvedValue({
      data: { amounts: AMOUNTS },
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
      fd({ email: 'buyer@example.com', website: 'http://bot.example.com' })
    )
    expect(result).toEqual({ ok: true })
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('enforces the per-IP rate limit (3 / 10 min)', async () => {
    const submit = await loadAction()
    const ok1 = await submit(fd({ email: 'buyer@example.com', amount_id: 'amt_450' }))
    const ok2 = await submit(fd({ email: 'buyer@example.com', amount_id: 'amt_450' }))
    const ok3 = await submit(fd({ email: 'buyer@example.com', amount_id: 'amt_450' }))
    const ok4 = await submit(fd({ email: 'buyer@example.com', amount_id: 'amt_450' }))
    expect(ok1).toEqual({ ok: true })
    expect(ok2).toEqual({ ok: true })
    expect(ok3).toEqual({ ok: true })
    expect(ok4.ok).toBe(false)
    expect(mockInsert).toHaveBeenCalledTimes(3)
  })

  it('happy path resolves the chosen amount, inserts and returns ok', async () => {
    const submit = await loadAction()
    const result = await submit(
      fd({ email: 'buyer@example.com', amount_id: 'amt_600' })
    )
    expect(result).toEqual({ ok: true })
    expect(mockInsert).toHaveBeenCalledTimes(1)
    expect(mockInsert.mock.calls[0][0]).toMatchObject({
      email: 'buyer@example.com',
      amount: '600 €',
      user_agent: 'test-agent',
    })
    expect(mockInsert.mock.calls[0][0]).toHaveProperty('ip_hash')
  })

  it('stores null amount for an unknown id but still accepts the order', async () => {
    const submit = await loadAction()
    const result = await submit(
      fd({ email: 'buyer@example.com', amount_id: 'amt_unknown' })
    )
    expect(result).toEqual({ ok: true })
    expect(mockInsert).toHaveBeenCalledTimes(1)
    expect(mockInsert.mock.calls[0][0]).toMatchObject({ amount: null })
  })

  it('sends a Resend notification with the chosen amount and buyer reply-to', async () => {
    process.env.RESEND_API_KEY = 'test-key'
    const submit = await loadAction()
    const result = await submit(
      fd({ email: 'buyer@example.com', amount_id: 'amt_450' })
    )
    expect(result).toEqual({ ok: true })
    expect(mockSend).toHaveBeenCalledTimes(1)
    const sent = mockSend.mock.calls[0][0]
    expect(sent).toMatchObject({
      to: 'maria@example.com',
      replyTo: 'buyer@example.com',
      subject: 'New gift certificate order',
    })
    expect(sent.text).toContain('450 €')
  })

  it('still persists the request when RESEND_API_KEY is unset', async () => {
    const submit = await loadAction()
    const result = await submit(
      fd({ email: 'buyer@example.com', amount_id: 'amt_450' })
    )
    expect(result).toEqual({ ok: true })
    expect(mockInsert).toHaveBeenCalledTimes(1)
    expect(mockSend).not.toHaveBeenCalled()
  })
})
