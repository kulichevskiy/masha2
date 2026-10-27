// @vitest-environment node
import { afterEach, describe, it, expect, vi } from 'vitest'
const mock = vi.hoisted(() => ({ captureException: vi.fn(), shutdown: vi.fn(async () => {}) }))
vi.mock('posthog-node', () => ({
  PostHog: class {
    captureException = mock.captureException
    shutdown = mock.shutdown
  },
}))
import { onRequestError } from '../instrumentation'
afterEach(() => vi.unstubAllEnvs())
describe('server error analytics', () => {
  it.each([
    undefined,
    'unrelated=1',
    'ph_test_posthog=bad',
    `ph_test_posthog=${encodeURIComponent(JSON.stringify({ distinct_id: 'person' }))}`,
  ])('redacts callback query strings with cookie %s', async (cookie) => {
    vi.stubEnv('NEXT_RUNTIME', 'nodejs')
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN', 'test')
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_HOST', 'https://invalid')
    await onRequestError(
      new Error('failure'),
      { path: '/auth/callback?code=secret', method: 'GET', headers: { cookie } },
      {
        routerKind: 'App Router',
        routePath: '/auth/callback',
        routeType: 'route',
        renderSource: undefined,
        revalidateReason: undefined,
      },
    )
    expect(mock.captureException).toHaveBeenLastCalledWith(
      expect.any(Error),
      cookie?.includes('person') ? 'person' : 'server',
      expect.objectContaining({ path: '/auth/callback' }),
    )
  })
})
