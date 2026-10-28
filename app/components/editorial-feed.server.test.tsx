/**
 * EditorialFeed picks the body of /editorial (spec R2): story covers when a
 * visible story has readable photos, otherwise today's flat editorial photo
 * feed. The loader and the grid are stubbed at their module boundaries.
 */
import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

const mock = vi.hoisted(() => ({ load: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ storage: { from: () => ({ getPublicUrl: (path: string) => ({ data: { publicUrl: `https://cdn/${path}` } }) }) } }) }))
vi.mock('@/lib/editorial-stories-data', () => ({ loadPublicStories: mock.load }))
vi.mock('./ui/masonry-grid', () => ({ MasonryGrid: ({ page }: { page: string }) => <p>flat feed: {page}</p> }))
vi.mock('next/image', () => ({ default: (props: Record<string, unknown>) => <span data-src={String(props.src)} /> }))

import { EditorialFeed } from './editorial-feed'

const photo = (id: string) => ({ id, kind: 'photo', storage_path: `${id}.jpg`, poster_path: null, duration_seconds: null, title: null, alt_text: `Alt ${id}`, width: 933, height: 1400 })

describe('<EditorialFeed />', () => {
  it('falls back to the flat editorial feed while no story is renderable', async () => {
    mock.load.mockResolvedValueOnce({ stories: [], photos: new Map() })
    const html = renderToStaticMarkup(await EditorialFeed())
    expect(html).toContain('flat feed: editorial')
    expect(html).not.toContain('/editorial/')
  })

  it('renders one cover tile per story, using the chosen cover when readable', async () => {
    mock.load.mockResolvedValueOnce({
      stories: [
        { id: 's1', slug: 'eva', title: 'soft structure', subtitle: '', credits: [], position: 0, coverPhotoId: 'p2', photoIds: ['p1', 'p2'] },
        { id: 's2', slug: 'sofia', title: 'city interlude', subtitle: '', credits: [], position: 1, coverPhotoId: 'gone', photoIds: ['p3'] },
      ],
      photos: new Map([['p1', photo('p1')], ['p2', photo('p2')], ['p3', photo('p3')]]),
    })
    const html = renderToStaticMarkup(await EditorialFeed())
    expect(html).not.toContain('flat feed')
    expect(html).toContain('href="/editorial/eva"')
    expect(html).toContain('data-src="https://cdn/p2.jpg"')
    expect(html).toContain('href="/editorial/sofia"')
    expect(html).toContain('data-src="https://cdn/p3.jpg"')
    expect(html).not.toContain('p1.jpg')
  })
})
