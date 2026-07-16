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
const mockInsert = vi.fn(async () => ({ error: null }))
const mockSend = vi.fn(async () => ({ error: null }))

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

function fd(fields: Record<string, string>): FormData {
  const f = new FormData()
  for (const [k, v] of Object.entries(fields)) f.append(k, v)
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
      user_agent: 'test-agent',
    })
    expect(mockInsert.mock.calls[0][0]).toHaveProperty('ip_hash')
  })

  it('sends a Resend notification titled "New workshop subscriber"', async () => {
    process.env.RESEND_API_KEY = 'test-key'
    const submit = await loadAction()
    const result = await submit(fd({ email: 'fan@example.com' }))
    expect(result).toEqual({ ok: true })
    expect(mockSend).toHaveBeenCalledTimes(1)
    const sent = mockSend.mock.calls[0][0]
    expect(sent).toMatchObject({
      to: 'maria@example.com',
      replyTo: 'fan@example.com',
      subject: 'New workshop subscriber',
    })
    expect(sent.text).toContain('fan@example.com')
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
