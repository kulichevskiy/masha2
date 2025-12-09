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
import type { Tables } from '@/lib/supabase/database.types'

type Photo = Tables<'photos'>

interface PhotosTableProps {
  photos: Photo[]
  supabaseUrl: string
}

export function PhotosTable({ photos: initialPhotos, supabaseUrl }: PhotosTableProps) {
  const [photos, setPhotos] = useState(initialPhotos)
  const [isPending, startTransition] = useTransition()

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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = photos.findIndex((photo) => photo.id === active.id)
      const newIndex = photos.findIndex((photo) => photo.id === over.id)

      const newPhotos = arrayMove(photos, oldIndex, newIndex)
      setPhotos(newPhotos)

      // Update positions in database
      startTransition(async () => {
        await reorderPhotos(newPhotos.map((photo) => photo.id))
      })
    }
  }

  return (
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
              <th className="p-2 text-left text-sm font-medium text-muted-foreground">
                Заголовок
              </th>
              <th className="p-2 text-left text-sm font-medium text-muted-foreground">
                Описание
              </th>
              <th className="p-2 text-left text-sm font-medium text-muted-foreground">
                Alt текст
              </th>
              <th className="p-2 text-left text-sm font-medium text-muted-foreground">
                Видимость
              </th>
              <th className="p-2 text-left text-sm font-medium text-muted-foreground">
                Действия
              </th>
            </tr>
          </thead>
          <tbody>
            <SortableContext
              items={photos.map((photo) => photo.id)}
              strategy={verticalListSortingStrategy}
            >
              {photos.map((photo) => (
                <PhotoRow key={photo.id} photo={photo} supabaseUrl={supabaseUrl} />
              ))}
            </SortableContext>
          </tbody>
        </table>
      </DndContext>
    </div>
  )
}
