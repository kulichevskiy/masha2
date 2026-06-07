'use client'

// Interactive island on /gift: the amount picker + order form. The first amount
// is selected by default; the selected tile is a solid-black plate, the rest are
// hairline-bordered with a hover state. Submitting posts the buyer's email plus
// the chosen amount id (resolved to a price snapshot server-side) to
// submitGiftOrder, mirroring the booking/workshop form state machine.

import { useState, useTransition } from 'react'
import { submitGiftOrder } from '../actions'
import type { Amount } from '../data'

export function GiftOrder({ amounts }: { amounts: Amount[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(
    amounts[0]?.id ?? null
  )
  const [email, setEmail] = useState('')
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
      const result = await submitGiftOrder(fd)
      if (result.ok) {
        setStatus({ kind: 'success' })
        setEmail('')
      } else {
        setStatus({ kind: 'error', message: result.error })
      }
    })
  }

  if (status.kind === 'success') {
    return (
      <div className="mt-10 md:mt-12" role="status" aria-live="polite">
        <p className="font-inter text-[10.5px] md:text-[11px] tracking-[0.28em] uppercase text-gray-500">
          Order received
        </p>
        <h4 className="mt-3 font-bebas-neue text-3xl uppercase tracking-wide leading-none">
          Thank you
        </h4>
        <p className="mt-4 font-inter text-[15px] leading-relaxed text-gray-700">
          Maria will be in touch shortly to arrange the certificate.
        </p>
        <button
          type="button"
          onClick={() => setStatus({ kind: 'idle' })}
          className="mt-6 font-inter text-sm text-gray-500 hover:text-foreground underline underline-offset-4 decoration-gray-300 hover:decoration-foreground transition-colors cursor-pointer"
        >
          Order another
        </button>
      </div>
    )
  }

  return (
    <div className="mt-10 md:mt-12">
      {amounts.length > 0 && (
        <div className="flex flex-wrap gap-2 md:gap-3">
          {amounts.map((amount) => {
            const selected = amount.id === selectedId
            return (
              <button
                key={amount.id}
                type="button"
                data-testid="amount-tile"
                data-selected={selected}
                aria-pressed={selected}
                onClick={() => setSelectedId(amount.id)}
                className={
                  'flex-1 min-w-[120px] px-6 py-5 text-center font-bebas-neue text-2xl md:text-[28px] tracking-[0.04em] transition-colors ' +
                  (selected
                    ? 'bg-black text-white'
                    : 'border border-gray-300 text-foreground hover:border-foreground')
                }
              >
                {amount.price}
              </button>
            )
          })}
        </div>
      )}

      <form className="mt-8" onSubmit={handleSubmit}>
        {/* Honeypot — bots that fill this hidden field get silently dropped. */}
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="hidden"
        />

        {/* Chosen amount id — resolved to a price snapshot server-side. */}
        <input type="hidden" name="amount_id" value={selectedId ?? ''} />

        <label className="block">
          <span className="font-inter text-[10.5px] md:text-[11px] tracking-[0.28em] uppercase text-gray-500">
            Email
          </span>
          <input
            type="email"
            name="email"
            required
            maxLength={254}
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-2 w-full border-0 border-b border-gray-300 bg-transparent py-2 font-inter text-[15px] text-foreground placeholder:text-gray-400 focus:border-foreground focus:outline-none"
          />
        </label>

        <button
          type="submit"
          disabled={isPending}
          className="mt-8 inline-block bg-black px-14 py-4 font-bebas-neue text-xl md:text-[22px] tracking-[0.12em] uppercase text-white transition-colors hover:bg-gray-800 disabled:opacity-60"
        >
          {isPending ? 'Sending…' : 'Order'}
        </button>

        {status.kind === 'error' && (
          <p className="mt-4 font-inter text-sm text-red-600" role="alert">
            {status.message}
          </p>
        )}
      </form>
    </div>
  )
}
