'use client'

import { useState, useTransition } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { deleteBookingRequest } from '../actions'

export type BookingRequestRow = {
  id: string
  email: string
  message: string | null
  created_at: string
  booking_tiers: { name: string } | null
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function RequestRow({ request }: { request: BookingRequestRow }) {
  const [expanded, setExpanded] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleDelete = () => {
    if (confirm('Удалить заявку?')) {
      startTransition(async () => {
        await deleteBookingRequest(request.id)
      })
    }
  }

  const preview = request.message
    ? request.message.length > 80 && !expanded
      ? request.message.slice(0, 80) + '…'
      : request.message
    : ''

  return (
    <tr className="border-b align-top">
      <td className="p-2 text-sm text-muted-foreground whitespace-nowrap">
        {formatDate(request.created_at)}
      </td>
      <td className="p-2 text-sm">
        <a href={`mailto:${request.email}`} className="underline hover:no-underline">
          {request.email}
        </a>
      </td>
      <td className="p-2 text-sm">
        {request.booking_tiers?.name ?? <span className="text-muted-foreground">—</span>}
      </td>
      <td className="p-2 text-sm max-w-[420px]">
        {request.message ? (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-left whitespace-pre-wrap hover:text-foreground text-muted-foreground cursor-pointer"
          >
            {preview}
          </button>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
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

export function RequestsTable({ requests }: { requests: BookingRequestRow[] }) {
  if (requests.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Нет заявок</p>
      </div>
    )
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="p-2 text-left text-sm font-medium text-muted-foreground whitespace-nowrap">
              Дата
            </th>
            <th className="p-2 text-left text-sm font-medium text-muted-foreground">
              Email
            </th>
            <th className="p-2 text-left text-sm font-medium text-muted-foreground">
              Тариф
            </th>
            <th className="p-2 text-left text-sm font-medium text-muted-foreground">
              Сообщение
            </th>
            <th className="p-2 text-center text-sm font-medium text-muted-foreground">
              Действия
            </th>
          </tr>
        </thead>
        <tbody>
          {requests.map((r) => (
            <RequestRow key={r.id} request={r} />
          ))}
        </tbody>
      </table>
    </div>
  )
}
