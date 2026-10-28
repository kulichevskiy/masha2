// Turn a `photos` row into the item the lightbox grid renders: public URLs
// for the image (or the video and its poster) plus the intrinsic dimensions
// the layout reserves. Shared by the section feeds and the editorial story
// pages so a photograph looks the same wherever it appears.

import type { SupabaseClient } from '@supabase/supabase-js'
import { resolveImageDimensions } from './image-dimensions'
import type { LightboxPhoto } from '@/app/components/ui/photo-lightbox'

export type MediaRow = {
  id: string
  kind: string
  storage_path: string
  poster_path: string | null
  duration_seconds: number | null
  title: string | null
  alt_text: string | null
  width: number | null
  height: number | null
}

// The columns every public media query selects — one list so a new consumer
// cannot forget the poster or the dimensions.
export const MEDIA_COLUMNS = 'id, kind, storage_path, poster_path, duration_seconds, title, alt_text, position, width, height'

type Storage = Pick<SupabaseClient, 'storage'>

export function toLightboxPhoto(supabase: Storage, photo: MediaRow): LightboxPhoto {
  const alt = photo.alt_text || photo.title || photo.storage_path
  const dimensions = resolveImageDimensions(photo.width, photo.height)

  if (photo.kind === 'video') {
    return {
      id: photo.id,
      kind: 'video',
      src: publicUrl(supabase, 'videos', photo.poster_path ?? photo.storage_path),
      videoSrc: publicUrl(supabase, 'videos', photo.storage_path),
      alt,
      durationSeconds: photo.duration_seconds ?? 0,
      ...dimensions,
    }
  }

  return {
    id: photo.id,
    src: publicUrl(supabase, 'photos', photo.storage_path),
    alt,
    ...dimensions,
  }
}

function publicUrl(supabase: Storage, bucket: 'photos' | 'videos', path: string): string {
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
}
