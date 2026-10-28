'use client'

import { useEffect, useState, useTransition } from 'react'
import { Plus } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { reassignSlots } from '@/lib/photo-filter'
import { createStory, reorderStories } from '../story-actions'
import { StoryRow } from './story-row'

import type { AdminStory, CataloguePhoto } from './story-types'

export type { AdminStory, CataloguePhoto } from './story-types'

type Props = {
  stories: AdminStory[]
  catalogue: CataloguePhoto[]
  supabaseUrl: string
}

export function StoriesTable({ stories: initialStories, catalogue, supabaseUrl }: Props) {
  const [stories, setStories] = useState(initialStories)
  const [title, setTitle] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    setStories(initialStories)
  }, [initialStories])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = stories.findIndex((story) => story.id === active.id)
    const newIndex = stories.findIndex((story) => story.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const ordered = arrayMove(stories, oldIndex, newIndex)
    const slots = new Map(reassignSlots(ordered.map((s) => s.id), new Map(stories.map((s) => [s.id, s.position]))).map((u) => [u.id, u.position]))
    setStories(ordered.map((story) => ({ ...story, position: slots.get(story.id) ?? story.position })))
    startTransition(async () => {
      const result = await reorderStories(ordered.map((story) => story.id))
      setError(result.error ?? null)
    })
  }

  const handleCreate = () => {
    startTransition(async () => {
      const result = await createStory({ title })
      setError(result.error ?? null)
      if (!result.error) setTitle('')
    })
  }

  return (
    <div className="w-full">
      <form
        className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center"
        onSubmit={(event) => {
          event.preventDefault()
          handleCreate()
        }}
      >
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Название новой истории"
          aria-label="Название новой истории"
          disabled={isPending}
          className="sm:max-w-sm"
        />
        <Button type="submit" size="sm" disabled={isPending || !title.trim()}>
          <Plus className="mr-1 h-4 w-4" />
          Добавить историю
        </Button>
      </form>
      {error ? (
        <p role="alert" className="mb-4 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <p className="mb-4 text-sm text-muted-foreground">
        В историю можно добавить только фотографии с меткой Editorial. На сайте история появляется, когда она видима и в ней есть хотя бы одна такая фотография.
      </p>

      {stories.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <p>Историй пока нет</p>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={stories.map((story) => story.id)} strategy={verticalListSortingStrategy}>
            <ul className="flex flex-col gap-3">
              {stories.map((story) => (
                <StoryRow key={story.id} story={story} catalogue={catalogue} supabaseUrl={supabaseUrl} />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}
