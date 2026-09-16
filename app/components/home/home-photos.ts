// Server-side loader for the home story frames. One query pulls every public
// media item across the three sections, in the same position order the feeds
// use; the rows are split per section and handed to the pure slot assignment
// in lib/home-story-photos.ts.

import { createClient } from '@/lib/supabase/server'
import { resolveImageDimensions } from '@/lib/image-dimensions'
import {
  assignHomePhotos,
  type HomeFrame,
  type HomePhotoSlots,
  type HomeVideoFrame,
} from '@/lib/home-story-photos'

const EMPTY_SLOTS: HomePhotoSlots = {
  hero: null,
  people: [null, null, null],
  experience: null,
  work: { portraits: [], kids: [], editorial: [] },
  video: null,
  workshops: null,
  invitation: null,
}

export async function loadHomePhotos(): Promise<HomePhotoSlots> {
  const supabase = await createClient()

  const { data: rows, error } = await supabase
    .from('photos')
    .select('id, kind, storage_path, poster_path, duration_seconds, title, alt_text, pages, width, height')
    .overlaps('pages', ['portraits', 'kids', 'video'])
    .order('position', { ascending: true })
    .order('id', { ascending: true })

  if (error || !rows) {
    if (error) console.error('Error fetching home photos:', error)
    return EMPTY_SLOTS
  }

  const portraits: HomeFrame[] = []
  const kids: HomeFrame[] = []
  const videos: HomeVideoFrame[] = []

  for (const row of rows) {
    const isVideo = row.kind === 'video'
    const alt = row.alt_text || row.title || ''
    const dimensions = resolveImageDimensions(row.width, row.height)

    if (isVideo) {
      if (!row.poster_path || !row.pages.includes('video')) continue
      const { data: poster } = supabase.storage.from('videos').getPublicUrl(row.poster_path)
      const { data: video } = supabase.storage.from('videos').getPublicUrl(row.storage_path)
      videos.push({
        id: row.id,
        src: poster.publicUrl,
        videoSrc: video.publicUrl,
        alt,
        durationSeconds: row.duration_seconds ?? 0,
        ...dimensions,
      })
      continue
    }

    const { data: image } = supabase.storage.from('photos').getPublicUrl(row.storage_path)
    const frame: HomeFrame = { id: row.id, src: image.publicUrl, alt, ...dimensions }
    // A photo tagged onto both sections appears in whichever feed is read
    // first; the assignment never reuses an id within a feed.
    if (row.pages.includes('portraits')) portraits.push(frame)
    else if (row.pages.includes('kids')) kids.push(frame)
  }

  return assignHomePhotos({ portraits, kids, videos })
}
