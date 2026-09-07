'use client'

import posthog from 'posthog-js'
import { useEffect } from 'react'

type Props = Readonly<{ userId: string; email?: string }>

/**
 * Ties the current PostHog session to an authorised user. Render only from
 * surfaces that have already passed the is_admin gate so rejected accounts
 * are never associated with the browser.
 */
export function PostHogIdentify({ userId, email }: Props) {
  useEffect(() => {
    posthog.identify(userId, email ? { email } : {})
  }, [userId, email])

  return null
}
