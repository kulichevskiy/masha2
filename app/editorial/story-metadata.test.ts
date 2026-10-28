/**
 * Story page metadata (spec R3): the story's title and subtitle with a
 * canonical story URL; the section's copy and canonical when the slug is
 * unknown; a blank subtitle falls back to the section description.
 */
import { describe, expect, it } from 'vitest'
import { storyMetadata } from './story-metadata'
import { EDITORIAL_DESCRIPTION } from './description'
import type { PublicStories } from '@/lib/editorial-stories-data'

const data: PublicStories = {
  photos: new Map(),
  stories: [
    { id: 's1', slug: 'soft-structure', title: 'soft structure', subtitle: 'Soft fabric.', credits: [], position: 0, coverPhotoId: null, photoIds: ['p1'] },
    { id: 's2', slug: 'white-noise', title: 'white noise', subtitle: '', credits: [], position: 1, coverPhotoId: null, photoIds: ['p2'] },
  ],
}

describe('storyMetadata', () => {
  it('uses the story title, subtitle and canonical URL', () => {
    const meta = storyMetadata(data, 'soft-structure')
    expect(meta.title).toBe('soft structure')
    expect(meta.description).toBe('Soft fabric.')
    expect(meta.alternates?.canonical).toBe('/editorial/soft-structure')
    expect(meta.openGraph?.title).toBe('soft structure | Maria Chevskaya')
    expect(meta.twitter?.title).toBe('soft structure | Maria Chevskaya')
  })

  it('falls back to the section description when the subtitle is blank', () => {
    expect(storyMetadata(data, 'white-noise').description).toBe(EDITORIAL_DESCRIPTION)
  })

  it('describes the section for an unknown slug', () => {
    const meta = storyMetadata(data, 'missing')
    expect(meta.title).toBe('Editorial')
    expect(meta.description).toBe(EDITORIAL_DESCRIPTION)
    expect(meta.alternates?.canonical).toBe('/editorial')
  })
})
