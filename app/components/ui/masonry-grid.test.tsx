import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MasonryGrid } from './masonry-grid'

const rows = [
  {
    id: 'photo-one',
    kind: 'photo',
    storage_path: 'portraits/one.jpg',
    poster_path: null,
    duration_seconds: null,
    title: null,
    alt_text: 'First portrait',
    position: 1,
    width: 800,
    height: 1000,
  },
  {
    id: 'video-one',
    kind: 'video',
    storage_path: 'videos/clip.mp4',
    poster_path: 'videos/clip.poster.jpg',
    duration_seconds: 12.75,
    title: 'Portrait clip',
    alt_text: null,
    position: 2,
    width: 1080,
    height: 1920,
  },
]

let queryResult = { data: rows, error: null }
const query = {
  select: vi.fn(() => query),
  contains: vi.fn(() => query),
  order: vi.fn(() => query),
  then: (
    resolve: (value: typeof queryResult) => unknown,
    reject: (reason: unknown) => unknown
  ) => Promise.resolve(queryResult).then(resolve, reject),
}
const from = vi.fn(() => query)
const getPublicUrl = vi.fn((path: string) => ({
  data: { publicUrl: `https://cdn.test/${path}` },
}))
const storageFrom = vi.fn<(bucket: string) => { getPublicUrl: typeof getPublicUrl }>(
  () => ({ getPublicUrl })
)

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from,
    storage: { from: storageFrom },
  }),
}))

beforeEach(() => {
  queryResult = { data: rows, error: null }
  vi.clearAllMocks()
})

describe('<MasonryGrid /> media feed', () => {
  it('loads photos and videos for the page in one position sequence', async () => {
    const result = await MasonryGrid({ page: 'portraits' })

    expect(query.select).toHaveBeenCalledWith(
      'id, kind, storage_path, poster_path, duration_seconds, title, alt_text, position, width, height'
    )
    expect(query.contains).toHaveBeenCalledWith('pages', ['portraits'])
    expect(query.order).toHaveBeenNthCalledWith(1, 'position', { ascending: true })
    expect(query.order).toHaveBeenNthCalledWith(2, 'id', { ascending: true })
    expect(result.props.photos).toEqual([
      {
        id: 'photo-one',
        src: 'https://cdn.test/portraits/one.jpg',
        alt: 'First portrait',
        width: 800,
        height: 1000,
      },
      {
        id: 'video-one',
        kind: 'video',
        src: 'https://cdn.test/videos/clip.poster.jpg',
        videoSrc: 'https://cdn.test/videos/clip.mp4',
        alt: 'Portrait clip',
        durationSeconds: 12.75,
        width: 1080,
        height: 1920,
      },
    ])
    expect(storageFrom.mock.calls.map(([bucket]) => bucket)).toEqual([
      'photos',
      'videos',
      'videos',
    ])
  })
})
