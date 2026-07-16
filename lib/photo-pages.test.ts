import { describe, it, expect } from 'vitest'
import { togglePhotoPage, PHOTO_PAGES } from './photo-pages'

describe('togglePhotoPage', () => {
  it('adds a section to an empty (hidden) photo', () => {
    expect(togglePhotoPage([], 'portraits')).toEqual(['portraits'])
  })

  it('removes a section, hiding the photo when it was the only one', () => {
    expect(togglePhotoPage(['portraits'], 'portraits')).toEqual([])
  })

  it('removes one section while keeping the others', () => {
    expect(togglePhotoPage(['portraits', 'kids'], 'portraits')).toEqual(['kids'])
  })

  it('keeps canonical PHOTO_PAGES order regardless of add order', () => {
    // Add kids first, then portraits — result must still be [portraits, kids].
    const afterKids = togglePhotoPage([], 'kids')
    expect(togglePhotoPage(afterKids, 'portraits')).toEqual(['portraits', 'kids'])
  })

  it('normalises order even if the incoming array is out of order', () => {
    expect(togglePhotoPage(['kids'], 'portraits')).toEqual([...PHOTO_PAGES])
  })
})
