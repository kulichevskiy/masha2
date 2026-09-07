'use client'

import posthog from 'posthog-js'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

/**
 * Drops a stale PostHog identity when the Supabase session disappears without
 * going through LogoutButton (e.g. the /admin middleware revoking a non-admin,
 * or an expired session). Mounted once in the root layout.
 */
export function PostHogAuthSync() {
  useEffect(() => {
    const supabase = createClient()

    const resetIfIdentified = () => {
      if (posthog._isIdentified()) posthog.reset()
    }

    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) resetIfIdentified()
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') resetIfIdentified()
    })

    return () => subscription.unsubscribe()
  }, [])

  return null
}
