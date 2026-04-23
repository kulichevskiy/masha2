'use client'

import { useState, useTransition } from 'react'
import { GripVertical, Trash2 } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { RichTextEditor } from '@/components/rich-text-editor'
import { RichText } from '@/components/rich-text'
import { updateTier, deleteTier } from '../actions'
import type { Tables } from '@/lib/supabase/database.types'

type Tier = Tables<'booking_tiers'>

type Field = 'name' | 'subtitle' | 'price_text' | 'description'

export function TierRow({ tier }: { tier: Tier }) {
  const [editingField, setEditingField] = useState<Field | null>(null)
  const [name, setName] = useState(tier.name)
  const [subtitle, setSubtitle] = useState(tier.subtitle ?? '')
  const [priceText, setPriceText] = useState(tier.price_text)
  const [description, setDescription] = useState(tier.description ?? '')
  const [isActive, setIsActive] = useState(tier.is_active)
  const [isAccent, setIsAccent] = useState(tier.is_accent)
  const [isPending, startTransition] = useTransition()

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tier.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const save = (field: Field) => {
    startTransition(async () => {
      if (field === 'name') {
        await updateTier(tier.id, { name: name.trim() || tier.name })
      } else if (field === 'subtitle') {
        await updateTier(tier.id, { subtitle: subtitle.trim() || null })
      } else if (field === 'price_text') {
        await updateTier(tier.id, { price_text: priceText.trim() || tier.price_text })
      } else if (field === 'description') {
        await updateTier(tier.id, { description: description.trim() || null })
      }
      setEditingField(null)
    })
  }

  const cancel = (field: Field) => {
    if (field === 'name') setName(tier.name)
    if (field === 'subtitle') setSubtitle(tier.subtitle ?? '')
    if (field === 'price_text') setPriceText(tier.price_text)
    if (field === 'description') setDescription(tier.description ?? '')
    setEditingField(null)
  }

  const handleDelete = () => {
    if (confirm(`Удалить тариф «${tier.name}»?`)) {
      startTransition(async () => {
        await deleteTier(tier.id)
      })
    }
  }

  const handleToggle = (checked: boolean) => {
    setIsActive(checked)
    startTransition(async () => {
      await updateTier(tier.id, { is_active: checked })
    })
  }

  const handleToggleAccent = (checked: boolean) => {
    setIsAccent(checked)
    startTransition(async () => {
      await updateTier(tier.id, { is_accent: checked })
    })
  }

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`border-b transition-opacity ${isDragging ? 'bg-muted' : ''}`}
    >
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

      <td className="p-2 min-w-[180px]">
        {editingField === 'name' ? (
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => save('name')}
            onKeyDown={(e) => {
              if (e.key === 'Enter') save('name')
              if (e.key === 'Escape') cancel('name')
            }}
            disabled={isPending}
            autoFocus
          />
        ) : (
          <div
            onClick={() => setEditingField('name')}
            className="cursor-text hover:bg-muted/50 p-1 rounded min-h-[2rem] flex items-center"
          >
            {name || <span className="text-muted-foreground">Название</span>}
          </div>
        )}
      </td>

      <td className="hidden lg:table-cell p-2 min-w-[220px]">
        {editingField === 'subtitle' ? (
          <Input
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            onBlur={() => save('subtitle')}
            onKeyDown={(e) => {
              if (e.key === 'Enter') save('subtitle')
              if (e.key === 'Escape') cancel('subtitle')
            }}
            disabled={isPending}
            autoFocus
          />
        ) : (
          <div
            onClick={() => setEditingField('subtitle')}
            className="cursor-text hover:bg-muted/50 p-1 rounded min-h-[2rem] flex items-center text-sm"
          >
            {subtitle || <span className="text-muted-foreground">Подзаголовок</span>}
          </div>
        )}
      </td>

      <td className="p-2 min-w-[140px]">
        {editingField === 'price_text' ? (
          <Input
            value={priceText}
            onChange={(e) => setPriceText(e.target.value)}
            onBlur={() => save('price_text')}
            onKeyDown={(e) => {
              if (e.key === 'Enter') save('price_text')
              if (e.key === 'Escape') cancel('price_text')
            }}
            disabled={isPending}
            autoFocus
          />
        ) : (
          <div
            onClick={() => setEditingField('price_text')}
            className="cursor-text hover:bg-muted/50 p-1 rounded min-h-[2rem] flex items-center"
          >
            {priceText || <span className="text-muted-foreground">Цена</span>}
          </div>
        )}
      </td>

      <td className="hidden md:table-cell p-2">
        {editingField === 'description' ? (
          <div className="flex flex-col gap-2">
            <RichTextEditor
              value={description}
              onChange={setDescription}
              autoFocus
              disabled={isPending}
            />
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() => save('description')}
                disabled={isPending}
              >
                Сохранить
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => cancel('description')}
                disabled={isPending}
              >
                Отмена
              </Button>
            </div>
          </div>
        ) : (
          <div
            onClick={() => setEditingField('description')}
            className="cursor-text hover:bg-muted/50 p-1 rounded min-h-[2rem]"
          >
            {description ? (
              <RichText html={description} className="text-sm" />
            ) : (
              <span className="text-muted-foreground">Описание</span>
            )}
          </div>
        )}
      </td>

      <td className="p-2 text-center">
        <Switch
          checked={isActive}
          onCheckedChange={handleToggle}
          disabled={isPending}
        />
      </td>

      <td className="p-2 text-center">
        <Switch
          checked={isAccent}
          onCheckedChange={handleToggleAccent}
          disabled={isPending}
        />
      </td>

      <td className="p-2 text-center">
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
