/**
 * Server actions silently accept submissions whose hidden `website` honeypot
 * is filled (see app/book/actions.ts). Mirror that check client-side so bots
 * never count as conversions in PostHog.
 */
export function isHoneypotFilled(formData: FormData): boolean {
  return (formData.get('website') ?? '').toString().trim() !== ''
}

/**
 * True when the browser still holds a Supabase auth cookie (`sb-<ref>-auth-token`,
 * possibly chunked as `.0`, `.1`, …). Cheap synchronous proxy for "has a session",
 * used to drop a stale PostHog identity before any event is sent.
 */
export function hasSupabaseSessionCookie(): boolean {
  if (typeof document === 'undefined') return false
  return /(?:^|;\s*)sb-[^=;]*-auth-token(?:\.\d+)?=/.test(document.cookie)
}
