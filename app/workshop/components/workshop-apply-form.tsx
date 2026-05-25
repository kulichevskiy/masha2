'use client'

import { useState, useTransition } from 'react'
import { submitWorkshopApplication } from '../actions'

// Mirrors the booking form's status state machine but in dark-plate styling
// for the apply section. White-on-black inputs with a hairline underline,
// labels in Inter 11px / 0.25em tracking / uppercase.

export function WorkshopApplyForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [instagram, setInstagram] = useState('')
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
      const result = await submitWorkshopApplication(fd)
      if (result.ok) {
        setStatus({ kind: 'success' })
        setName('')
        setEmail('')
        setInstagram('')
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
        className="font-inter text-white"
      >
        <p className="text-[11px] tracking-[0.25em] uppercase text-white/55 mb-3">
          Application received
        </p>
        <h4 className="font-bebas-neue text-3xl uppercase tracking-wide leading-none mb-4">
          Thank you
        </h4>
        <p className="text-[15px] leading-relaxed text-white/85">
          Maria reads every application personally and will write back within a
          few days.
        </p>
        <button
          type="button"
          onClick={() => setStatus({ kind: 'idle' })}
          className="mt-6 text-sm text-white/60 hover:text-white underline underline-offset-4 decoration-white/30 hover:decoration-white transition-colors cursor-pointer"
        >
          Apply again
        </button>
      </div>
    )
  }

  const labelCls =
    'block font-inter text-[11px] tracking-[0.25em] uppercase text-white/55 mb-1'
  const fieldCls =
    'w-full bg-transparent border-0 border-b border-white/25 focus:border-white py-3 font-inter text-[15px] text-white outline-none placeholder:text-white/35 transition-colors'

  return (
    <form onSubmit={handleSubmit} className="flex flex-col">
      {/* Honeypot */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
      />

      <label htmlFor="workshop-name" className={labelCls}>
        Your name
      </label>
      <input
        id="workshop-name"
        type="text"
        name="name"
        required
        maxLength={200}
        value={name}
        onChange={(e) => setName(e.target.value)}
        className={fieldCls}
      />

      <label htmlFor="workshop-email" className={`${labelCls} mt-5`}>
        Email
      </label>
      <input
        id="workshop-email"
        type="email"
        name="email"
        required
        maxLength={254}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className={fieldCls}
      />

      <label htmlFor="workshop-instagram" className={`${labelCls} mt-5`}>
        Instagram or portfolio
      </label>
      <input
        id="workshop-instagram"
        type="text"
        name="instagram"
        maxLength={200}
        placeholder="@"
        value={instagram}
        onChange={(e) => setInstagram(e.target.value)}
        className={fieldCls}
      />

      <label htmlFor="workshop-message" className={`${labelCls} mt-5`}>
        A sentence about why
      </label>
      <textarea
        id="workshop-message"
        name="message"
        rows={3}
        maxLength={2000}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        className={`${fieldCls} resize-none leading-snug py-2`}
      />

      <div className="mt-8">
        <button
          type="submit"
          disabled={isPending}
          className="inline-block bg-white text-black px-14 py-4 font-bebas-neue text-xl tracking-[0.12em] uppercase hover:bg-white/90 transition-colors disabled:opacity-60"
        >
          {isPending ? 'Sending…' : 'Apply to join'}
        </button>
      </div>

      {status.kind === 'error' && (
        <p className="text-sm text-red-300 mt-4" role="alert">
          {status.message}
        </p>
      )}
    </form>
  )
}
