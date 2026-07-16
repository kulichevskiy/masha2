/**
 * Validation half of submitWorkshopApplication. Supabase + Resend are stubbed
 * at module entry so the test stays at the boundary (input -> result shape).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { __resetRateLimitForTests } from '@/lib/rate-limit'

const mockRecipientMaybeSingle = vi.fn(async () => ({
  data: { value: 'maria@example.com' },
  error: null,
}))
// Two tariffs the action looks up to resolve the posted intake key into a
// readable label snapshot ("<name> — <price>").
const TARIFFS = [
  { key: 'short', name: 'Short intake', price: '450 €' },
  { key: 'full', name: 'Full intake', price: '600 €' },
]
const mockWorkshopMaybeSingle = vi.fn(async () => ({
  data: { sales_open: true, tariffs: TARIFFS },
  error: null,
}))
const mockInsert = vi.fn(async () => ({ error: null }))

// supabase admin client — chained query builder. workshop reads use
// `.select().limit().maybeSingle()`; app_settings uses `.select().eq().maybeSingle()`.
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === 'workshop') {
        return {
          select: () => ({
            limit: () => ({ maybeSingle: mockWorkshopMaybeSingle }),
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
      // workshop_applications insert
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
    emails = { send: async () => ({ error: null }) }
  },
}))

// Action under test is dynamically imported AFTER the mocks register.
async function loadAction() {
  const mod = await import('./actions')
  return mod.submitWorkshopApplication
}

function fd(fields: Record<string, string>): FormData {
  const f = new FormData()
  for (const [k, v] of Object.entries(fields)) f.append(k, v)
  return f
}

describe('submitWorkshopApplication validation', () => {
  beforeEach(() => {
    __resetRateLimitForTests()
    mockRecipientMaybeSingle.mockClear()
    mockWorkshopMaybeSingle.mockClear()
    mockWorkshopMaybeSingle.mockResolvedValue({
      data: { sales_open: true, tariffs: TARIFFS },
      error: null,
    })
    mockInsert.mockClear()
  })

  it('rejects missing name', async () => {
    const submit = await loadAction()
    const result = await submit(fd({ name: '', email: 'who@example.com' }))
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/name/i) })
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('rejects invalid email', async () => {
    const submit = await loadAction()
    const result = await submit(fd({ name: 'Alex', email: 'not-an-email' }))
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/email/i) })
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('rejects oversize message', async () => {
    const submit = await loadAction()
    const result = await submit(
      fd({
        name: 'Alex',
        email: 'alex@example.com',
        message: 'x'.repeat(2001),
      })
    )
    expect(result.ok).toBe(false)
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('treats honeypot fills as silent success', async () => {
    const submit = await loadAction()
    const result = await submit(
      fd({
        name: 'Alex',
        email: 'alex@example.com',
        website: 'http://bot.example.com',
      })
    )
    expect(result).toEqual({ ok: true })
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('rejects when sales are closed (closes intake server-side)', async () => {
    mockWorkshopMaybeSingle.mockResolvedValueOnce({
      data: { sales_open: false, tariffs: TARIFFS },
      error: null,
    })
    const submit = await loadAction()
    const result = await submit(
      fd({ name: 'Alex', email: 'alex@example.com' })
    )
    expect(result).toEqual({ ok: false, error: 'Applications are closed.' })
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('happy path inserts and returns ok', async () => {
    const submit = await loadAction()
    const result = await submit(
      fd({
        name: 'Alex',
        email: 'alex@example.com',
        instagram: '@alex',
        message: 'I would love to come',
      })
    )
    expect(result).toEqual({ ok: true })
    expect(mockInsert).toHaveBeenCalledTimes(1)
    expect(mockInsert.mock.calls[0][0]).toMatchObject({
      name: 'Alex',
      email: 'alex@example.com',
      instagram: '@alex',
      message: 'I would love to come',
    })
  })

  it('stores a resolved snapshot for a valid full intake', async () => {
    const submit = await loadAction()
    const result = await submit(
      fd({ name: 'Alex', email: 'alex@example.com', intake: 'full' })
    )
    expect(result).toEqual({ ok: true })
    expect(mockInsert).toHaveBeenCalledTimes(1)
    expect(mockInsert.mock.calls[0][0]).toMatchObject({
      intake: 'Full intake — 600 €',
    })
  })

  it('stores a resolved snapshot for a valid short intake', async () => {
    const submit = await loadAction()
    const result = await submit(
      fd({ name: 'Alex', email: 'alex@example.com', intake: 'short' })
    )
    expect(result).toEqual({ ok: true })
    expect(mockInsert.mock.calls[0][0]).toMatchObject({
      intake: 'Short intake — 450 €',
    })
  })

  it('stores null intake for an unknown key but still accepts the application', async () => {
    const submit = await loadAction()
    const result = await submit(
      fd({ name: 'Alex', email: 'alex@example.com', intake: 'deluxe' })
    )
    expect(result).toEqual({ ok: true })
    expect(mockInsert).toHaveBeenCalledTimes(1)
    expect(mockInsert.mock.calls[0][0]).toMatchObject({ intake: null })
  })

  it('stores null intake when none is posted', async () => {
    const submit = await loadAction()
    const result = await submit(
      fd({ name: 'Alex', email: 'alex@example.com' })
    )
    expect(result).toEqual({ ok: true })
    expect(mockInsert).toHaveBeenCalledTimes(1)
    expect(mockInsert.mock.calls[0][0]).toMatchObject({ intake: null })
  })
})
