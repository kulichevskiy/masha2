/**
 * Admin story actions (spec R4): the admin gate, validation messages, unique
 * slug derivation, join-row replacement order and the paths revalidated. The
 * cookie-backed server client is replaced by a recording fake at the
 * query-builder boundary; each test states the rows the database would answer.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

type Call = { table: string; ops: { op: string; args: unknown[] }[] }
type Answer = { data?: unknown; error?: { message: string } | null }

const fake = vi.hoisted(() => ({
  calls: [] as Call[],
  answer: (() => ({ data: null, error: null })) as (call: Call) => Answer,
  user: { id: 'u1' } as { id: string } | null,
  isAdmin: true,
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: fake.user } }) },
    rpc: async () => ({ data: fake.isAdmin, error: null }),
    from: (table: string) => {
      const call: Call = { table, ops: [] }
      fake.calls.push(call)
      const builder: Record<string, unknown> = {}
      for (const op of ['select', 'insert', 'upsert', 'update', 'delete', 'eq', 'in', 'not', 'order', 'single', 'maybeSingle']) {
        builder[op] = (...args: unknown[]) => {
          call.ops.push({ op, args })
          return builder
        }
      }
      builder.then = (resolve: (value: Answer) => void) => resolve(fake.answer(call))
      return builder
    },
  }),
}))

const revalidatePath = vi.fn()
vi.mock('next/cache', () => ({ revalidatePath: (...args: unknown[]) => revalidatePath(...args) }))

const actions = await import('./story-actions')
import { CREDIT_ROLE_ERROR, SLUG_ERROR, SLUG_TAKEN_ERROR, TITLE_ERROR } from './story-messages'

function ops(call: Call) {
  return call.ops.map((o) => o.op)
}

beforeEach(() => {
  fake.calls = []
  fake.user = { id: 'u1' }
  fake.isAdmin = true
  fake.answer = () => ({ data: null, error: null })
  revalidatePath.mockClear()
})

describe('admin gate', () => {
  it('rejects anonymous and non-admin callers before touching the database', async () => {
    fake.user = null
    await expect(actions.createStory({ title: 'x' })).rejects.toThrow('Unauthorized')
    fake.user = { id: 'u1' }
    fake.isAdmin = false
    await expect(actions.deleteStory({ id: 's1' })).rejects.toThrow('Forbidden')
    expect(fake.calls).toEqual([])
  })
})

describe('createStory', () => {
  it('derives a unique slug, prepends the story and pre-fills the suggested credits', async () => {
    fake.answer = (call) =>
      ops(call).includes('insert')
        ? { data: { id: 'new', slug: 'soft-structure-2' }, error: null }
        : { data: [{ slug: 'soft-structure', position: 0 }, { slug: 'city-interlude', position: -1 }], error: null }

    const result = await actions.createStory({ title: '  Soft Structure ' })

    expect(result).toEqual({ id: 'new', slug: 'soft-structure-2' })
    const insert = fake.calls.find((c) => ops(c).includes('insert'))!
    expect(insert.ops[0].args[0]).toMatchObject({
      title: 'Soft Structure',
      slug: 'soft-structure-2',
      position: -2,
      credits: [{ role: 'photography', name: 'maria chevskaya' }, { role: 'model', name: '' }, { role: 'styling', name: '' }, { role: 'hair & make-up', name: '' }],
    })
    expect(revalidatePath.mock.calls.map((c) => c[0])).toEqual(['/admin', '/editorial'])
  })

  it('refuses a blank title without writing', async () => {
    expect(await actions.createStory({ title: '   ' })).toEqual({ error: TITLE_ERROR })
    expect(fake.calls).toEqual([])
  })
})

describe('updateStory', () => {
  const input = {
    id: 's1',
    title: 'soft structure',
    slug: 'soft-structure',
    subtitle: ' Soft fabric. ',
    credits: [
      { role: ' photography ', name: 'maria chevskaya' },
      { role: 'styling', name: '  ' },
    ],
  }

  it('validates the slug pattern, blank titles and credit roles', async () => {
    expect(await actions.updateStory({ ...input, slug: 'Soft Structure!' })).toEqual({ error: SLUG_ERROR })
    expect(await actions.updateStory({ ...input, title: ' ' })).toEqual({ error: TITLE_ERROR })
    expect(await actions.updateStory({ ...input, credits: [{ role: ' ', name: 'x' }] })).toEqual({ error: CREDIT_ROLE_ERROR })
    expect(fake.calls).toEqual([])
  })

  it('rejects a slug another story already uses', async () => {
    fake.answer = (call) => {
      if (ops(call).includes('single')) return { data: { slug: 'old-slug' }, error: null }
      if (ops(call).includes('maybeSingle')) return { data: { id: 'other' }, error: null }
      return { data: null, error: null }
    }
    expect(await actions.updateStory(input)).toEqual({ error: SLUG_TAKEN_ERROR })
    expect(fake.calls.some((c) => ops(c).includes('update'))).toBe(false)
  })

  it('saves trimmed fields, drops blank-name credits and revalidates old and new slugs', async () => {
    fake.answer = (call) => (ops(call).includes('single') ? { data: { slug: 'old-slug' }, error: null } : { data: null, error: null })

    expect(await actions.updateStory(input)).toEqual({ slug: 'soft-structure' })

    const update = fake.calls.find((c) => ops(c).includes('update'))!
    expect(update.ops.find((o) => o.op === 'update')!.args[0]).toEqual({
      title: 'soft structure',
      slug: 'soft-structure',
      subtitle: 'Soft fabric.',
      credits: [{ role: 'photography', name: 'maria chevskaya' }],
    })
    expect(revalidatePath.mock.calls.map((c) => c[0])).toEqual(['/admin', '/editorial', '/editorial/old-slug', '/editorial/soft-structure'])
  })
})

describe('setStoryVisible and deleteStory', () => {
  it('toggle visibility and revalidate the story page', async () => {
    fake.answer = () => ({ data: { slug: 'eva' }, error: null })
    expect(await actions.setStoryVisible({ id: 's1', visible: true })).toEqual({})
    expect(fake.calls[0].ops.find((o) => o.op === 'update')!.args[0]).toEqual({ visible: true })
    expect(revalidatePath.mock.calls.map((c) => c[0])).toEqual(['/admin', '/editorial', '/editorial/eva'])
  })

  it('return the database message as an error', async () => {
    fake.answer = () => ({ data: null, error: { message: 'nope' } })
    expect(await actions.deleteStory({ id: 's1' })).toEqual({ error: 'Не удалось удалить: nope' })
    expect(revalidatePath).not.toHaveBeenCalled()
  })
})

describe('reorderStories', () => {
  it('reuses the existing position slots in the new visual order', async () => {
    fake.answer = (call) =>
      ops(call).includes('in')
        ? { data: [{ id: 'a', position: -3 }, { id: 'b', position: 0 }, { id: 'c', position: 4 }], error: null }
        : { data: null, error: null }

    expect(await actions.reorderStories(['c', 'a', 'b'])).toEqual({})

    const updates = fake.calls
      .filter((c) => ops(c).includes('update'))
      .map((c) => [c.ops.find((o) => o.op === 'eq')!.args[1], (c.ops.find((o) => o.op === 'update')!.args[0] as { position: number }).position])
    expect(updates).toEqual([['c', -3], ['a', 0], ['b', 4]])
  })
})

describe('setStoryPhotos', () => {
  it('upserts the sequence in order, removes the rest, dedupes ids and keeps only a cover from the sequence', async () => {
    fake.answer = (call) => (ops(call).includes('single') ? { data: { slug: 'eva' }, error: null } : { data: null, error: null })

    expect(await actions.setStoryPhotos({ storyId: 's1', photoIds: ['p2', 'p1', 'p2'], coverPhotoId: 'gone' })).toEqual({})

    const [upsert, remove, cover] = fake.calls
    expect(upsert.table).toBe('editorial_story_photos')
    expect(upsert.ops[0].args).toEqual([
      [
        { story_id: 's1', photo_id: 'p2', position: 0 },
        { story_id: 's1', photo_id: 'p1', position: 1 },
      ],
      { onConflict: 'story_id,photo_id' },
    ])
    expect(ops(remove)).toEqual(['delete', 'eq', 'not'])
    expect(remove.ops[2].args).toEqual(['photo_id', 'in', '(p2,p1)'])
    expect(cover.table).toBe('editorial_stories')
    expect(cover.ops.find((o) => o.op === 'update')!.args[0]).toEqual({ cover_photo_id: null })
    expect(revalidatePath.mock.calls.map((c) => c[0])).toEqual(['/admin', '/editorial', '/editorial/eva'])
  })

  it('keeps a cover that is part of the sequence and clears every row for an empty story', async () => {
    fake.answer = (call) => (ops(call).includes('single') ? { data: { slug: 'eva' }, error: null } : { data: null, error: null })
    await actions.setStoryPhotos({ storyId: 's1', photoIds: ['p1'], coverPhotoId: 'p1' })
    expect(fake.calls.find((c) => c.table === 'editorial_stories' && ops(c).includes('update'))!.ops[0].args[0]).toEqual({ cover_photo_id: 'p1' })

    fake.calls = []
    await actions.setStoryPhotos({ storyId: 's1', photoIds: [], coverPhotoId: null })
    expect(fake.calls.map((c) => ops(c))).toEqual([['delete', 'eq'], ['update', 'eq'], ['select', 'eq', 'single']])
  })

  it('stops before removing anything when the upsert fails and reports it', async () => {
    fake.answer = (call) => (ops(call).includes('upsert') ? { data: null, error: { message: 'dup' } } : { data: null, error: null })
    expect(await actions.setStoryPhotos({ storyId: 's1', photoIds: ['p1'], coverPhotoId: null })).toEqual({ error: 'Не удалось обновить фотографии: dup' })
    expect(fake.calls.map((c) => ops(c)[0])).toEqual(['upsert'])
    expect(revalidatePath).not.toHaveBeenCalled()
  })
})
