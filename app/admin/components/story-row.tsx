'use client'

import { useState, useTransition } from 'react'
import { GripVertical, Pencil, Trash2 } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { pickCover } from '@/lib/editorial-stories'
import { deleteStory, setStoryVisible } from '../story-actions'
import { StoryEditor } from './story-editor'
import { thumbnailUrl, type AdminStory, type CataloguePhoto } from './story-types'

type Props = {
  story: AdminStory
  catalogue: CataloguePhoto[]
  supabaseUrl: string
}

// One story in the admin list: drag handle, cover, title and slug, photo
// count, the visibility switch, edit and delete. The editor opens underneath.
export function StoryRow({ story, catalogue, supabaseUrl }: Props) {
  const [visible, setVisible] = useState(story.visible)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: story.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }

  const coverId = pickCover({ coverPhotoId: story.cover_photo_id, photoIds: story.photo_ids })
  const cover = catalogue.find((photo) => photo.id === coverId)

  const handleVisible = (checked: boolean) => {
    setVisible(checked)
    startTransition(async () => {
      const result = await setStoryVisible({ id: story.id, visible: checked })
      if (result.error) setVisible(!checked)
      setError(result.error ?? null)
    })
  }

  const handleDelete = () => {
    if (!confirm(`Удалить историю «${story.title}»? Фотографии останутся в библиотеке.`)) return
    startTransition(async () => {
      const result = await deleteStory({ id: story.id })
      setError(result.error ?? null)
    })
  }

  return (
    <li ref={setNodeRef} style={style} className={`rounded-md border ${isDragging ? 'bg-muted' : 'bg-card'}`}>
      <div className="flex items-center gap-3 p-2">
        <button
          {...attributes}
          {...listeners}
          type="button"
          className="cursor-grab rounded p-1 transition-colors hover:bg-muted active:cursor-grabbing"
          aria-label="Переместить"
        >
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </button>
        <div className="h-14 w-11 shrink-0 overflow-hidden rounded bg-muted">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumbnailUrl(supabaseUrl, cover)} alt="" className="h-full w-full object-cover" />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{story.title}</p>
          <p className="truncate text-xs text-muted-foreground">
            /editorial/{story.slug} · {story.photo_ids.length} фото
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <span className="hidden sm:inline text-muted-foreground">Видима</span>
          <Switch checked={visible} onCheckedChange={handleVisible} disabled={isPending} aria-label={`Видима: ${story.title}`} />
        </label>
        <Button variant="ghost" size="sm" onClick={() => setEditing((open) => !open)} aria-expanded={editing}>
          <Pencil className="mr-1 h-4 w-4" />
          Редактировать
        </Button>
        <Button variant="ghost" size="sm" onClick={handleDelete} disabled={isPending} aria-label={`Удалить: ${story.title}`}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
      {error ? (
        <p role="alert" className="px-3 pb-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {editing ? <StoryEditor story={story} catalogue={catalogue} supabaseUrl={supabaseUrl} /> : null}
    </li>
  )
}
