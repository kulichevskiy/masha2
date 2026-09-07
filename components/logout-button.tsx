'use client'

import { createClient } from '@/lib/supabase/client'
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
      // Remote revocation failed (network / 5xx): still clear the local
      // session so /admin cannot re-authenticate from the leftover cookies.
      await supabase.auth.signOut({ scope: 'local' })
    }

    posthog.reset()
    router.push('/auth/login')
  }

  return <Button onClick={logout}>Выйти</Button>
}
