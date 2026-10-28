/**
 * Pure helpers behind the editorial stories: slugs, cover choice, feed order,
 * previous/next navigation and the credits list. Expectations come from the
 * spec's worked examples (docs/feat-editorial-stories/spec.md), not from the
 * helpers themselves.
 */
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_CREDITS,
  isValidSlug,
  neighbours,
  normalizeCredits,
  orderStoryPhotos,
  pickCover,
  renderableStories,
  slugify,
  uniqueSlug,
} from './editorial-stories'

describe('slugify', () => {
  it('lowercases, joins words with single hyphens and trims punctuation', () => {
    expect(slugify('Soft Structure!')).toBe('soft-structure')
    expect(slugify('  a scene — in passing  ')).toBe('a-scene-in-passing')
    expect(slugify('Colour  in   Motion')).toBe('colour-in-motion')
  })

  it('transliterates Cyrillic and strips accents', () => {
    expect(slugify('Женя — мерцание')).toBe('zhenya-mertsanie')
    expect(slugify('Élise à Paris')).toBe('elise-a-paris')
  })

  it('falls back to "story" when nothing usable remains and caps the length', () => {
    expect(slugify('!!!')).toBe('story')
    expect(slugify('')).toBe('story')
    const long = slugify('x'.repeat(200))
    expect(long).toHaveLength(80)
    expect(isValidSlug(long)).toBe(true)
  })
})

describe('uniqueSlug', () => {
  it('keeps a free slug and suffixes -2, -3 on collisions', () => {
    expect(uniqueSlug('eva', [])).toBe('eva')
    expect(uniqueSlug('eva', ['eva'])).toBe('eva-2')
    expect(uniqueSlug('eva', ['eva', 'eva-2'])).toBe('eva-3')
  })
})

describe('isValidSlug', () => {
  it('accepts lowercase words with inner hyphens only', () => {
    expect(isValidSlug('soft-structure')).toBe(true)
    expect(isValidSlug('white-noise-2')).toBe(true)
    expect(isValidSlug('Soft-Structure')).toBe(false)
    expect(isValidSlug('-soft')).toBe(false)
    expect(isValidSlug('soft--structure')).toBe(false)
    expect(isValidSlug('soft structure')).toBe(false)
    expect(isValidSlug('')).toBe(false)
  })
})

describe('pickCover', () => {
  it('uses the chosen cover when it is part of the readable sequence', () => {
    expect(pickCover({ coverPhotoId: 'p3', photoIds: ['p1', 'p2', 'p3'] })).toBe('p3')
  })

  it('falls back to the first readable photo when the cover is unset or gone', () => {
    expect(pickCover({ coverPhotoId: null, photoIds: ['p1', 'p2'] })).toBe('p1')
    expect(pickCover({ coverPhotoId: 'gone', photoIds: ['p1', 'p2'] })).toBe('p1')
    expect(pickCover({ coverPhotoId: 'p1', photoIds: [] })).toBeNull()
  })
})

describe('renderableStories', () => {
  it('drops stories without readable photos and orders by position, then id', () => {
    const stories = [
      { id: 'b', position: 2, photoIds: ['x'] },
      { id: 'a', position: 2, photoIds: ['y'] },
      { id: 'c', position: 1, photoIds: [] },
      { id: 'd', position: 0, photoIds: ['z'] },
    ]
    expect(renderableStories(stories).map((s) => s.id)).toEqual(['d', 'a', 'b'])
  })
})

describe('neighbours', () => {
  const ordered = [{ slug: 'eva' }, { slug: 'sofia' }, { slug: 'delizeu' }]

  it('walks the list and wraps around at both ends', () => {
    expect(neighbours(ordered, 'sofia')).toEqual({ previous: { slug: 'eva' }, next: { slug: 'delizeu' } })
    expect(neighbours(ordered, 'eva')).toEqual({ previous: { slug: 'delizeu' }, next: { slug: 'sofia' } })
    expect(neighbours(ordered, 'delizeu')).toEqual({ previous: { slug: 'sofia' }, next: { slug: 'eva' } })
  })

  it('points a lone story at itself and gives an unknown slug nothing', () => {
    expect(neighbours([{ slug: 'eva' }], 'eva')).toEqual({ previous: { slug: 'eva' }, next: { slug: 'eva' } })
    expect(neighbours(ordered, 'missing')).toEqual({ previous: null, next: null })
  })
})

describe('normalizeCredits', () => {
  it('keeps ordered role/name pairs, lowercased and trimmed, dropping blank names', () => {
    expect(
      normalizeCredits([
        { role: 'Photography', name: ' Maria Chevskaya ' },
        { role: 'model', name: 'Eva' },
        { role: 'styling', name: '' },
        { role: 'hair & make-up', name: '   ' },
      ])
    ).toEqual([
      { role: 'photography', name: 'maria chevskaya' },
      { role: 'model', name: 'eva' },
    ])
  })

  it('ignores malformed storage values', () => {
    expect(normalizeCredits(null)).toEqual([])
    expect(normalizeCredits('photography')).toEqual([])
    expect(normalizeCredits([null, 42, { role: 7, name: 'x' }, { name: 'no role' }, { role: '', name: 'x' }])).toEqual([])
  })

  it('suggests the four studio roles with only the photographer filled in', () => {
    expect(DEFAULT_CREDITS.map((c) => c.role)).toEqual(['photography', 'model', 'styling', 'hair & make-up'])
    expect(normalizeCredits(DEFAULT_CREDITS)).toEqual([{ role: 'photography', name: 'maria chevskaya' }])
  })
})

describe('orderStoryPhotos', () => {
  it('sorts join rows by position then photo id', () => {
    expect(
      orderStoryPhotos([
        { photo_id: 'c', position: 1 },
        { photo_id: 'b', position: 0 },
        { photo_id: 'a', position: 1 },
      ])
    ).toEqual(['b', 'a', 'c'])
  })
})
