import { describe, it, expect } from 'vitest'
import { matchesFilter, reassignSlots, PHOTO_FILTERS } from './photo-filter'

describe('matchesFilter', () => {
  it('"all" matches every photo', () => {
    expect(matchesFilter([], 'all')).toBe(true)
    expect(matchesFilter(['portraits'], 'all')).toBe(true)
    expect(matchesFilter(['portraits', 'kids'], 'all')).toBe(true)
  })

  it('"hidden" matches only photos with an empty pages array', () => {
    expect(matchesFilter([], 'hidden')).toBe(true)
    expect(matchesFilter(['portraits'], 'hidden')).toBe(false)
  })

  it('a section filter matches photos tagged onto that section', () => {
    expect(matchesFilter(['portraits'], 'portraits')).toBe(true)
    expect(matchesFilter(['portraits', 'kids'], 'kids')).toBe(true)
    expect(matchesFilter(['portraits'], 'kids')).toBe(false)
    expect(matchesFilter([], 'portraits')).toBe(false)
  })

  it('exposes the four filters in display order', () => {
    expect(PHOTO_FILTERS).toEqual(['all', 'portraits', 'kids', 'hidden'])
  })
})

describe('reassignSlots', () => {
  it('reassigns the subset over its own position slots, leaving outsiders untouched', () => {
    // a=1 b=2 c=3 d=4; filter picks b,d (slots 2,4); dragged to [d, b].
    const positions = new Map([
      ['a', 1],
      ['b', 2],
      ['c', 3],
      ['d', 4],
    ])
    const updates = reassignSlots(['d', 'b'], positions)
    // Slots [2,4] reassigned in new order: d→2, b→4. No update for a/c.
    expect(updates).toEqual([
      { id: 'd', position: 2 },
      { id: 'b', position: 4 },
    ])
  })

  it('renumbers the full set by its own slots (Все view)', () => {
    const positions = new Map([
      ['a', 1],
      ['b', 2],
      ['c', 3],
    ])
    const updates = reassignSlots(['c', 'a', 'b'], positions)
    expect(updates).toEqual([
      { id: 'c', position: 1 },
      { id: 'a', position: 2 },
      { id: 'b', position: 3 },
    ])
  })

  it('preserves the exact slot values even when they have gaps or are negative', () => {
    const positions = new Map([
      ['a', -1],
      ['b', 5],
    ])
    const updates = reassignSlots(['b', 'a'], positions)
    expect(updates).toEqual([
      { id: 'b', position: -1 },
      { id: 'a', position: 5 },
    ])
  })

  it('ignores ids missing from the position map', () => {
    const positions = new Map([['a', 1]])
    expect(reassignSlots(['ghost'], positions)).toEqual([])
  })
})
