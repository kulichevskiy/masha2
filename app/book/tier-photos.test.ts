import { describe, it, expect, vi, beforeEach } from 'vitest'

const mock = vi.hoisted(() => ({
  rows: null as unknown,
  error: null as unknown,
  limit: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    storage: { from: () => ({ getPublicUrl: (path: string) => ({ data: { publicUrl: `https://cdn.test/${path}` } }) }) },
    from: () => ({
      select: () => ({
        eq: () => ({
          overlaps: () => ({
            order: () => ({
              order: () => ({
                limit: (n: number) => {
                  mock.limit(n)
                  return Promise.resolve({ data: mock.rows, error: mock.error })
                },
              }),
            }),
          }),
        }),
      }),
    }),
  }),
}))

import { loadTierFrames } from './tier-photos'

beforeEach(() => {
  mock.rows = null
  mock.error = null
  mock.limit.mockClear()
})

describe('loadTierFrames', () => {
  it('resolves pinned paths without touching the feed', async () => {
    const frames = await loadTierFrames([{ id: 'a', photo_path: 'tiers/a.jpg' }])
    expect(frames.a?.src).toBe('https://cdn.test/tiers/a.jpg')
    expect(mock.limit).not.toHaveBeenCalled()
  })

  it('fills the tiers without a photograph from the top of the portraits feed', async () => {
    mock.rows = [
      { id: 'p1', storage_path: 'photos/p1.jpg', title: 'One', alt_text: null, width: 800, height: 1000 },
      { id: 'p2', storage_path: 'photos/p2.jpg', title: null, alt_text: 'Two', width: null, height: null },
    ]
    const frames = await loadTierFrames([
      { id: 'a', photo_path: null },
      { id: 'b', photo_path: 'tiers/b.jpg' },
      { id: 'c', photo_path: null },
    ])
    expect(mock.limit).toHaveBeenCalledWith(2)
    expect(frames.a).toMatchObject({ id: 'p1', alt: 'One', src: 'https://cdn.test/photos/p1.jpg', width: 800, height: 1000 })
    expect(frames.b?.src).toBe('https://cdn.test/tiers/b.jpg')
    expect(frames.c).toMatchObject({ id: 'p2', alt: 'Two' })
  })

  it('logs a failed feed read and leaves those tiers without a frame', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    mock.error = { message: 'down' }
    const frames = await loadTierFrames([{ id: 'a', photo_path: null }])
    expect(frames.a).toBeNull()
    expect(error).toHaveBeenCalled()
    error.mockRestore()
  })
})
