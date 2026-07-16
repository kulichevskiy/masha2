import Image from "next/image"
import { createClient } from "@/lib/supabase/server"
import type { PhotoPage } from "@/lib/photo-pages"

// Row span patterns for visual variety in the masonry grid
const ROW_SPAN_PATTERNS = [
  "row-span-2",
  "row-span-2", 
  "row-span-3",
  "row-span-2",
  "row-span-2",
  "row-span-2",
  "row-span-3",
  "row-span-3",
  "row-span-2",
  "row-span-2",
]

export async function MasonryGrid({ page = 'portraits' }: { page?: PhotoPage }) {
  const supabase = await createClient()

  // Fetch photos tagged onto this section, ordered by position. `contains`
  // maps to `pages @> {page}` — the photo appears here when the section is one
  // of its pages. RLS already hides rows with an empty pages array.
  const { data: photos, error } = await supabase
    .from('photos')
    .select('id, storage_path, title, alt_text, position')
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

  // Build photo objects with public URLs
  const photosWithUrls = photos.map((photo, index) => {
    const { data: urlData } = supabase.storage
      .from('photos')
      .getPublicUrl(photo.storage_path)

    return {
      id: photo.id,
      src: urlData.publicUrl,
      alt: photo.alt_text || photo.title || photo.storage_path,
      className: ROW_SPAN_PATTERNS[index % ROW_SPAN_PATTERNS.length],
    }
  })

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-[200px]">
        {photosWithUrls.map((photo) => (
          <div
            key={photo.id}
            className={`relative overflow-hidden bg-gray-100 ${photo.className} group cursor-pointer`}
          >
            <Image
              src={photo.src}
              alt={photo.alt}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>
        ))}
      </div>
    </div>
  )
}
