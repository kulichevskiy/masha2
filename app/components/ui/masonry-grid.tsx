import { createClient } from "@/lib/supabase/server"
import type { PhotoPage } from "@/lib/photo-pages"
import { MEDIA_COLUMNS, toLightboxPhoto } from "@/lib/lightbox-media"
import { PhotoLightboxGrid } from "./photo-lightbox"

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

  // Fetch media tagged onto this section, ordered by position. `contains`
  // maps to `pages @> {page}` — the item appears here when the section is one
  // of its pages. RLS already hides rows with an empty pages array.
  const { data: photos, error } = await supabase
    .from('photos')
    .select(MEDIA_COLUMNS)
    .contains('pages', [page])
    .order('position', { ascending: true })
    .order('id', { ascending: true })

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

  // Public URLs and intrinsic dimensions come from the shared mapper so a
  // photograph renders identically here and on an editorial story page.
  const photosWithUrls = photos.map((photo) => toLightboxPhoto(supabase, photo))

  return (
    <PhotoLightboxGrid photos={photosWithUrls} columnsClassName={COLUMNS} />
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
