import type { Instrumentation } from 'next'

/**
 * Server-side error capture. Errors thrown while rendering server components
 * reach app/global-error.tsx already redacted by Next.js, so report the
 * original exception here before sanitisation.
 */
export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context
) => {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  const projectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST
  if (!projectToken || !host) return

  const { PostHog } = await import('posthog-node')
  const posthog = new PostHog(projectToken, { host, flushAt: 1, flushInterval: 0 })

  let distinctId = 'server'
  const cookie = request.headers.cookie
  const cookieHeader = Array.isArray(cookie) ? cookie.join(';') : cookie
  const match = cookieHeader?.match(/ph_[^_]+_posthog=([^;]+)/)
  if (match) {
    try {
      distinctId = JSON.parse(decodeURIComponent(match[1])).distinct_id ?? distinctId
    } catch {
      // Ignore malformed cookie; fall back to the anonymous server id.
    }
  }

  posthog.captureException(error, distinctId, {
    path: request.path,
    method: request.method,
    router_kind: context.routerKind,
    route_path: context.routePath,
    route_type: context.routeType,
    render_source: context.renderSource,
  })
  await posthog.shutdown()
}
