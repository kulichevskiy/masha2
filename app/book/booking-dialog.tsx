'use client'

// The booking form lives in one modal for the whole page. Each tier row has a
// "book <tier> →" link that opens it with that tier chosen, so the form itself
// never asks which session the visitor wants. A native <dialog> gives focus
// trapping, Escape and the backdrop for free; the sheet is a white rectangle
// on a dark scrim, full-width from the bottom on a phone, centered on desktop.

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import posthog from 'posthog-js'
import { BookingForm, type BookingTier } from './booking-form'

type DialogState = { open: (tier: BookingTier) => void }

const DialogContext = createContext<DialogState | null>(null)

export function useBookingDialog(): DialogState {
  const state = useContext(DialogContext)
  if (!state) throw new Error('useBookingDialog needs a BookingDialogProvider')
  return state
}

export function BookingDialogProvider({ children }: { children: ReactNode }) {
  const [tier, setTier] = useState<BookingTier | null>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog || !tier) return
    if (!dialog.open && typeof dialog.showModal === 'function') dialog.showModal()
  }, [tier])

  const close = () => {
    dialogRef.current?.close()
  }

  // One event per opening, with the tier, so the funnel can count who reached
  // the form and the submit event can be read against it.
  const open = (next: BookingTier) => {
    posthog.capture('booking_dialog_opened', { tier: next.name, price: next.price_text })
    setTier(next)
  }

  return (
    <DialogContext.Provider value={{ open }}>
      {children}
      <dialog
        ref={dialogRef}
        onClose={() => setTier(null)}
        onClick={(event) => {
          // A click on the backdrop lands on the dialog element itself.
          if (event.target === event.currentTarget) close()
        }}
        aria-label="Booking request"
        className="m-0 mt-auto w-full max-w-none max-h-[92dvh] overflow-y-auto border-0 bg-white p-0 text-gray-700 backdrop:bg-black/55 md:m-auto md:w-[560px]"
      >
        {tier && (
          <div className="relative px-5 py-12 md:px-14 md:pt-14 md:pb-12">
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="absolute right-5 top-5 md:right-6 md:top-6 p-1 text-black transition-opacity hover:opacity-60 cursor-pointer"
            >
              <CrossSharp />
            </button>
            <BookingForm key={tier.id} tier={tier} />
          </div>
        )}
      </dialog>
    </DialogContext.Provider>
  )
}

// The link in a tier row. Priced tiers read "book mini →"; a tier on request
// reads "write to me →", because nothing is being reserved yet.
export function BookTierLink({ tier, label }: { tier: BookingTier; label: string }) {
  const { open } = useBookingDialog()
  return (
    <button
      type="button"
      onClick={() => open(tier)}
      className="inline-block font-bebas-neue text-lg tracking-[0.1em] uppercase border-b border-black pb-1 text-black transition-opacity hover:opacity-60 cursor-pointer"
    >
      {label}
      {' →'}
    </button>
  )
}

// Phosphor-style sharp cross, matching the footer icons.
function CrossSharp() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.25}
      strokeLinecap="square"
      aria-hidden="true"
    >
      <path d="M2 2 18 18M18 2 2 18" />
    </svg>
  )
}
