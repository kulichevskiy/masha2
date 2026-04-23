'use client'

import { useState, useTransition } from 'react'
import { submitBookingRequest } from './actions'

type Tier = {
  id: string
  name: string
  price_text: string
}

// Phosphor-style sharp checkmark — matches the footer iconography (square line
// caps, mitered corners, 1.25 stroke). Radius 0 public surface — no round icons.
function CheckSharp() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.25}
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" />
      <path d="M7 12 11 16 17 9" />
    </svg>
  )
}

export function BookingForm({ tiers }: { tiers: Tier[] }) {
  const [tierId, setTierId] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<
    | { kind: 'idle' }
    | { kind: 'success' }
    | { kind: 'error', message: string }
  >({ kind: 'idle' })
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await submitBookingRequest(fd)
      if (result.ok) {
        setStatus({ kind: 'success' })
        setTierId('')
        setEmail('')
        setMessage('')
      } else {
        setStatus({ kind: 'error', message: result.error })
      }
    })
  }

  if (status.kind === 'success') {
    return (
      <div
        role="status"
        aria-live="polite"
        className="border border-gray-200 px-8 py-10 font-inter"
      >
        <div className="flex flex-col items-start gap-4">
          <div className="text-black">
            <CheckSharp />
          </div>
          <h3 className="font-bebas-neue text-black uppercase tracking-wide text-xl leading-none">
            Your request is in
          </h3>
          <p className="text-gray-700 leading-relaxed">
            Maria will write back to you personally within a few days —
            keep an eye on your inbox.
          </p>
          <button
            type="button"
            onClick={() => setStatus({ kind: 'idle' })}
            className="mt-2 text-sm text-gray-500 hover:text-black underline underline-offset-4 decoration-gray-300 hover:decoration-black transition-colors cursor-pointer"
          >
            Send another request
          </button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 font-inter">
      {/* Honeypot — hidden from humans, bots happily fill it and get silently dropped server-side. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
      />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="tier_id" className="text-sm text-black">
          What are you booking?
        </label>
        <select
          id="tier_id"
          name="tier_id"
          value={tierId}
          onChange={(e) => setTierId(e.target.value)}
          className="h-11 border border-gray-200 rounded-none px-3 bg-white text-gray-900 focus:border-black outline-none"
        >
          <option value="">Select a tier</option>
          {tiers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} — {t.price_text}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm text-black">
          Your email
        </label>
        <input
          id="email"
          type="email"
          name="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="h-11 border border-gray-200 rounded-none px-3 bg-white text-gray-900 focus:border-black outline-none"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="message" className="text-sm text-black">
          A few words about yourself or your idea (optional)
        </label>
        <textarea
          id="message"
          name="message"
          rows={5}
          maxLength={2000}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="border border-gray-200 rounded-none px-3 py-2 bg-white text-gray-900 focus:border-black outline-none resize-y"
        />
      </div>

      <div className="mt-2">
        <button
          type="submit"
          disabled={isPending}
          className="inline-block bg-black text-white rounded-none px-14 py-3 hover:bg-gray-800 transition-colors disabled:opacity-60"
        >
          {isPending ? 'Sending...' : 'Send request'}
        </button>
      </div>

      {status.kind === 'error' && (
        <p className="text-sm text-red-600" role="alert">
          {status.message}
        </p>
      )}
    </form>
  )
}
