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
import { createTier, reorderTiers } from '../actions'
import { TierRow } from './tier-row'
import type { Tables } from '@/lib/supabase/database.types'

type Tier = Tables<'booking_tiers'>

export function TiersTable({ tiers: initialTiers }: { tiers: Tier[] }) {
  const [tiers, setTiers] = useState(initialTiers)
  const [, startTransition] = useTransition()

  useEffect(() => {
    setTiers(initialTiers)
  }, [initialTiers])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = tiers.findIndex((t) => t.id === active.id)
      const newIndex = tiers.findIndex((t) => t.id === over.id)
      const next = arrayMove(tiers, oldIndex, newIndex)
      setTiers(next)
      startTransition(async () => {
        await reorderTiers(next.map((t) => t.id))
      })
    }
  }

  const handleAdd = () => {
    startTransition(async () => {
      await createTier()
    })
  }

  return (
    <div className="w-full">
      <div className="flex justify-end mb-4">
        <Button onClick={handleAdd} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Новый тариф
        </Button>
      </div>

      {tiers.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>Нет тарифов</p>
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
                    Название
                  </th>
                  <th className="hidden lg:table-cell p-2 text-left text-sm font-medium text-muted-foreground">
                    Подзаголовок
                  </th>
                  <th className="p-2 text-left text-sm font-medium text-muted-foreground">
                    Цена
                  </th>
                  <th className="hidden md:table-cell p-2 text-left text-sm font-medium text-muted-foreground">
                    Описание
                  </th>
                  <th className="p-2 text-center text-sm font-medium text-muted-foreground">
                    Активен
                  </th>
                  <th className="p-2 text-center text-sm font-medium text-muted-foreground">
                    Акцент
                  </th>
                  <th className="p-2 text-center text-sm font-medium text-muted-foreground">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody>
                <SortableContext
                  items={tiers.map((t) => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {tiers.map((tier) => (
                    <TierRow key={tier.id} tier={tier} />
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
