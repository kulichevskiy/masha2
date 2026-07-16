// The admin Photos table can be narrowed to one section (or to hidden photos)
// via a top filter. This module carries the filter vocabulary and the two pure
// helpers the feature needs: `matchesFilter` (which rows show) and
// `reassignSlots` (how a drag-reorder within the filtered subset maps back to
// stored positions).

import { PHOTO_PAGES, PHOTO_PAGE_LABELS } from './photo-pages'

// Filter values shown across the top of the table, in display order. `all` and
// `hidden` bracket the per-section filters; `hidden` means an empty pages array.
export const PHOTO_FILTERS = ['all', ...PHOTO_PAGES, 'hidden'] as const

export type PhotoFilter = (typeof PHOTO_FILTERS)[number]

export const PHOTO_FILTER_LABELS: Record<PhotoFilter, string> = {
  all: 'Все',
  ...PHOTO_PAGE_LABELS,
  hidden: 'Скрытые',
}

// Whether a photo's pages array belongs in the given filter view.
export function matchesFilter(pages: string[], filter: PhotoFilter): boolean {
  if (filter === 'all') return true
  if (filter === 'hidden') return pages.length === 0
  return pages.includes(filter)
}

// Reorder within a (possibly filtered) subset without disturbing photos outside
// it. The subset keeps the exact set of `position` slots it already occupies;
// those slots, sorted ascending, are handed out in the new visual order. So a
// reorder among the Kids photos only shuffles positions among Kids rows, and a
// reorder in the `all` view renumbers everything — both fall out of the same
// rule. Ids absent from `currentPositions` are dropped (nothing to move).
export function reassignSlots(
  orderedIds: string[],
  currentPositions: Map<string, number>
): { id: string; position: number }[] {
  const present = orderedIds.filter((id) => currentPositions.has(id))
  const slots = present
    .map((id) => currentPositions.get(id)!)
    .sort((a, b) => a - b)
  return present.map((id, i) => ({ id, position: slots[i] }))
}
