import { describe, it, expect } from 'vitest'
import { assignHomePhotos, formatVideoDuration, type HomeFrame } from './home-story-photos'

const frame = (id: string): HomeFrame => ({
  id,
  src: `https://cdn.test/${id}.jpg`,
  alt: id,
  width: 800,
  height: 1000,
})

const portraits = Array.from({ length: 14 }, (_, i) => frame(`p${i}`))
const kids = Array.from({ length: 6 }, (_, i) => frame(`k${i}`))
const editorial = Array.from({ length: 5 }, (_, i) => frame(`e${i}`))
const video = { ...frame('v0'), videoSrc: 'https://cdn.test/v0.mp4', durationSeconds: 42 }

describe('assignHomePhotos', () => {
  it('fills every slot from the top of each feed, in admin order', () => {
    const slots = assignHomePhotos({ portraits, kids, editorial, videos: [video] })

    expect(slots.hero?.id).toBe('p0')
    expect(slots.people.map((f) => f?.id)).toEqual(['p1', 'k0', 'p2'])
    expect(slots.experience?.id).toBe('p3')
    expect(slots.work.portraits.map((f) => f.id)).toEqual(['p4', 'p5', 'p6'])
    expect(slots.work.kids.map((f) => f.id)).toEqual(['k1', 'k2', 'k3'])
    expect(slots.work.editorial.map((f) => f.id)).toEqual(['e0', 'e1', 'e2'])
    expect(slots.video?.id).toBe('v0')
    expect(slots.workshops?.id).toBe('p7')
    expect(slots.invitation?.id).toBe('p8')
  })

  it('never reuses a frame across slots', () => {
    const slots = assignHomePhotos({ portraits, kids, editorial, videos: [video] })
    const ids = [
      slots.hero,
      ...slots.people,
      slots.experience,
      ...slots.work.portraits,
      ...slots.work.kids,
      ...slots.work.editorial,
      slots.workshops,
      slots.invitation,
    ]
      .filter((f): f is HomeFrame => f !== null)
      .map((f) => f.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('degrades to nulls and short rows when a feed is thin', () => {
    const slots = assignHomePhotos({ portraits: portraits.slice(0, 5), kids: [], editorial: [], videos: [] })

    expect(slots.hero?.id).toBe('p0')
    expect(slots.people.map((f) => f?.id ?? null)).toEqual(['p1', null, 'p2'])
    expect(slots.work.portraits.map((f) => f.id)).toEqual(['p4'])
    expect(slots.work.kids).toEqual([])
    expect(slots.work.editorial).toEqual([])
    expect(slots.video).toBeNull()
    expect(slots.workshops).toBeNull()
    expect(slots.invitation).toBeNull()
  })
})

describe('assignHomePhotos — editorial row', () => {
  it('shows only what the editorial feed holds, never a portrait in its place', () => {
    const slots = assignHomePhotos({ portraits, kids, editorial: editorial.slice(0, 1), videos: [] })
    expect(slots.work.editorial.map((f) => f.id)).toEqual(['e0'])
  })
})

describe('formatVideoDuration', () => {
  it('renders mm:ss with two-digit minutes', () => {
    expect(formatVideoDuration(42)).toBe('00:42')
    expect(formatVideoDuration(75.4)).toBe('01:15')
    expect(formatVideoDuration(0)).toBe('00:00')
  })
})
