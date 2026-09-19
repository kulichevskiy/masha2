// The editable copy of the home story. One row in `home_story` holds a single
// `content` jsonb blob; everything in it is optional, and whatever is missing
// falls back to DEFAULTS below — the copy the page shipped with. So an empty
// table renders the page exactly as it reads today, and the admin only has to
// store what Maria actually changed.
//
// Shape notes:
//   heading — newlines are line breaks, so "portrait\nand editorial" keeps
//             "and" off the first line.
//   body    — a blank line starts a new paragraph.
//   photos  — a storage path in the `photos` bucket. An empty path means "take
//             the frame from the feed", which is the default curation (see
//             lib/home-story-photos.ts). `focus` is the point of the photograph
//             the crop keeps in view, in percent of its width and height — the
//             CSS object-position. Faces sit where the author says, not where
//             the centre of the frame happens to fall.

export type StoryFocus = {
  x: number
  y: number
}

export type StoryPhoto = {
  path: string
  alt: string
  focus: StoryFocus
}

export type StoryCategory = {
  title: string
  text: string
  cta: string
}

export type StorySection = {
  label: string
  heading: string
  body: string
  // The solid plate.
  cta: string
  // The underlined arrow link.
  link: string
  photos: StoryPhoto[]
}

export type HomeStoryContent = {
  hero: StorySection
  people: StorySection
  session: StorySection
  work: StorySection & { categories: StoryCategory[] }
  video: StorySection
  behind: StorySection
  workshops: StorySection
  invitation: StorySection
}

export type StoryKey = keyof HomeStoryContent

// An unpinned slot with the crop it shipped with.
function slot(x: number, y: number, alt = ''): StoryPhoto {
  return { path: '', alt, focus: { x, y } }
}

export const DEFAULT_CONTENT: HomeStoryContent = {
  hero: {
    label: 'berlin',
    heading: 'portrait\nand editorial\nphotographer',
    body: 'I photograph people — their character, presence and the way they connect with each other and themselves.',
    cta: 'Book a session',
    link: 'See the work',
    // The hero is full-bleed, so a phone only shows the middle of it. The face
    // in the opening frame sits in the left third, hence the left anchor;
    // on a desktop the frame is wider than the photo and x has no effect.
    photos: [slot(20, 30)],
  },
  people: {
    label: 'people',
    heading: "the setting changes every time. the attention doesn't",
    body:
      'Some sessions are just you, and some fill the room with a whole family. Some people stand in front of a ' +
      'camera for the first time, and some arrive knowing exactly what they want from it. Everyone gets the same ' +
      'attention.',
    cta: '',
    link: '',
    photos: [slot(50, 20), slot(50, 30), slot(50, 50)],
  },
  session: {
    label: 'the session',
    heading: 'just bring yourself',
    body:
      'The light, the frame and the timing are mine to look after. When a bit of direction helps you, I give it; ' +
      "when it doesn't, I stay quiet and let the moment do the work.\n\n" +
      'We take it slowly, in a studio, at your home or somewhere in Berlin that means something to you, with space ' +
      'to arrive into yourself before the camera starts to matter.',
    cta: '',
    link: 'See the sessions',
    photos: [slot(50, 50)],
  },
  work: {
    label: 'the work',
    heading: '',
    body: '',
    cta: '',
    link: '',
    photos: [],
    categories: [
      {
        title: 'Portraits',
        text: 'Personal portraits for moments of transition, inner shifts and quiet confidence.',
        cta: 'See portraits',
      },
      {
        title: 'Kids & Families',
        text: 'Children and families, photographed unhurried and in natural light, wherever you feel at home.',
        cta: 'See kids & families',
      },
      {
        title: 'Editorial',
        text: 'Editorial stories, model tests and long collaborations with magazines, artists and authors.',
        cta: 'See editorial',
      },
    ],
  },
  video: {
    // The label is built from the film's own duration.
    label: '',
    heading: 'your portrait, in motion',
    body:
      'A short cinematic film built around you: your gestures, your pace, the way you look at someone and the way ' +
      'you inhabit a moment.',
    cta: '',
    link: 'See video portraits',
    photos: [],
  },
  behind: {
    label: 'behind the camera',
    heading: "I'm Maria. I photograph people in Berlin",
    body:
      'My work moves between portraits, families and editorial commissions. Whatever brings you in front of the ' +
      'camera, the process is the same: collaborative, calm and attentive.',
    cta: '',
    link: '',
    photos: [slot(50, 20, 'Maria Chevskaya')],
  },
  workshops: {
    label: '',
    heading: 'workshops',
    body:
      'A few days in Berlin with a small group and a lot of time inside the frame — photographing people not as ' +
      'subjects, but as presences.',
    cta: '',
    link: 'See the workshop',
    photos: [slot(50, 35)],
  },
  invitation: {
    label: 'get in touch',
    heading: 'tell me a few words about yourself',
    body: '',
    cta: 'Book a session',
    link: 'Email me',
    photos: [slot(50, 40)],
  },
}

