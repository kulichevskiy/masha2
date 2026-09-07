import type { Instrumentation } from 'next'

const FLUSH_TIMEOUT_MS = 2000

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
  const posthog = new PostHog(projectToken, {
    host,
    flushAt: 1,
    flushInterval: 0,
    requestTimeout: FLUSH_TIMEOUT_MS,
  })

  // Only the pathname: /auth/confirm and /auth/callback carry token_hash and
  // OAuth code in the query string and must never reach a third party.
  const pathname = request.path.split(/[?#]/, 1)[0]

  posthog.captureException(error, readDistinctId(request.headers.cookie, projectToken), {
    path: pathname,
    method: request.method,
    router_kind: context.routerKind,
    route_path: context.routePath,
    route_type: context.routeType,
    render_source: context.renderSource,
  })

  // Best-effort flush; never let an analytics outage delay the error response.
  await Promise.race([
    posthog.shutdown().catch(() => undefined),
    new Promise<void>((resolve) => setTimeout(resolve, FLUSH_TIMEOUT_MS)),
  ])
}

function readDistinctId(
  cookie: string | string[] | undefined,
  projectToken: string
): string {
  const header = Array.isArray(cookie) ? cookie.join(';') : cookie
  if (!header) return 'server'

  const name = `ph_${projectToken}_posthog=`
  const raw = header
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(name))
    ?.slice(name.length)
  if (!raw) return 'server'

  try {
    const id = JSON.parse(decodeURIComponent(raw)).distinct_id
    return typeof id === 'string' && id ? id : 'server'
  } catch {
    return 'server'
  }
}
