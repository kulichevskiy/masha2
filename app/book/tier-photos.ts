// Server-side loader for the frames beside the booking tiers: resolves pinned
// storage paths to public URLs and, when any tier has no frame of its own,
// reads the top of the portraits feed to fill the gaps (see tier-frames.ts).

import { createClient } from '@/lib/supabase/server'
import { FALLBACK_DIMENSIONS, resolveImageDimensions } from '@/lib/image-dimensions'
import type { HomeFrame } from '@/lib/home-story-photos'
import { assignTierFrames, type TierPhotoSource } from './tier-frames'

export async function loadTierFrames(
  tiers: TierPhotoSource[]
): Promise<Record<string, HomeFrame | null>> {
  const supabase = await createClient()
  const pinned = (path: string): HomeFrame => {
    const { data } = supabase.storage.from('photos').getPublicUrl(path)
    return { id: path, src: data.publicUrl, alt: '', ...FALLBACK_DIMENSIONS }
  }

  const missing = tiers.filter((tier) => !tier.photo_path).length
  let portraits: HomeFrame[] = []
  if (missing > 0) {
    const { data: rows, error } = await supabase
      .from('photos')
      .select('id, storage_path, title, alt_text, width, height')
      .eq('kind', 'photo')
      .overlaps('pages', ['portraits'])
      .order('position', { ascending: true })
      .order('id', { ascending: true })
      .limit(missing)
    if (error) console.error('Error fetching tier frames:', error)
    portraits = (rows ?? []).map((row) => {
      const { data } = supabase.storage.from('photos').getPublicUrl(row.storage_path)
      return {
        id: row.id,
        src: data.publicUrl,
        alt: row.alt_text || row.title || '',
        ...resolveImageDimensions(row.width, row.height),
      }
    })
  }

  return assignTierFrames(tiers, pinned, portraits)
}
