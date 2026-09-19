// Reads the editable half of the home story: the copy from `home_story` and
// the frames Maria pinned to a slot. Pinned frames win; every slot she left
// alone keeps taking its photograph from the top of the feed, the way the page
// was built (see lib/home-story-photos.ts).
//
// The two readers below differ on purpose. The public page must always render,
// so a failed query falls back to the shipped copy. The admin editor must not:
// it would load those defaults into the form, and the next Save would write
// them over whatever is actually stored. There the error travels to the caller.

import { createClient } from '@/lib/supabase/server'
import {
  normaliseStoryContent,
  type HomeStoryContent,
  type StoryPhoto,
} from '@/lib/home-story-content'
import type { HomeFrame } from '@/lib/home-story-photos'

export type HomeContentRead =
  | { ok: true; content: HomeStoryContent }
  | { ok: false; error: string }

async function readHomeStory(): Promise<HomeContentRead> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('home_story').select('content').limit(1).maybeSingle()

  if (error) return { ok: false, error: error.message }
  // No row means the editor has nothing to write back to, which the save would
  // reject anyway — so it is an error here rather than an empty form.
  if (!data) return { ok: false, error: 'Home story row not found' }

  return { ok: true, content: normaliseStoryContent(data.content) }
}

// The public page: never fails, falls back to the copy shipped in the code.
export async function loadHomeContent(): Promise<HomeStoryContent> {
  const read = await readHomeStory()
  if (read.ok) return read.content

  console.error('Error fetching home story content:', read.error)
  return normaliseStoryContent(null)
}

// The admin editor: the caller has to handle the failure and keep the form off
// the screen, so a transient outage cannot turn into a blank page on Save.
export async function loadHomeContentForAdmin(): Promise<HomeContentRead> {
  return readHomeStory()
}

export function publicPhotoUrl(supabaseUrl: string, path: string): string {
  return `${supabaseUrl}/storage/v1/object/public/photos/${path}`
}

// One slot: the pinned photograph when there is one, the feed frame otherwise.
export function resolveFrame(photo: StoryPhoto | undefined, fallback: HomeFrame | null): HomeFrame | null {
  if (!photo?.path) {
    if (!fallback) return null
    return photo?.alt ? { ...fallback, alt: photo.alt } : fallback
  }
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  return {
    id: photo.path,
    src: publicPhotoUrl(base, photo.path),
    alt: photo.alt,
    width: fallback?.width ?? 1600,
    height: fallback?.height ?? 2000,
  }
}
