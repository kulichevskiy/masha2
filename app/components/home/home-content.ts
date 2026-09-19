// Reads the editable half of the home story: the copy from `home_story` and
// the frames Maria pinned to a slot. Pinned frames win; every slot she left
// alone keeps taking its photograph from the top of the feed, the way the page
// was built (see lib/home-story-photos.ts).

import { createClient } from '@/lib/supabase/server'
import {
  normaliseStoryContent,
  type HomeStoryContent,
  type StoryPhoto,
} from '@/lib/home-story-content'
import type { HomeFrame } from '@/lib/home-story-photos'

export async function loadHomeContent(): Promise<HomeStoryContent> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('home_story').select('content').limit(1).maybeSingle()

  if (error) console.error('Error fetching home story content:', error)
  return normaliseStoryContent(data?.content)
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
