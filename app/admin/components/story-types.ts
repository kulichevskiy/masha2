import type { Tables } from '@/lib/supabase/database.types'

// A story as the admin tab receives it: the row plus its photo ids in order.
export type AdminStory = Tables<'editorial_stories'> & { photo_ids: string[] }

// The photographs a story may use — everything tagged onto the editorial
// section — with just enough to draw a thumbnail.
export type CataloguePhoto = Pick<Tables<'photos'>, 'id' | 'kind' | 'storage_path' | 'poster_path' | 'title' | 'alt_text'>

export function thumbnailUrl(supabaseUrl: string, photo: CataloguePhoto): string {
  const bucket = photo.kind === 'video' ? 'videos' : 'photos'
  const path = photo.kind === 'video' ? photo.poster_path ?? photo.storage_path : photo.storage_path
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`
}
