import posthog from 'posthog-js'
import { hasSupabaseSessionCookie } from '@/lib/analytics'

const projectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST

if (projectToken && host) {
  posthog.init(projectToken, {
    api_host: host,
    defaults: '2026-01-30',
    capture_exceptions: true,
    debug: process.env.NODE_ENV === 'development',
  })

  // The initial $pageview is scheduled asynchronously by init(), so resetting
  // here (synchronously) keeps a revoked/expired admin's identity off it.
  if (posthog._isIdentified() && !hasSupabaseSessionCookie()) posthog.reset()
} else if (process.env.NODE_ENV === 'development') {
  // Analytics are optional locally: warn instead of breaking every page load.
  console.warn(
    '[posthog] NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN / NEXT_PUBLIC_POSTHOG_HOST not set; analytics disabled.'
  )
}
