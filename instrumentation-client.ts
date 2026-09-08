import posthog from 'posthog-js'
import { createClient } from '@/lib/supabase/client'

const projectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST
const VALIDATION_TIMEOUT_MS = 3000

if (projectToken && host) {
  posthog.init(projectToken, {
    api_host: host,
    defaults: '2026-01-30',
    capture_exceptions: true,
    debug: process.env.NODE_ENV === 'development',
  })

  if (posthog._isIdentified()) {
    // A previous visit identified an admin. Until the Supabase session is
    // confirmed still valid, keep the whole SDK opted out (pageviews,
    // autocapture, exceptions) so nothing is attributed to a revoked or
    // expired account. opt_in_capturing() later runs PostHog's own initial
    // pageview path, with its visibility and one-shot handling.
    posthog.opt_out_capturing()
    void validateIdentityThenOptIn()
  } else if (posthog.has_opted_out_capturing()) {
    // The site has no consent UI, so a persisted opt-out can only be a
    // validation window that never completed (tab closed mid-check).
    posthog.opt_in_capturing({ captureEventName: null })
  }
} else if (process.env.NODE_ENV === 'development') {
  // Analytics are optional locally: warn instead of breaking every page load.
  console.warn(
    '[posthog] NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN / NEXT_PUBLIC_POSTHOG_HOST not set; analytics disabled.'
  )
}

async function validateIdentityThenOptIn() {
  try {
    const result = await Promise.race([
      createClient().auth.getUser(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), VALIDATION_TIMEOUT_MS)),
    ])
    if (result) {
      const { data: { user }, error } = result
      // Reset only on confirmed absence; a timeout or transient Auth outage
      // keeps the identity and PostHogAuthSync re-checks on navigation.
      const sessionMissing = !user && (!error || error.name === 'AuthSessionMissingError')
      if (sessionMissing) posthog.reset()
    }
  } catch {
    // Network failure: keep the identity.
  } finally {
    posthog.opt_in_capturing({ captureEventName: null })
  }
}
