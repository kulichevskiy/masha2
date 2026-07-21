import Image from "next/image"
import { createClient } from "@/lib/supabase/server"
import { resolveImageDimensions } from "@/lib/image-dimensions"
import { PHOTO_IMAGE_QUALITY } from "@/lib/image-config"
import type { PhotoPage } from "@/lib/photo-pages"

// Placeholder aspect ratios for the loading skeleton — a fixed spread of
// portrait/square shapes so the columns read as a photo feed, not a grid of
// identical boxes. Never rendered against real data.
const SKELETON_RATIOS = [
  "aspect-[4/5]",
  "aspect-square",
  "aspect-[3/4]",
  "aspect-[4/5]",
  "aspect-[2/3]",
  "aspect-square",
  "aspect-[3/4]",
  "aspect-[4/5]",
  "aspect-[5/6]",
]

// Column layout shared by the grid and its skeleton so both stay in visual sync.
// CSS multi-column masonry: images flow top-to-bottom within a column, then to
// the next. `gap-4` sets the horizontal column gap; per-item `mb-4` sets the
// vertical rhythm; `break-inside-avoid` keeps a photo from splitting across
// columns.
const COLUMNS = "columns-1 md:columns-2 lg:columns-3 gap-4"

export async function MasonryGrid({ page = 'portraits' }: { page?: PhotoPage }) {
  const supabase = await createClient()

  // Fetch photos tagged onto this section, ordered by position. `contains`
  // maps to `pages @> {page}` — the photo appears here when the section is one
  // of its pages. RLS already hides rows with an empty pages array.
  const { data: photos, error } = await supabase
    .from('photos')
    .select('id, storage_path, title, alt_text, position, width, height')
    .contains('pages', [page])
    .order('position', { ascending: true })

  if (error) {
    console.error('Error fetching photos:', error)
    return (
      <div className="w-full text-center py-10 text-gray-500">
        Failed to load photos
      </div>
    )
  }

  if (!photos || photos.length === 0) {
    return (
      <div className="w-full text-center py-10 text-gray-500">
        No photos found
      </div>
    )
  }

  // Build photo objects with public URLs and the intrinsic dimensions used to
  // render each image at its natural aspect ratio (no cropping).
  const photosWithUrls = photos.map((photo) => {
    const { data: urlData } = supabase.storage
      .from('photos')
      .getPublicUrl(photo.storage_path)

    return {
      id: photo.id,
      src: urlData.publicUrl,
      alt: photo.alt_text || photo.title || photo.storage_path,
      ...resolveImageDimensions(photo.width, photo.height),
    }
  })

  return (
    <div className="w-full">
      <div className={COLUMNS}>
        {photosWithUrls.map((photo) => (
          <div
            key={photo.id}
            className="relative mb-4 overflow-hidden bg-gray-100 break-inside-avoid group"
          >
            <Image
              src={photo.src}
              alt={photo.alt}
              width={photo.width}
              height={photo.height}
              quality={PHOTO_IMAGE_QUALITY}
              className="block h-auto w-full transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>
        ))}
      </div>
    </div>
  )
}

// Loading placeholder mirroring the grid's column layout, with varied aspect
// ratios so it reads as a photo feed. Exported so the page shells share one
// definition instead of duplicating it.
export function MasonryGridSkeleton() {
  return (
    <div className="w-full">
      <div className={COLUMNS}>
        {SKELETON_RATIOS.map((ratio, i) => (
          <div
            key={i}
            className={`mb-4 break-inside-avoid animate-pulse bg-gray-200 ${ratio}`}
          />
        ))}
      </div>
    </div>
  )
}
