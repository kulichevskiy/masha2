// The home page tells Maria's story in eight image-led sections (design
// variant C). Each section needs a fixed number of frames; unless a frame is
// pinned in admin, those frames come from the same feeds the section pages
// render, taken from the top of each feed in admin order. So the first
// portraits in /portraits open the page, the first kids frame sits in the
// "people" triptych, the first three editorial frames fill the editorial row —
// Maria curates the home page by reordering the feeds.
//
// This module is the pure slot assignment. Fetching and URL resolution live in
// app/components/home/home-photos.ts so the layout can be unit-tested on plain
// arrays.

export type HomeFrame = {
  id: string
  src: string
  alt: string
  width: number
  height: number
}

export type HomeVideoFrame = HomeFrame & {
  videoSrc: string
  durationSeconds: number
}

export type HomeCategory = 'portraits' | 'kids' | 'editorial'

export type HomePhotoSlots = {
  hero: HomeFrame | null
  // Triptych: two portraits around one kids frame.
  people: (HomeFrame | null)[]
  experience: HomeFrame | null
  // Three frames per category: portraits, kids, editorial.
  work: Record<HomeCategory, HomeFrame[]>
  video: HomeVideoFrame | null
  workshops: HomeFrame | null
  invitation: HomeFrame | null
}

// How many portraits the story consumes before the work rows — hero (1),
// people (2), experience (1). The work row then takes three, followed by
// workshops and invitation.
const PORTRAIT_ORDER = {
  hero: 0,
  peopleLeft: 1,
  peopleRight: 2,
  experience: 3,
  work: 4, // 4..6
  workshops: 7,
  invitation: 8,
} as const

const KIDS_ORDER = {
  people: 0,
  work: 1, // 1..3
} as const

// The editorial row is the only place the story shows editorial work, so it
// simply takes the top of that feed. An empty feed leaves the row without
// frames — nothing stands in for it.
const EDITORIAL_ORDER = {
  work: 0, // 0..2
} as const

function at<T>(list: T[], index: number): T | null {
  return list[index] ?? null
}

function slice<T>(list: T[], start: number, count: number): T[] {
  return list.slice(start, start + count)
}

export function assignHomePhotos(feeds: {
  portraits: HomeFrame[]
  kids: HomeFrame[]
  editorial: HomeFrame[]
  videos: HomeVideoFrame[]
}): HomePhotoSlots {
  const { portraits, kids, editorial, videos } = feeds
  return {
    hero: at(portraits, PORTRAIT_ORDER.hero),
    people: [
      at(portraits, PORTRAIT_ORDER.peopleLeft),
      at(kids, KIDS_ORDER.people),
      at(portraits, PORTRAIT_ORDER.peopleRight),
    ],
    experience: at(portraits, PORTRAIT_ORDER.experience),
    work: {
      portraits: slice(portraits, PORTRAIT_ORDER.work, 3),
      kids: slice(kids, KIDS_ORDER.work, 3),
      editorial: slice(editorial, EDITORIAL_ORDER.work, 3),
    },
    video: at(videos, 0),
    workshops: at(portraits, PORTRAIT_ORDER.workshops),
    invitation: at(portraits, PORTRAIT_ORDER.invitation),
  }
}

// mm:ss for the "video · 00:42" label. Mirrors the feed's badge format.
export function formatVideoDuration(durationSeconds: number): string {
  const seconds = Math.max(0, Math.round(durationSeconds))
  const minutes = Math.floor(seconds / 60)
  return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}
