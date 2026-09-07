import posthog from 'posthog-js'
import { createClient } from '@/lib/supabase/client'

const projectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST

if (projectToken && host) {
  // Whether PostHog persisted an identified user from a previous visit. Only
  // then must the initial $pageview wait for the session to be validated, so
  // it is never attributed to a since-revoked or expired admin.
  const identified = posthog._isIdentified()

  posthog.init(projectToken, {
    api_host: host,
    defaults: '2026-01-30',
    capture_exceptions: true,
    capture_pageview: identified ? false : 'history_change',
    debug: process.env.NODE_ENV === 'development',
  })

  if (identified) void validateIdentityThenStartPageviews()
} else if (process.env.NODE_ENV === 'development') {
  // Analytics are optional locally: warn instead of breaking every page load.
  console.warn(
    '[posthog] NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN / NEXT_PUBLIC_POSTHOG_HOST not set; analytics disabled.'
  )
}

async function validateIdentityThenStartPageviews() {
  try {
    const { data: { user }, error } = await createClient().auth.getUser()
    // Reset only on confirmed absence; a transient Auth outage keeps the identity.
    const sessionMissing = !user && (!error || error.name === 'AuthSessionMissingError')
    if (sessionMissing) posthog.reset()
  } catch {
    // Network failure: keep the identity, PostHogAuthSync re-checks on navigation.
  } finally {
    posthog.capture('$pageview')
    // Re-arms the history listeners that the deferred initial pageview disabled.
    posthog.set_config({ capture_pageview: 'history_change' })
  }
}
