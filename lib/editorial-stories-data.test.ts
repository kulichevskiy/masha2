/**
 * loadPublicStories reduces what RLS lets a reader see to the stories worth
 * rendering: visible stories (the query), only the photos the reader can read
 * (a second query against photos), feed order and normalized credits. The
 * Supabase client is a hand-rolled stub at the query-builder boundary.
 */
import { describe, expect, it } from 'vitest'
import { loadPublicStories } from './editorial-stories-data'

type StoryRow = {
  id: string
  slug: string
  title: string
  subtitle: string
  credits: unknown
  cover_photo_id: string | null
  position: number
  editorial_story_photos: { photo_id: string; position: number }[]
}

function stubClient(stories: StoryRow[], readablePhotoIds: string[], failures: Partial<Record<'stories' | 'photos', string>> = {}) {
  const calls: { table: string; ids?: string[]; filters?: unknown[][] }[] = []
  const client = {
    from(table: string) {
      const filters: unknown[][] = []
      const builder = {
        select: () => builder,
        order: () => builder,
        eq: (...args: unknown[]) => {
          filters.push(args)
          return builder
        },
        in: (_column: string, ids: string[]) => {
          calls.push({ table, ids })
          return Promise.resolve(
            failures.photos
              ? { data: null, error: { message: failures.photos } }
              : { data: readablePhotoIds.filter((id) => ids.includes(id)).map(mediaRow), error: null }
          )
        },
        then: (resolve: (value: unknown) => void) => {
          calls.push({ table, filters })
          resolve(failures.stories ? { data: null, error: { message: failures.stories } } : { data: stories, error: null })
        },
      }
      return builder
    },
  }
  return { client: client as unknown as Parameters<typeof loadPublicStories>[0], calls }
}

function mediaRow(id: string) {
  return { id, kind: 'photo', storage_path: `${id}.jpg`, poster_path: null, duration_seconds: null, title: null, alt_text: null, width: 933, height: 1400 }
}

const eva: StoryRow = {
  id: 's1', slug: 'soft-structure', title: 'soft structure', subtitle: 'Soft fabric.', position: 1,
  credits: [{ role: 'Photography', name: 'Maria Chevskaya' }, { role: 'styling', name: '' }],
  cover_photo_id: 'p2',
  editorial_story_photos: [{ photo_id: 'p2', position: 1 }, { photo_id: 'p1', position: 0 }, { photo_id: 'hidden', position: 2 }],
}
const sofia: StoryRow = {
  id: 's2', slug: 'city-interlude', title: 'city interlude', subtitle: '', position: 0, credits: [], cover_photo_id: null,
  editorial_story_photos: [{ photo_id: 'p3', position: 0 }],
}
const empty: StoryRow = {
  id: 's3', slug: 'no-photos', title: 'no photos', subtitle: '', position: -1, credits: [], cover_photo_id: null,
  editorial_story_photos: [{ photo_id: 'hidden', position: 0 }],
}

describe('loadPublicStories', () => {
  it('returns renderable stories in feed order with readable photo ids and normalized credits', async () => {
    const { client, calls } = stubClient([eva, sofia, empty], ['p1', 'p2', 'p3'])
    const result = await loadPublicStories(client)

    expect(result.stories.map((s) => s.slug)).toEqual(['city-interlude', 'soft-structure'])
    const story = result.stories[1]
    expect(story.photoIds).toEqual(['p1', 'p2'])
    expect(story.coverPhotoId).toBe('p2')
    expect(story.credits).toEqual([{ role: 'photography', name: 'maria chevskaya' }])
    expect([...result.photos.keys()].sort()).toEqual(['p1', 'p2', 'p3'])
    // Every referenced photo id is asked for once, hidden ones included; RLS answers.
    expect(calls.find((c) => c.table === 'photos')?.ids?.sort()).toEqual(['hidden', 'p1', 'p2', 'p3'])
  })

  it('returns nothing to render when there are no visible stories and skips the photo query', async () => {
    const { client, calls } = stubClient([], ['p1'])
    const result = await loadPublicStories(client)
    expect(result.stories).toEqual([])
    expect(result.photos.size).toBe(0)
    expect(calls.map((c) => c.table)).toEqual(['editorial_stories'])
  })

  it('asks only for visible stories, so a signed-in admin does not see hidden ones publicly', async () => {
    const { client, calls } = stubClient([sofia], ['p3'])
    await loadPublicStories(client)
    expect(calls[0].filters).toEqual([['visible', true]])
  })

  it('surfaces database errors instead of rendering an empty section', async () => {
    await expect(loadPublicStories(stubClient([], [], { stories: 'boom' }).client)).rejects.toThrow('Failed to load stories: boom')
    await expect(loadPublicStories(stubClient([sofia], [], { photos: 'nope' }).client)).rejects.toThrow('Failed to load story photos: nope')
  })
})
