import { createHash } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { ApiError, databaseError } from './errors'

export type AdminDb = ReturnType<typeof createAdminClient>
export type Principal = { id: string; name: string; owner_id: string }
export async function authenticate(request: Request, db: AdminDb): Promise<Principal> {
  const authorization = request.headers.get('authorization') ?? ''
  if (!/^Bearer mcp_[a-f0-9]{64}$/i.test(authorization)) throw new ApiError(401, 'unauthorized', 'A valid Bearer PAT is required')
  const secret = authorization.slice(7)
  const tokenHash = createHash('sha256').update(secret).digest('hex')
  const { data: token, error } = await db.from('api_tokens').select('id,name,owner_id,revoked_at').eq('token_hash', tokenHash).maybeSingle()
  databaseError(error)
  if (!token || token.revoked_at) throw new ApiError(401, 'unauthorized', 'Invalid or revoked token')
  const { data: { user }, error: userError } = await db.auth.admin.getUserById(token.owner_id)
  const bannedUntil = user && 'banned_until' in user ? user.banned_until : null
  if (userError || !user?.email || (typeof bannedUntil === 'string' && Date.parse(bannedUntil) > Date.now())) throw new ApiError(401, 'unauthorized', 'Token owner is no longer an administrator')
  const { data: membership, error: memberError } = await db.from('admin_emails').select('email').eq('email', user.email).maybeSingle()
  databaseError(memberError)
  if (!membership) throw new ApiError(401, 'unauthorized', 'Token owner is no longer an administrator')
  const used = await db.from('api_tokens').update({ last_used_at: new Date().toISOString() }).eq('id', token.id).is('revoked_at', null)
  databaseError(used.error)
  return token
}
