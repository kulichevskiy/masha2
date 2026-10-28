// Reads for the public editorial pages. Everything goes through the caller's
// Supabase client, so row level security decides what a reader sees: anon
// gets visible stories, their join rows, and only the photos that are still
// tagged onto a public section. The helpers then reduce that to the stories
// worth rendering and the media rows behind them.

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  normalizeCredits,
  orderStoryPhotos,
  renderableStories,
  type StoryCredit,
  type StorySummary,
} from './editorial-stories'
import { MEDIA_COLUMNS, type MediaRow } from './lightbox-media'
import type { Database } from './supabase/database.types'

export type PublicStory = StorySummary & {
  subtitle: string
  credits: StoryCredit[]
}

export type PublicStories = {
  stories: PublicStory[]
  photos: Map<string, MediaRow>
}

type Client = SupabaseClient<Database>

const STORY_COLUMNS = 'id, slug, title, subtitle, credits, cover_photo_id, position, editorial_story_photos (photo_id, position)'

// Visible stories with at least one readable photo, in feed order, plus the
// media rows for every photo they reference. `visible` is filtered here as
// well as by RLS: the admin policy lets a signed-in owner read hidden rows,
// and the public pages must still hide them from her. Throws on a database
// error so the page's error boundary shows instead of an empty section.
export async function loadPublicStories(supabase: Client): Promise<PublicStories> {
  const { data: rows, error } = await supabase
    .from('editorial_stories')
    .select(STORY_COLUMNS)
    .eq('visible', true)
    .order('position', { ascending: true })
    .order('id', { ascending: true })
  if (error) throw new Error(`Failed to load stories: ${error.message}`)

  const photoIds = new Set<string>()
  for (const row of rows ?? []) {
    for (const join of row.editorial_story_photos) photoIds.add(join.photo_id)
  }
  const photos = await loadMedia(supabase, [...photoIds])

  const stories = (rows ?? []).map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle,
    credits: normalizeCredits(row.credits),
    position: row.position,
    coverPhotoId: row.cover_photo_id,
    photoIds: orderStoryPhotos(row.editorial_story_photos).filter((id) => photos.has(id)),
  }))

  return { stories: renderableStories(stories), photos }
}

async function loadMedia(supabase: Client, ids: string[]): Promise<Map<string, MediaRow>> {
  if (ids.length === 0) return new Map()
  const { data, error } = await supabase.from('photos').select(MEDIA_COLUMNS).in('id', ids)
  if (error) throw new Error(`Failed to load story photos: ${error.message}`)
  return new Map((data ?? []).map((photo) => [photo.id, photo]))
}
