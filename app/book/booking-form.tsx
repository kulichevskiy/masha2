'use client'

import { useState, useTransition } from 'react'
import posthog from 'posthog-js'
import { isHoneypotFilled } from '@/lib/analytics'
import { submitBookingRequest } from './actions'

export type BookingTier = {
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

// Fields are a hairline under the text, nothing else; labels are the small
// tracked lowercase of the home story.
const FIELD =
  'block w-full border-0 border-b border-gray-300 rounded-none bg-transparent px-0 py-3 text-lg text-black placeholder:text-gray-400 focus:border-black outline-none'
const LABEL = 'block font-inter text-xs tracking-[0.3em] lowercase text-gray-500'

// The form for one tier: the tier is already chosen when the dialog opens, so
// the visitor only leaves an email and a few words.
export function BookingForm({ tier }: { tier: BookingTier }) {
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
        if (!isHoneypotFilled(fd)) posthog.capture('booking_request_submitted', { tier_selected: true })
        setStatus({ kind: 'success' })
        setEmail('')
        setMessage('')
      } else {
        setStatus({ kind: 'error', message: result.error })
      }
    })
  }

  if (status.kind === 'success') {
    return (
      <div role="status" aria-live="polite" className="font-inter">
        <div className="flex flex-col items-start gap-4">
          <div className="text-black">
            <CheckSharp />
          </div>
          <h3 className="font-bebas-neue text-black lowercase text-[32px] md:text-[44px] leading-none">
            your request is in
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
    <form onSubmit={handleSubmit} className="font-inter">
      {/* Honeypot — hidden from humans, bots happily fill it and get silently dropped server-side. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
      />
      <input type="hidden" name="tier_id" value={tier.id} />

      <h2 className="font-bebas-neue text-black lowercase text-[32px] md:text-[44px] leading-none">
        {tier.name} — {tier.price_text}
      </h2>
      <p className="mt-3 text-gray-600 leading-relaxed">
        Leave your email and a few words. Maria writes back personally within a few days.
      </p>

      <div className="mt-8">
        <label htmlFor="email" className={LABEL}>
          your email
        </label>
        <input
          id="email"
          type="email"
          name="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className={FIELD}
        />
      </div>

      <div className="mt-8">
        <label htmlFor="message" className={LABEL}>
          a few words about yourself or your idea
        </label>
        <textarea
          id="message"
          name="message"
          rows={3}
          maxLength={2000}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="optional"
          className={`${FIELD} resize-none`}
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="mt-10 block w-full bg-black text-white rounded-none px-14 py-4 font-bebas-neue text-xl tracking-[0.12em] uppercase hover:bg-gray-800 transition-colors disabled:opacity-60 cursor-pointer"
      >
        {isPending ? 'Sending…' : 'Send request'}
      </button>

      {status.kind === 'error' && (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {status.message}
        </p>
      )}
    </form>
  )
}
