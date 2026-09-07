'use client'

import { usePathname } from 'next/navigation'
import posthog from 'posthog-js'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

function resetIfIdentified() {
  if (posthog._isIdentified()) posthog.reset()
}

/**
 * Drops a stale PostHog identity when the Supabase session disappears without
 * going through LogoutButton (e.g. the /admin middleware revoking a non-admin,
 * or an expired session). Mounted once in the root layout; re-checks on every
 * client-side navigation because middleware cookie mutations do not emit
 * onAuthStateChange events.
 */
export function PostHogAuthSync() {
  const pathname = usePathname()

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false

    void supabase.auth.getUser().then(({ data: { user }, error }) => {
      if (cancelled || user) return
      // Only a confirmed absence counts: a transient Auth outage also yields
      // user: null but must not wipe a legitimately identified admin.
      const sessionMissing = !error || error.name === 'AuthSessionMissingError'
      if (sessionMissing) resetIfIdentified()
    })

    return () => {
      cancelled = true
    }
  }, [pathname])

  useEffect(() => {
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') resetIfIdentified()
    })
    return () => subscription.unsubscribe()
  }, [])

  return null
}
