'use client'

import { useState, useTransition } from 'react'
import { ArrowDown, ArrowUp, Plus, Star, X } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { arrayMove, rectSortingStrategy, SortableContext, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { normalizeCredits, type StoryCredit } from '@/lib/editorial-stories'
import { setStoryPhotos, updateStory } from '../story-actions'
import { thumbnailUrl, type AdminStory, type CataloguePhoto } from './story-types'

type Props = {
  story: AdminStory
  catalogue: CataloguePhoto[]
  supabaseUrl: string
}

// Read the stored credits for editing: every row, blank names included, so
// an unfilled suggestion ("styling — ") stays visible until the admin fills
// or removes it. normalizeCredits is the public view; this is the raw one.
function editableCredits(value: unknown): StoryCredit[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return []
    const { role, name } = entry as Record<string, unknown>
    return typeof role === 'string' ? [{ role, name: typeof name === 'string' ? name : '' }] : []
  })
}

export function StoryEditor({ story, catalogue, supabaseUrl }: Props) {
  const [title, setTitle] = useState(story.title)
  const [slug, setSlug] = useState(story.slug)
  const [subtitle, setSubtitle] = useState(story.subtitle)
  const [credits, setCredits] = useState<StoryCredit[]>(() => editableCredits(story.credits))
  const [photoIds, setPhotoIds] = useState(story.photo_ids)
  const [coverId, setCoverId] = useState(story.cover_photo_id)
  const [picking, setPicking] = useState(false)
  const [message, setMessage] = useState<{ kind: 'error' | 'ok'; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  const byId = new Map(catalogue.map((photo) => [photo.id, photo]))
  const available = catalogue.filter((photo) => !photoIds.includes(photo.id))

  const save = () => {
    startTransition(async () => {
      const result = await updateStory({ id: story.id, title, slug, subtitle, credits })
      setMessage(result.error ? { kind: 'error', text: result.error } : { kind: 'ok', text: 'Сохранено' })
      if (result.slug) setSlug(result.slug)
    })
  }

  // Photo changes persist at once; on failure the list snaps back.
  const persistPhotos = (nextIds: string[], nextCover: string | null) => {
    const previous = { ids: photoIds, cover: coverId }
    setPhotoIds(nextIds)
    setCoverId(nextCover)
    startTransition(async () => {
      const result = await setStoryPhotos({ storyId: story.id, photoIds: nextIds, coverPhotoId: nextCover })
      if (result.error) {
        setPhotoIds(previous.ids)
        setCoverId(previous.cover)
      }
      setMessage(result.error ? { kind: 'error', text: result.error } : null)
    })
  }

  const addPhoto = (id: string) => persistPhotos([...photoIds, id], coverId)
  const removePhoto = (id: string) => persistPhotos(photoIds.filter((photoId) => photoId !== id), coverId === id ? null : coverId)
  const makeCover = (id: string) => persistPhotos(photoIds, id)

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }))
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const from = photoIds.indexOf(String(active.id))
    const to = photoIds.indexOf(String(over.id))
    if (from === -1 || to === -1) return
    persistPhotos(arrayMove(photoIds, from, to), coverId)
  }

  return (
    <div className="border-t p-4">
      <form
        className="grid gap-4 md:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault()
          save()
        }}
      >
        <div className="grid gap-1.5">
          <Label htmlFor={`title-${story.id}`}>Название</Label>
          <Input id={`title-${story.id}`} value={title} onChange={(e) => setTitle(e.target.value)} disabled={isPending} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`slug-${story.id}`}>Слаг</Label>
          <Input id={`slug-${story.id}`} value={slug} onChange={(e) => setSlug(e.target.value)} disabled={isPending} />
        </div>
        <div className="grid gap-1.5 md:col-span-2">
          <Label htmlFor={`subtitle-${story.id}`}>Подзаголовок</Label>
          <textarea
            id={`subtitle-${story.id}`}
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            disabled={isPending}
            rows={2}
            className="rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
        </div>
        <CreditsEditor credits={credits} onChange={setCredits} disabled={isPending} storyId={story.id} />
        <div className="flex items-center gap-3 md:col-span-2">
          <Button type="submit" size="sm" disabled={isPending}>
            Сохранить
          </Button>
          {message ? (
            <p role={message.kind === 'error' ? 'alert' : 'status'} className={`text-sm ${message.kind === 'error' ? 'text-destructive' : 'text-muted-foreground'}`}>
              {message.text}
            </p>
          ) : null}
        </div>
      </form>

      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium">Фотографии · {photoIds.length}</p>
          <Button type="button" variant="outline" size="sm" onClick={() => setPicking((open) => !open)} disabled={isPending} aria-expanded={picking}>
            <Plus className="mr-1 h-4 w-4" />
            Добавить фото
          </Button>
        </div>
        {photoIds.length === 0 ? <p className="text-sm text-muted-foreground">Пока без фотографий — на сайте история не показывается.</p> : null}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={photoIds} strategy={rectSortingStrategy}>
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
              {photoIds.map((id) => (
                <StoryPhotoTile
                  key={id}
                  photo={byId.get(id)}
                  id={id}
                  isCover={coverId === id || (coverId === null && photoIds[0] === id)}
                  supabaseUrl={supabaseUrl}
                  onCover={() => makeCover(id)}
                  onRemove={() => removePhoto(id)}
                  disabled={isPending}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
        {picking ? (
          <div className="mt-4 rounded-md border bg-muted/30 p-3">
            <p className="mb-2 text-xs text-muted-foreground">Фотографии с меткой Editorial, которых ещё нет в истории</p>
            {available.length === 0 ? (
              <p className="text-sm text-muted-foreground">Все фотографии раздела уже в истории</p>
            ) : (
              <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
                {available.map((photo) => (
                  <li key={photo.id}>
                    <button
                      type="button"
                      onClick={() => addPhoto(photo.id)}
                      disabled={isPending}
                      className="block aspect-[3/4] w-full overflow-hidden rounded bg-muted"
                      aria-label={`Добавить: ${photo.title || photo.alt_text || photo.storage_path}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={thumbnailUrl(supabaseUrl, photo)} alt="" className="h-full w-full object-cover" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}

type CreditsEditorProps = {
  credits: StoryCredit[]
  onChange: (credits: StoryCredit[]) => void
  disabled: boolean
  storyId: string
}

// Ordered role/name rows. Roles are free text; a row with a blank name is
// kept here but dropped from the public page on save.
function CreditsEditor({ credits, onChange, disabled, storyId }: CreditsEditorProps) {
  const update = (index: number, patch: Partial<StoryCredit>) =>
    onChange(credits.map((credit, i) => (i === index ? { ...credit, ...patch } : credit)))
  const move = (index: number, delta: number) => {
    const target = index + delta
    if (target < 0 || target >= credits.length) return
    onChange(arrayMove(credits, index, target))
  }

  return (
    <fieldset className="grid gap-2 md:col-span-2">
      <legend className="mb-1 text-sm font-medium">Кредиты</legend>
      {credits.map((credit, index) => (
        <div key={index} className="flex items-center gap-2">
          <Input
            value={credit.role}
            onChange={(e) => update(index, { role: e.target.value })}
            placeholder="роль"
            aria-label={`Роль ${index + 1}`}
            disabled={disabled}
            className="sm:max-w-[200px]"
          />
          <Input
            value={credit.name}
            onChange={(e) => update(index, { name: e.target.value })}
            placeholder="имя"
            aria-label={`Имя ${index + 1}`}
            disabled={disabled}
          />
          <Button type="button" variant="ghost" size="icon" onClick={() => move(index, -1)} disabled={disabled || index === 0} aria-label={`Выше ${index + 1}`}>
            <ArrowUp className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" onClick={() => move(index, 1)} disabled={disabled || index === credits.length - 1} aria-label={`Ниже ${index + 1}`}>
            <ArrowDown className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" onClick={() => onChange(credits.filter((_, i) => i !== index))} disabled={disabled} aria-label={`Убрать ${index + 1}`}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <div>
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...credits, { role: '', name: '' }])} disabled={disabled} id={`add-credit-${storyId}`}>
          <Plus className="mr-1 h-4 w-4" />
          Роль
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        На сайте показываются строки с именем; публичный вид: {normalizeCredits(credits).map((c) => `${c.role} — ${c.name}`).join(', ') || 'пусто'}
      </p>
    </fieldset>
  )
}

type TileProps = {
  id: string
  photo: CataloguePhoto | undefined
  isCover: boolean
  supabaseUrl: string
  onCover: () => void
  onRemove: () => void
  disabled: boolean
}

function StoryPhotoTile({ id, photo, isCover, supabaseUrl, onCover, onRemove, disabled }: TileProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }
  const label = photo?.title || photo?.alt_text || photo?.storage_path || id

  return (
    <li ref={setNodeRef} style={style} className={`relative aspect-[3/4] overflow-hidden rounded bg-muted ${isCover ? 'ring-2 ring-foreground' : ''}`}>
      <button type="button" {...attributes} {...listeners} className="block h-full w-full cursor-grab active:cursor-grabbing" aria-label={`Переместить: ${label}`}>
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumbnailUrl(supabaseUrl, photo)} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full items-center justify-center p-1 text-center text-[10px] text-muted-foreground">без метки Editorial</span>
        )}
      </button>
      <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/50 p-1">
        <button type="button" onClick={onCover} disabled={disabled || isCover} className="rounded p-0.5 text-white disabled:opacity-60" aria-label={`Обложка: ${label}`} aria-pressed={isCover}>
          <Star className={`h-4 w-4 ${isCover ? 'fill-white' : ''}`} />
        </button>
        <button type="button" onClick={onRemove} disabled={disabled} className="rounded p-0.5 text-white" aria-label={`Убрать из истории: ${label}`}>
          <X className="h-4 w-4" />
        </button>
      </div>
    </li>
  )
}
