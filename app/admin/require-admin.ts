import type { createClient } from '@/lib/supabase/server'

export type ServerSupabase = Awaited<ReturnType<typeof createClient>>

// The admin gate every story action runs first: a signed-in user whose email
// is on the admin whitelist (public.is_admin()). RLS enforces the same rule in
// the database; this turns a silent zero-row write into an explicit error.
export async function requireAdmin(supabase: ServerSupabase) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const { data: isAdmin, error } = await supabase.rpc('is_admin')
  if (error || !isAdmin) throw new Error('Forbidden')
}
