'use client'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import posthog from 'posthog-js'
import { useEffect } from 'react'

export function LogoutButton() {
  const router = useRouter()

  useEffect(() => {
    let cancelled = false

    const identifyCurrentUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!cancelled && user) {
        posthog.identify(user.id, user.email ? { email: user.email } : {})
      }
    }

    void identifyCurrentUser()

    return () => {
      cancelled = true
    }
  }, [])

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
