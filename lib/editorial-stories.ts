// Shared vocabulary for editorial stories — the pure helpers the public pages,
// the admin tab and the server actions all lean on. Nothing here touches the
// database; callers hand in rows and get decisions back.

export const STORY_SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/
export const STORY_SLUG_MAX_LENGTH = 80

export type StoryCredit = { role: string; name: string }

// A story as the public pages need it: stored columns plus the readable photo
// ids in sequence. `photoIds` already excludes photos the current reader may
// not see (RLS filters the join for anon), so an empty list means "nothing to
// show" for this reader.
export type StorySummary = {
  id: string
  slug: string
  title: string
  position: number
  coverPhotoId: string | null
  photoIds: string[]
}

// Roles the editor pre-fills on a brand-new story. Names stay empty except
// the photographer's own; blank-name rows are dropped on save.
export const DEFAULT_CREDITS: StoryCredit[] = [
  { role: 'photography', name: 'maria chevskaya' },
  { role: 'model', name: '' },
  { role: 'styling', name: '' },
  { role: 'hair & make-up', name: '' },
]

const CYRILLIC: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y',
  к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
  х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
}

// Turn a title into a URL slug: lowercase ASCII words joined by single hyphens.
// Cyrillic is transliterated, accents are stripped, everything else becomes a
// separator. An input with no usable characters yields `story`.
export function slugify(input: string): string {
  const ascii = input
    .toLowerCase()
    .split('')
    .map((char) => CYRILLIC[char] ?? char)
    .join('')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
  const slug = ascii
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, STORY_SLUG_MAX_LENGTH)
    .replace(/-+$/g, '')
  return slug || 'story'
}

// Make `base` unique among `taken` by appending -2, -3, … Collisions are rare
// (two stories with the same working title), so a linear probe is fine.
export function uniqueSlug(base: string, taken: Iterable<string>): string {
  const set = new Set(taken)
  if (!set.has(base)) return base
  for (let n = 2; ; n += 1) {
    const candidate = `${base}-${n}`.slice(0, STORY_SLUG_MAX_LENGTH)
    if (!set.has(candidate)) return candidate
  }
}

export function isValidSlug(slug: string): boolean {
  return slug.length <= STORY_SLUG_MAX_LENGTH && STORY_SLUG_PATTERN.test(slug)
}

// Which photo fronts the story in the feed: the chosen cover when the reader
// can see it, otherwise the first photo of the sequence. Null for a story with
// nothing readable.
export function pickCover(story: Pick<StorySummary, 'coverPhotoId' | 'photoIds'>): string | null {
  if (story.coverPhotoId && story.photoIds.includes(story.coverPhotoId)) return story.coverPhotoId
  return story.photoIds[0] ?? null
}

// The stories the public feed shows, in feed order: visible rows that have at
// least one readable photo. Visibility itself is enforced by RLS; this keeps
// out the stories that would render as an empty page.
export function renderableStories<T extends Pick<StorySummary, 'photoIds' | 'position' | 'id'>>(stories: T[]): T[] {
  return [...stories]
    .filter((story) => story.photoIds.length > 0)
    .sort((a, b) => a.position - b.position || a.id.localeCompare(b.id))
}

// Previous and next story around `slug` in an ordered list, wrapping around.
// A single story is its own neighbour on both sides; an unknown slug has none.
export function neighbours<T extends { slug: string }>(ordered: T[], slug: string): { previous: T | null; next: T | null } {
  const index = ordered.findIndex((story) => story.slug === slug)
  if (index === -1) return { previous: null, next: null }
  const count = ordered.length
  return {
    previous: ordered[(index - 1 + count) % count],
    next: ordered[(index + 1) % count],
  }
}

// Read the stored credits jsonb defensively: keep well-formed {role, name}
// string pairs with a non-blank role, trimmed and lowercased for display. Rows
// whose name is blank are dropped — an unfilled suggestion is not a credit.
export function normalizeCredits(value: unknown): StoryCredit[] {
  if (!Array.isArray(value)) return []
  const credits: StoryCredit[] = []
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') continue
    const { role, name } = entry as Record<string, unknown>
    if (typeof role !== 'string' || typeof name !== 'string') continue
    const cleanRole = role.trim().toLowerCase()
    const cleanName = name.trim().toLowerCase()
    if (!cleanRole || !cleanName) continue
    credits.push({ role: cleanRole, name: cleanName })
  }
  return credits
}

// Order the join rows of one story into a photo id sequence.
export function orderStoryPhotos(rows: { photo_id: string; position: number }[]): string[] {
  return [...rows]
    .sort((a, b) => a.position - b.position || a.photo_id.localeCompare(b.photo_id))
    .map((row) => row.photo_id)
}
