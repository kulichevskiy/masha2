'use client'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import posthog from 'posthog-js'

export function LogoutButton() {
  const router = useRouter()

  const logout = async () => {
    const supabase = createClient()
    const { error } = await supabase.auth.signOut()

    if (!error) {
      posthog.capture('user_logged_out')
      posthog.reset()
      router.push('/auth/login')
    }
  }

  return <Button onClick={logout}>Выйти</Button>
}
