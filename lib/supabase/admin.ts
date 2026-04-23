import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

// Service-role Supabase client. Bypasses RLS — server-only.
// Used for privileged paths that can't go through the cookied auth client:
// reading app_settings from an anon request, writing booking_requests from
// the public /book form. Do NOT import this from client components.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env var'
    )
  }

  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
