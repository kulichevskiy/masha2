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
  const { data: token, error } = await db.rpc('admin_api_authenticate', { p_token_hash: tokenHash })
  databaseError(error)
  if (!token) throw new ApiError(401, 'unauthorized', 'Invalid or revoked token')
  return token as Principal
}
