'use client'

import { useState, useTransition } from 'react'
import { GripVertical, Trash2 } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { updatePhoto, deletePhoto } from '../actions'
import type { Tables } from '@/lib/supabase/database.types'

type Photo = Tables<'photos'>

interface PhotoRowProps {
  photo: Photo
  supabaseUrl: string
}

export function PhotoRow({ photo, supabaseUrl }: PhotoRowProps) {
  const [editingField, setEditingField] = useState<'title' | 'description' | 'alt_text' | null>(null)
  const [title, setTitle] = useState(photo.title || '')
  const [description, setDescription] = useState(photo.description || '')
  const [altText, setAltText] = useState(photo.alt_text || '')
  const [isVisible, setIsVisible] = useState(photo.is_visible)
  const [isPending, startTransition] = useTransition()

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: photo.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const imageUrl = `${supabaseUrl}/storage/v1/object/public/photos/${photo.storage_path}`

  const handleSave = (field: 'title' | 'description' | 'alt_text') => {
    startTransition(async () => {
      const updates: {
        title?: string | null
        description?: string | null
        alt_text?: string | null
        is_visible?: boolean
      } = { is_visible: isVisible }

      if (field === 'title') {
        updates.title = title || null
      } else if (field === 'description') {
        updates.description = description || null
      } else if (field === 'alt_text') {
        updates.alt_text = altText || null
      }

      await updatePhoto(photo.id, updates)
      setEditingField(null)
    })
  }

  const handleCancel = (field: 'title' | 'description' | 'alt_text') => {
    if (field === 'title') {
      setTitle(photo.title || '')
    } else if (field === 'description') {
      setDescription(photo.description || '')
    } else if (field === 'alt_text') {
      setAltText(photo.alt_text || '')
    }
    setEditingField(null)
  }

  const handleDelete = () => {
    if (confirm('Вы уверены, что хотите удалить эту фотографию?')) {
      startTransition(async () => {
        await deletePhoto(photo.id)
      })
    }
  }

  const handleToggleVisible = (checked: boolean) => {
    setIsVisible(checked)
    startTransition(async () => {
      await updatePhoto(photo.id, { is_visible: checked })
    })
  }

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`border-b transition-opacity ${isDragging ? 'bg-muted' : ''}`}
    >
      {/* Drag Handle */}
      <td className="w-10 p-2">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded transition-colors"
          aria-label="Переместить"
        >
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </button>
      </td>

      {/* Thumbnail */}
      <td className="p-2">
        <img
          src={imageUrl}
          alt={photo.alt_text || photo.storage_path}
          className="h-12 w-12 object-cover rounded"
        />
      </td>

      {/* Title */}
      <td className="p-2">
        {editingField === 'title' ? (
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => handleSave('title')}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSave('title')
              }
              if (e.key === 'Escape') {
                handleCancel('title')
              }
            }}
            placeholder="Заголовок"
            className="w-full"
            disabled={isPending}
            autoFocus
          />
        ) : (
          <div
            onClick={() => setEditingField('title')}
            className="cursor-text hover:bg-muted/50 p-1 rounded min-h-[2rem] flex items-center"
          >
            {title || <span className="text-muted-foreground">Заголовок</span>}
          </div>
        )}
      </td>

      {/* Description */}
      <td className="hidden md:table-cell p-2">
        {editingField === 'description' ? (
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => handleSave('description')}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSave('description')
              }
              if (e.key === 'Escape') {
                handleCancel('description')
              }
            }}
            placeholder="Описание"
            className="w-full"
            disabled={isPending}
            autoFocus
          />
        ) : (
          <div
            onClick={() => setEditingField('description')}
            className="cursor-text hover:bg-muted/50 p-1 rounded min-h-[2rem] flex items-center"
          >
            {description || (
              <span className="text-muted-foreground">Описание</span>
            )}
          </div>
        )}
      </td>

      {/* Alt Text */}
      <td className="hidden md:table-cell p-2">
        {editingField === 'alt_text' ? (
          <Input
            value={altText}
            onChange={(e) => setAltText(e.target.value)}
            onBlur={() => handleSave('alt_text')}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSave('alt_text')
              }
              if (e.key === 'Escape') {
                handleCancel('alt_text')
              }
            }}
            placeholder="Alt текст"
            className="w-full"
            disabled={isPending}
            autoFocus
          />
        ) : (
          <div
            onClick={() => setEditingField('alt_text')}
            className="cursor-text hover:bg-muted/50 p-1 rounded min-h-[2rem] flex items-center"
          >
            {altText || <span className="text-muted-foreground">Alt текст</span>}
          </div>
        )}
      </td>

      {/* Is Visible */}
      <td className="p-2">
        <Switch
          checked={isVisible}
          onCheckedChange={handleToggleVisible}
          disabled={isPending}
        />
      </td>

      {/* Delete */}
      <td className="p-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDelete}
          disabled={isPending}
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </td>
    </tr>
  )
}
