'use client'

import { useState, useTransition, useEffect } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { reorderPhotos } from '../actions'
import { PhotoRow } from './photo-row'
import {
  PHOTO_FILTERS,
  PHOTO_FILTER_LABELS,
  matchesFilter,
  reassignSlots,
  type PhotoFilter,
} from '@/lib/photo-filter'
import type { Tables } from '@/lib/supabase/database.types'

type Photo = Tables<'photos'>

interface PhotosTableProps {
  photos: Photo[]
  supabaseUrl: string
}

export function PhotosTable({ photos: initialPhotos, supabaseUrl }: PhotosTableProps) {
  const [photos, setPhotos] = useState(initialPhotos)
  const [filter, setFilter] = useState<PhotoFilter>('all')
  const [, startTransition] = useTransition()

  // Sync photos when initialPhotos changes (e.g., after delete or revalidation)
  useEffect(() => {
    setPhotos(initialPhotos)
  }, [initialPhotos])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Only the rows in the active filter are shown and dragged. Photos outside
  // the filter keep their positions untouched by the reorder.
  const visiblePhotos = photos.filter((photo) => matchesFilter(photo.pages, filter))

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = visiblePhotos.findIndex((photo) => photo.id === active.id)
    const newIndex = visiblePhotos.findIndex((photo) => photo.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const orderedIds = arrayMove(visiblePhotos, oldIndex, newIndex).map((p) => p.id)

    // Mirror the server's slot reassignment locally so the optimistic order
    // matches what gets persisted, then re-sort the full list by position.
    const currentPositions = new Map(photos.map((p) => [p.id, p.position]))
    const nextPositions = new Map(
      reassignSlots(orderedIds, currentPositions).map((u) => [u.id, u.position])
    )
    const nextPhotos = photos
      .map((p) => (nextPositions.has(p.id) ? { ...p, position: nextPositions.get(p.id)! } : p))
      .sort((a, b) => a.position - b.position)
    setPhotos(nextPhotos)

    startTransition(async () => {
      await reorderPhotos(orderedIds)
    })
  }

  return (
    <div className="w-full">
      {/* Section filter — narrows the table to one feed (or to hidden photos).
          Reordering while a filter is active only shuffles the shown rows. */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {PHOTO_FILTERS.map((value) => {
          const active = filter === value
          return (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              aria-pressed={active}
              className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
                active
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-input text-muted-foreground hover:bg-muted'
              }`}
            >
              {PHOTO_FILTER_LABELS[value]}
            </button>
          )
        })}
      </div>

      {visiblePhotos.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <p>Нет фотографий в этом разделе</p>
        </div>
      ) : (
        <div className="w-full overflow-x-auto">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="w-10 p-2 text-left text-sm font-medium text-muted-foreground">
                    {/* Drag handle column */}
                  </th>
                  <th className="p-2 text-left text-sm font-medium text-muted-foreground">
                    Фото
                  </th>
                  <th className="hidden sm:table-cell p-2 text-left text-sm font-medium text-muted-foreground">
                    Заголовок
                  </th>
                  <th className="hidden md:table-cell p-2 text-left text-sm font-medium text-muted-foreground">
                    Описание
                  </th>
                  <th className="hidden md:table-cell p-2 text-left text-sm font-medium text-muted-foreground">
                    Alt текст
                  </th>
                  <th className="p-2 text-center text-sm font-medium text-muted-foreground">
                    Разделы
                  </th>
                  <th className="p-2 text-center text-sm font-medium text-muted-foreground">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody>
                <SortableContext
                  items={visiblePhotos.map((photo) => photo.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {visiblePhotos.map((photo) => (
                    <PhotoRow key={photo.id} photo={photo} supabaseUrl={supabaseUrl} />
                  ))}
                </SortableContext>
              </tbody>
            </table>
          </DndContext>
        </div>
      )}
    </div>
  )
}
