// The public sections a photo can be tagged onto (photos.pages[]). Keep in sync
// with the photos_pages_valid check constraint in the DB. Empty pages = hidden.
export const PHOTO_PAGES = ['portraits', 'kids'] as const

export type PhotoPage = (typeof PHOTO_PAGES)[number]

// Admin-facing labels for each section.
export const PHOTO_PAGE_LABELS: Record<PhotoPage, string> = {
  portraits: 'Portraits',
  kids: 'Kids',
}

// Toggle a section on/off for a photo, returning the next pages array. The
// result stays in canonical PHOTO_PAGES order regardless of click order, so the
// stored value is stable (and comparable) no matter how the admin got there.
// Building it by filtering PHOTO_PAGES also drops any unknown incoming values,
// keeping the array a clean subset of the known sections.
export function togglePhotoPage(pages: string[], page: PhotoPage): PhotoPage[] {
  const has = pages.includes(page)
  return PHOTO_PAGES.filter((p) => (p === page ? !has : pages.includes(p)))
}
