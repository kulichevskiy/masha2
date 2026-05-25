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
const mockWorkshopMaybeSingle = vi.fn(async () => ({
  data: { is_visible: true },
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
      data: { is_visible: true },
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

  it('rejects when the workshop is hidden (closes intake server-side)', async () => {
    mockWorkshopMaybeSingle.mockResolvedValueOnce({
      data: { is_visible: false },
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
})