// A stored value only wins when it is a non-empty string — clearing a field in
// the admin sends null, which puts the shipped copy back.
function text(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() !== '' ? value : fallback
}

// A percentage along one axis of the frame; anything else keeps the default.
function axis(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.min(100, Math.max(0, value))
}

function focus(value: unknown, fallback: StoryFocus): StoryFocus {
  const stored = (value ?? {}) as Partial<StoryFocus>
  return { x: axis(stored.x, fallback.x), y: axis(stored.y, fallback.y) }
}

function photos(value: unknown, fallback: StoryPhoto[]): StoryPhoto[] {
  if (!Array.isArray(value)) return fallback
  // The slot count belongs to the layout, so the stored array is read
  // position by position and never resizes the section.
  return fallback.map((slot, index) => {
    const stored = value[index] as Partial<StoryPhoto> | undefined
    if (!stored || typeof stored !== 'object') return slot
    return {
      path: typeof stored.path === 'string' ? stored.path : slot.path,
      alt: typeof stored.alt === 'string' ? stored.alt : slot.alt,
      focus: focus(stored.focus, slot.focus),
    }
  })
}

function categories(value: unknown, fallback: StoryCategory[]): StoryCategory[] {
  if (!Array.isArray(value)) return fallback
  return fallback.map((slot, index) => {
    const stored = value[index] as Partial<StoryCategory> | undefined
    if (!stored || typeof stored !== 'object') return slot
    return {
      title: text(stored.title, slot.title),
      text: text(stored.text, slot.text),
      cta: text(stored.cta, slot.cta),
    }
  })
}

function section(value: unknown, fallback: StorySection): StorySection {
  const stored = (value ?? {}) as Partial<StorySection>
  return {
    label: text(stored.label, fallback.label),
    heading: text(stored.heading, fallback.heading),
    body: text(stored.body, fallback.body),
    cta: text(stored.cta, fallback.cta),
    link: text(stored.link, fallback.link),
    photos: photos(stored.photos, fallback.photos),
  }
}

// Turns whatever sits in the jsonb column into the full shape. Anything the
// blob is missing, malformed or blank comes back as the shipped copy.
export function normaliseStoryContent(value: unknown): HomeStoryContent {
  const stored = (value ?? {}) as Partial<Record<StoryKey, unknown>>
  const work = (stored.work ?? {}) as { categories?: unknown }
  return {
    hero: section(stored.hero, DEFAULT_CONTENT.hero),
    people: section(stored.people, DEFAULT_CONTENT.people),
    session: section(stored.session, DEFAULT_CONTENT.session),
    work: {
      ...section(stored.work, DEFAULT_CONTENT.work),
      categories: categories(work.categories, DEFAULT_CONTENT.work.categories),
    },
    video: section(stored.video, DEFAULT_CONTENT.video),
    behind: section(stored.behind, DEFAULT_CONTENT.behind),
    workshops: section(stored.workshops, DEFAULT_CONTENT.workshops),
    invitation: section(stored.invitation, DEFAULT_CONTENT.invitation),
  }
}

// The CSS object-position for a slot's photograph.
export function focusPosition(photo: StoryPhoto): string {
  return `${photo.focus.x}% ${photo.focus.y}%`
}

// "a\n\nb" → two paragraphs; "a\nb" → one paragraph on two lines.
export function paragraphs(body: string): string[] {
  return body
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean)
}

export function lines(heading: string): string[] {
  return heading.split('\n').map((line) => line.trim())
}
