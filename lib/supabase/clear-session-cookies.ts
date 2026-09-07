/**
 * Removes Supabase auth cookies (`sb-<ref>-auth-token`, including chunked
 * `.0`, `.1`, … variants) directly in the browser. Used as a fallback when
 * `signOut()` fails before it reaches `_removeSession()`, e.g. network or
 * Auth-service outage, so a leftover session cannot re-authenticate /admin.
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
}
