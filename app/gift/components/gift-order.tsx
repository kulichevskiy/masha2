'use client'

// Interactive island on /gift: the amount picker + order form. The first amount
// is selected by default; the selected tile is a solid-black plate, the rest are
// hairline-bordered with a hover state. Submission is intentionally not wired —
// the order button is present but inert until a later slice adds the action.

import { useState } from 'react'
import type { Amount } from '../data'

export function GiftOrder({ amounts }: { amounts: Amount[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(
    amounts[0]?.id ?? null
  )

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

      {/* Order form. Non-submitting for now — preventDefault keeps the page from
          navigating until the submit action is wired in a later slice. */}
      <form
        className="mt-8"
        onSubmit={(e) => e.preventDefault()}
      >
        <label className="block">
          <span className="font-inter text-[10.5px] md:text-[11px] tracking-[0.28em] uppercase text-gray-500">
            Email
          </span>
          <input
            type="email"
            name="email"
            autoComplete="email"
            placeholder="you@example.com"
            className="mt-2 w-full border-0 border-b border-gray-300 bg-transparent py-2 font-inter text-[15px] text-foreground placeholder:text-gray-400 focus:border-foreground focus:outline-none"
          />
        </label>

        <button
          type="submit"
          className="mt-8 inline-block bg-black px-14 py-4 font-bebas-neue text-xl md:text-[22px] tracking-[0.12em] uppercase text-white transition-colors hover:bg-gray-800"
        >
          Order
        </button>
      </form>
    </div>
  )
}
