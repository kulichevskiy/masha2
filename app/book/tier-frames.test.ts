import { describe, it, expect } from 'vitest'
import { assignTierFrames, isPricedTier } from './tier-frames'

const frame = (id: string) => ({ id, src: `/${id}.jpg`, alt: id, width: 800, height: 1000 })

describe('assignTierFrames', () => {
  it('keeps a pinned frame and hands the portraits feed to the rest, in order', () => {
    const frames = assignTierFrames(
      [
        { id: 'mini', photo_path: null },
        { id: 'signature', photo_path: 'tiers/s.jpg' },
        { id: 'extended', photo_path: null },
        { id: 'brand', photo_path: null },
      ],
      (path) => frame(path),
      [frame('p1'), frame('p2')]
    )
    expect(frames.mini?.id).toBe('p1')
    expect(frames.signature?.id).toBe('tiers/s.jpg')
    expect(frames.extended?.id).toBe('p2')
    // the feed ran out: the row renders without a photograph
    expect(frames.brand).toBeNull()
  })
})

describe('isPricedTier', () => {
  it('tells a price from a request', () => {
    expect(isPricedTier('300 €')).toBe(true)
    expect(isPricedTier('from 450 €')).toBe(true)
    expect(isPricedTier('upon request')).toBe(false)
  })
})
