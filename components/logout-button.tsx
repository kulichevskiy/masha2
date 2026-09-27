'use client'

import { createClient } from '@/lib/supabase/client'
import { clearSupabaseSessionCookies } from '@/lib/supabase/clear-session-cookies'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import posthog from 'posthog-js'

export function LogoutButton() {
  const router = useRouter()

  const logout = async () => {
    const supabase = createClient()
    // Capture while still identified: PostHogAuthSync resets on SIGNED_OUT,
    // which fires inside signOut() before it resolves.
    posthog.capture('user_logged_out')

    const { error } = await supabase.auth.signOut()
    if (error) {
      // Remote revocation failed (network / 5xx). signOut() only removes the
      // stored session after the /logout call succeeds (even with
      // scope: 'local'), so drop the cookies ourselves to make sure /admin
      // cannot re-authenticate from them.
      clearSupabaseSessionCookies()
    }

    posthog.reset()
    router.push('/auth/login')
  }

  return <Button onClick={logout}>Выйти</Button>
}
