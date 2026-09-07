'use client'

import { useState, useTransition } from 'react'
import posthog from 'posthog-js'
import { updateSetting } from '../actions'

export function SettingsForm({ recipientEmail }: { recipientEmail: string }) {
  const [email, setEmail] = useState(recipientEmail)
  const [status, setStatus] = useState<
    | { kind: 'idle' }
    | { kind: 'saved' }
    | { kind: 'error', message: string }
  >({ kind: 'idle' })
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = email.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setStatus({ kind: 'error', message: 'Введите корректный email.' })
      return
    }
    startTransition(async () => {
      try {
        await updateSetting('booking_recipient_email', trimmed)
        posthog.capture('booking_recipient_updated')
        setStatus({ kind: 'saved' })
      } catch (err) {
        setStatus({
          kind: 'error',
          message: err instanceof Error ? err.message : 'Не удалось сохранить.',
        })
      }
    })
  }

  return (
    <div className="bg-white border border-gray-200 p-6 max-w-sm w-full">
      <h3 className="text-[22px] font-semibold tracking-tight text-[#252525] leading-tight">
        Email для заявок
      </h3>
      <p className="mt-1 mb-5 text-[13px] text-gray-500 font-inter">
        Куда форвардить новые заявки с /book
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div>
          <label
            htmlFor="booking_recipient_email"
            className="block mb-1.5 text-[13px] font-medium text-[#252525]"
          >
            Email получателя
          </label>
          <input
            id="booking_recipient_email"
            type="email"
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setStatus({ kind: 'idle' })
            }}
            className="w-full h-9 border border-gray-200 rounded-none px-3 text-sm bg-transparent font-inter outline-none focus:border-[#252525]"
          />
        </div>

        {status.kind === 'error' && (
          <p className="text-sm text-red-500">{status.message}</p>
        )}
        {status.kind === 'saved' && (
          <p className="text-sm text-gray-500">Сохранено</p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full h-11 mt-4 bg-black text-white rounded-none font-inter text-[13px] font-normal tracking-[0.02em] lowercase cursor-pointer transition-colors hover:bg-gray-800 disabled:opacity-60"
        >
          {isPending ? 'сохранение...' : 'сохранить'}
        </button>
      </form>
    </div>
  )
}
