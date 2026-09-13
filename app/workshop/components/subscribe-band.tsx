'use client'

// The Subscribe band — the closed-sales counterpart to the Apply band. Same
// black plate that closes the workshop page, but instead of the intake picker +
// application form it collects an announcement email. Shown when sales_open is
// false; the hero CTA points here (#subscribe) instead of #apply. Copy comes
// from the admin-editable closed_heading / closed_intro fields, with the state
// machine mirroring the Apply / Gift forms.

import { useState, useTransition } from 'react'
import posthog from 'posthog-js'
import { isHoneypotFilled } from '@/lib/analytics'
import { RichText } from '@/components/rich-text'
import { submitWorkshopSubscription } from '../actions'
import type { Workshop } from '../data'
import { parseWaitlistPreferences, WAITLIST_SEASONS, WAITLIST_CITIES } from '../waitlist'

export function SubscribeBand({ workshop }: {
  workshop: Pick<Workshop, 'closed_heading' | 'closed_intro'>
}) {
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
    const preferences = parseWaitlistPreferences(fd)
    if (!preferences.ok) {
      setStatus({ kind: 'error', message: preferences.error })
      return
    }
    setStatus({ kind: 'idle' })
    startTransition(async () => {
      const result = await submitWorkshopSubscription(fd)
      if (result.ok) {
        if (!isHoneypotFilled(fd)) posthog.capture('workshop_subscription_submitted')
        setStatus({ kind: 'success' })
        setEmail('')
      } else {
        setStatus({ kind: 'error', message: result.error })
      }
    })
  }

  const labelCls =
    'block font-inter text-[11px] tracking-[0.25em] uppercase text-white/55 mb-1'
  const fieldCls =
    'w-full bg-transparent border-0 border-b border-white/25 focus:border-white py-3 font-inter text-[15px] text-white outline-none placeholder:text-white/35 transition-colors'

  return (
    <section id="subscribe" className="px-0 md:px-10 pt-16 md:pt-28 scroll-mt-12">
      <div className="mx-auto max-w-7xl">
        <div className="bg-black text-white px-6 md:px-16 py-12 md:py-20 relative overflow-hidden">
          {workshop.closed_heading && (
            <h3 className="font-bebas-neue text-[52px] md:text-[80px] leading-[0.95] uppercase text-white m-0 mb-5 md:mb-6 font-normal tracking-[-0.015em] md:tracking-[-0.01em]">
              {workshop.closed_heading}
            </h3>
          )}
          {workshop.closed_intro && (
            <RichText
              listMarker="disc"
              html={workshop.closed_intro}
              className="text-[14.5px] md:text-[17px] leading-[1.7] max-w-[560px] text-white/85 mb-8 md:mb-12 [&_p]:text-white/85"
            />
          )}

          {status.kind === 'success' ? (
            <div role="status" aria-live="polite" className="font-inter text-white max-w-[560px]">
              <h4 className="font-bebas-neue text-3xl uppercase tracking-wide leading-none mb-4">
                Thank you
              </h4>
              <p className="text-[15px] leading-relaxed text-white/85">
                We&rsquo;ll write to you the moment the next workshop is announced.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col max-w-[560px]">
              {/* Honeypot — bots that fill the hidden `website` field get silently dropped. */}
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                className="hidden"
              />

              <label htmlFor="workshop-subscribe-email" className={labelCls}>
                Email
              </label>
              <input
                id="workshop-subscribe-email"
                type="email"
                name="email"
                required
                maxLength={254}
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={fieldCls}
              />

              <p className="mt-7 text-[14.5px] leading-relaxed text-white/85">
                Choose your preferred seasons and cities. We&rsquo;ll email you
                when a new workshop is announced.
              </p>
              <PreferenceGroup name="seasons" label="Preferred seasons" options={WAITLIST_SEASONS} />
              <PreferenceGroup name="cities" label="Preferred cities" options={WAITLIST_CITIES} />

              <div className="mt-8">
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-block bg-white text-black px-8 sm:px-14 py-4 font-bebas-neue text-xl tracking-[0.12em] uppercase hover:bg-white/90 transition-colors disabled:opacity-60"
                >
                  {isPending ? 'Sending…' : 'Join the waitlist'}
                </button>
              </div>

              {status.kind === 'error' && (
                <p className="text-sm text-red-300 mt-4" role="alert">
                  {status.message}
                </p>
              )}
            </form>
          )}
        </div>
      </div>
    </section>
  )
}

function PreferenceGroup({ name, label, options }: {
  name: string
  label: string
  options: Record<string, string>
}) {
  return (
    <fieldset className="mt-7" aria-describedby={`workshop-${name}-hint`}>
      <legend className="font-inter text-[11px] tracking-[0.25em] uppercase text-white/70">
        {label}
      </legend>
      <p id={`workshop-${name}-hint`} className="mt-2 text-sm text-white/60">
        Choose at least one. You can select more than one.
      </p>
      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
        {Object.entries(options).map(([value, text]) => (
          <label key={value} className="flex items-center gap-3 min-h-11 cursor-pointer text-[15px] text-white">
            <input type="checkbox" name={name} value={value} className="size-5 accent-white" />
            {text}
          </label>
        ))}
      </div>
    </fieldset>
  )
}
