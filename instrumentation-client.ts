import posthog from 'posthog-js'
import { createClient } from '@/lib/supabase/client'

const projectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST

if (projectToken && host) {
  // Pageviews start disabled: persistence only exists after init(), and the
  // initial $pageview must not be attributed to a since-revoked or expired
  // admin. startPageviews() turns them on once the identity is known-good.
  posthog.init(projectToken, {
    api_host: host,
    defaults: '2026-01-30',
    capture_exceptions: true,
    capture_pageview: false,
    debug: process.env.NODE_ENV === 'development',
  })

  if (posthog._isIdentified()) {
    void validateIdentityThenStartPageviews()
  } else {
    startPageviews()
  }
} else if (process.env.NODE_ENV === 'development') {
  // Analytics are optional locally: warn instead of breaking every page load.
  console.warn(
    '[posthog] NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN / NEXT_PUBLIC_POSTHOG_HOST not set; analytics disabled.'
  )
}

function startPageviews() {
  posthog.capture('$pageview')
  // Installs the history listeners that a false capture_pageview skipped.
  posthog.set_config({ capture_pageview: 'history_change' })
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
    startPageviews()
  }
}
