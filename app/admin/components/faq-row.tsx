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
import { updateFaq, deleteFaq } from '../actions'
import type { Tables } from '@/lib/supabase/database.types'

type FaqEntry = Tables<'booking_faq'>

type Field = 'question' | 'answer'

export function FaqRow({ entry }: { entry: FaqEntry }) {
  const [editingField, setEditingField] = useState<Field | null>(null)
  const [question, setQuestion] = useState(entry.question)
  const [answer, setAnswer] = useState(entry.answer)
  const [isVisible, setIsVisible] = useState(entry.is_visible)
  const [isPending, startTransition] = useTransition()

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: entry.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const save = (field: Field) => {
    startTransition(async () => {
      if (field === 'question') {
        await updateFaq(entry.id, { question: question.trim() || entry.question })
      } else if (field === 'answer') {
        await updateFaq(entry.id, { answer: answer.trim() })
      }
      setEditingField(null)
    })
  }

  const cancel = (field: Field) => {
    if (field === 'question') setQuestion(entry.question)
    if (field === 'answer') setAnswer(entry.answer)
    setEditingField(null)
  }

  const handleDelete = () => {
    if (confirm(`Удалить вопрос «${entry.question}»?`)) {
      startTransition(async () => {
        await deleteFaq(entry.id)
      })
    }
  }

  const handleToggle = (checked: boolean) => {
    setIsVisible(checked)
    startTransition(async () => {
      await updateFaq(entry.id, { is_visible: checked })
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

      <td className="p-2 min-w-[240px] align-top">
        {editingField === 'question' ? (
          <Input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onBlur={() => save('question')}
            onKeyDown={(e) => {
              if (e.key === 'Enter') save('question')
              if (e.key === 'Escape') cancel('question')
            }}
            disabled={isPending}
            autoFocus
          />
        ) : (
          <div
            onClick={() => setEditingField('question')}
            className="cursor-text hover:bg-muted/50 p-1 rounded min-h-[2rem] flex items-center"
          >
            {question || <span className="text-muted-foreground">Вопрос</span>}
          </div>
        )}
      </td>

      <td className="hidden md:table-cell p-2 align-top">
        {editingField === 'answer' ? (
          <div className="flex flex-col gap-2">
            <RichTextEditor
              value={answer}
              onChange={setAnswer}
              autoFocus
              disabled={isPending}
            />
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() => save('answer')}
                disabled={isPending}
              >
                Сохранить
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => cancel('answer')}
                disabled={isPending}
              >
                Отмена
              </Button>
            </div>
          </div>
        ) : (
          <div
            onClick={() => setEditingField('answer')}
            className="cursor-text hover:bg-muted/50 p-1 rounded min-h-[2rem]"
          >
            {answer ? (
              <RichText html={answer} className="text-sm" />
            ) : (
              <span className="text-muted-foreground">Ответ</span>
            )}
          </div>
        )}
      </td>

      <td className="p-2 text-center align-top">
        <Switch
          checked={isVisible}
          onCheckedChange={handleToggle}
          disabled={isPending}
        />
      </td>

      <td className="p-2 text-center align-top">
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
