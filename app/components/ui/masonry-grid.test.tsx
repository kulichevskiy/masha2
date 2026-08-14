import { describe, expect, it, vi } from 'vitest'
import { MasonryGrid } from './masonry-grid'

const mockOrder = vi.fn(async () => ({ data: [], error: null }))
const query = {
  eq: vi.fn(() => query),
  contains: vi.fn(() => query),
  order: mockOrder,
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: () => ({ select: () => query }),
  }),
}))

describe('<MasonryGrid /> media boundary', () => {
  it('keeps public pages photo-only until public video rendering is implemented', async () => {
    await MasonryGrid({ page: 'portraits' })

    expect(query.eq).toHaveBeenCalledWith('kind', 'photo')
    expect(query.contains).toHaveBeenCalledWith('pages', ['portraits'])
  })
})
