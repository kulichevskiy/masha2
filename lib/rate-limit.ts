// Per-key in-memory rate limit shared across server actions.
// Module-level Map — survives as long as the Node instance does.
// Good enough for a portfolio's traffic; swap for Upstash if abuse starts.

type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

const DEFAULT_WINDOW_MS = 10 * 60 * 1000
const DEFAULT_MAX = 3

export type RateLimitOptions = {
  windowMs?: number
  max?: number
  /** Inject a clock for tests. Defaults to Date.now. */
  now?: () => number
}

export function checkRate(key: string, opts: RateLimitOptions = {}): boolean {
  const windowMs = opts.windowMs ?? DEFAULT_WINDOW_MS
  const max = opts.max ?? DEFAULT_MAX
  const now = (opts.now ?? Date.now)()

  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (bucket.count >= max) return false
  bucket.count += 1
  return true
}

// Test helper — not for production use.
export function __resetRateLimitForTests(): void {
  buckets.clear()
}
