/** BroadcastChannel name used to tell other tabs the session was cleared locally. */
export const SESSION_CLEARED_CHANNEL = 'supabase-session-cleared'

/**
 * Removes Supabase auth cookies (`sb-<ref>-auth-token`, including chunked
 * `.0`, `.1`, … variants) directly in the browser and notifies other tabs.
 * Used as a fallback when `signOut()` fails before it reaches
 * `_removeSession()`, e.g. network or Auth-service outage, so a leftover
 * session cannot re-authenticate /admin. Supabase's own SIGNED_OUT broadcast
 * does not fire on this path, hence the explicit channel message.
 */
export function clearSupabaseSessionCookies(): void {
  if (typeof document === 'undefined') return
  document.cookie
    .split(';')
    .map((c) => c.trim().split('=', 1)[0])
    .filter((name) => /^sb-.*-auth-token(?:\.\d+)?$/.test(name))
    .forEach((name) => {
      document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`
    })

  if (typeof BroadcastChannel !== 'undefined') {
    const channel = new BroadcastChannel(SESSION_CLEARED_CHANNEL)
    channel.postMessage('signed_out')
    channel.close()
  }
}
