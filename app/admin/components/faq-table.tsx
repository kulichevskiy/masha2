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
import { createFaq, reorderFaq } from '../actions'
import { FaqRow } from './faq-row'
import type { Tables } from '@/lib/supabase/database.types'

type FaqEntry = Tables<'booking_faq'>

export function FaqTable({ entries: initialEntries }: { entries: FaqEntry[] }) {
  const [entries, setEntries] = useState(initialEntries)
  const [, startTransition] = useTransition()

  useEffect(() => {
    setEntries(initialEntries)
  }, [initialEntries])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = entries.findIndex((e) => e.id === active.id)
      const newIndex = entries.findIndex((e) => e.id === over.id)
      const next = arrayMove(entries, oldIndex, newIndex)
      setEntries(next)
      startTransition(async () => {
        await reorderFaq(next.map((e) => e.id))
      })
    }
  }

  const handleAdd = () => {
    startTransition(async () => {
      await createFaq()
    })
  }

  return (
    <div className="w-full">
      <div className="flex justify-end mb-4">
        <Button onClick={handleAdd} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Новый вопрос
        </Button>
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>Нет вопросов</p>
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
                  <th className="w-10 p-2" />
                  <th className="p-2 text-left text-sm font-medium text-muted-foreground">
                    Вопрос
                  </th>
                  <th className="hidden md:table-cell p-2 text-left text-sm font-medium text-muted-foreground">
                    Ответ
                  </th>
                  <th className="p-2 text-center text-sm font-medium text-muted-foreground">
                    Активен
                  </th>
                  <th className="p-2 text-center text-sm font-medium text-muted-foreground">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody>
                <SortableContext
                  items={entries.map((e) => e.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {entries.map((entry) => (
                    <FaqRow key={entry.id} entry={entry} />
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
