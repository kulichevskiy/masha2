'use client'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import posthog from 'posthog-js'

export function LogoutButton() {
  const router = useRouter()

  const logout = async () => {
    const supabase = createClient()
    // Complete the local logout regardless of the server response: the
    // session cookies are cleared locally even when the remote call fails.
    await supabase.auth.signOut()
    posthog.capture('user_logged_out')
    posthog.reset()
    router.push('/auth/login')
  }

  return <Button onClick={logout}>Выйти</Button>
}
