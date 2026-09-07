import posthog from 'posthog-js'

const projectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST

if (projectToken && host) {
  posthog.init(projectToken, {
    api_host: host,
    defaults: '2026-01-30',
    capture_exceptions: true,
    debug: process.env.NODE_ENV === 'development',
  })
} else if (process.env.NODE_ENV === 'development') {
  // Analytics are optional locally: warn instead of breaking every page load.
  console.warn(
    '[posthog] NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN / NEXT_PUBLIC_POSTHOG_HOST not set; analytics disabled.'
  )
}
