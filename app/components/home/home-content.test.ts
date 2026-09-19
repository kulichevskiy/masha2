/**
 * The home story has two readers on purpose. The public page must render even
 * when the query fails, so it falls back to the copy shipped in the code. The
 * admin editor must not: loading those defaults into the form would let the
 * next Save write them over whatever is stored.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_CONTENT } from '@/lib/home-story-content'

const mockMaybeSingle = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: () => ({ select: () => ({ limit: () => ({ maybeSingle: mockMaybeSingle }) }) }),
  }),
}))

describe('home story readers', () => {
  beforeEach(() => {
    mockMaybeSingle.mockReset()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('reads the stored copy over the defaults', async () => {
    mockMaybeSingle.mockResolvedValue({ data: { content: { hero: { heading: 'stored' } } }, error: null })
    const { loadHomeContent, loadHomeContentForAdmin } = await import('./home-content')

    expect((await loadHomeContent()).hero.heading).toBe('stored')
    const read = await loadHomeContentForAdmin()
    expect(read.ok && read.content.hero.heading).toBe('stored')
  })

  it('keeps the public page on the shipped copy when the query fails', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: { message: 'connection reset' } })
    const { loadHomeContent } = await import('./home-content')

    expect(await loadHomeContent()).toEqual(DEFAULT_CONTENT)
  })

  it('fails closed for the admin editor when the query fails', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: { message: 'connection reset' } })
    const { loadHomeContentForAdmin } = await import('./home-content')

    expect(await loadHomeContentForAdmin()).toEqual({ ok: false, error: 'connection reset' })
  })

  it('fails closed for the admin editor when the row is missing', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null })
    const { loadHomeContentForAdmin } = await import('./home-content')

    const read = await loadHomeContentForAdmin()
    expect(read.ok).toBe(false)
  })
})

describe('resolveFrame', () => {
  const feedFrame = { id: 'feed', src: 'https://cdn/feed.jpg', alt: 'from the feed', width: 10, height: 20 }

  it('keeps the feed frame while no photograph is pinned', async () => {
    const { resolveFrame } = await import('./home-content')
    expect(resolveFrame({ path: '', alt: '' }, feedFrame)).toEqual(feedFrame)
  })

  it('lets the pinned alt text override the feed frame alt', async () => {
    const { resolveFrame } = await import('./home-content')
    expect(resolveFrame({ path: '', alt: 'written in admin' }, feedFrame)?.alt).toBe('written in admin')
  })

  it('uses the pinned photograph when there is one', async () => {
    const { resolveFrame } = await import('./home-content')
    const frame = resolveFrame({ path: 'home/a.jpg', alt: 'pinned' }, feedFrame)
    expect(frame?.src).toContain('/storage/v1/object/public/photos/home/a.jpg')
    expect(frame?.alt).toBe('pinned')
  })

  it('returns nothing when neither the slot nor the feed has a frame', async () => {
    const { resolveFrame } = await import('./home-content')
    expect(resolveFrame({ path: '', alt: '' }, null)).toBeNull()
  })
})
