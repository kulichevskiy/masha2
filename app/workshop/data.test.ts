import { describe, it, expect, vi } from 'vitest'
const mock = vi.hoisted(() => ({ row: null as Record<string, unknown> | null }))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: () => ({
      select: () => ({
        limit: () => ({ maybeSingle: async () => ({ data: mock.row, error: null }) }),
      }),
    }),
  }),
}))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => ({}) }))
import { getPublicWorkshop } from './data'
describe('workshop content reader', () => {
  it('normalises optional arrays and partially authored days', async () => {
    mock.row = {
      id: 'w',
      days: [{}, { day: 'Day 2', title: 'Studio', note: 'Bring camera', bullets: ['Practice'] }],
      program: null,
      tariffs: null,
      gallery: null,
      faq: null,
    }
    const row = await getPublicWorkshop()
    expect(row?.days).toEqual([
      { day: '', title: '', note: '', bullets: [] },
      { day: 'Day 2', title: 'Studio', note: 'Bring camera', bullets: ['Practice'] },
    ])
    expect(row?.gallery).toEqual([])
  })
  it('returns null when the singleton is missing', async () => {
    mock.row = null
    expect(await getPublicWorkshop()).toBeNull()
  })
})
