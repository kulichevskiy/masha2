'use server'

import { createHash, randomBytes } from 'node:crypto'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ApiActionResult, ApiAdminData, ApiToken } from './api-types'

const TOKEN_FIELDS = 'id, name, prefix, created_at, last_used_at, revoked_at'
const AUDIT_FIELDS = 'id, token_name, operation, resource, resource_id, status, error_code, created_at'
const PAGE_SIZE = 25

async function requireAdmin() {
  const client = await createClient()
  const { data: { user }, error } = await client.auth.getUser()
  if (error || !user) throw new Error('Unauthorized')
  const { data: isAdmin, error: adminError } = await client.rpc('is_admin')
  if (adminError || isAdmin !== true) throw new Error('Forbidden')
  return user.id
}

function serviceClient() {
  return createAdminClient()
}

export async function getApiAdminData(offset = 0): Promise<ApiActionResult<ApiAdminData>> {
  try {
    await requireAdmin()
    if (!Number.isSafeInteger(offset) || offset < 0 || offset > 1_000_000) {
      return { error: 'Некорректная страница журнала.' }
    }
    const client = serviceClient()
    const [tokens, journal] = await Promise.all([
      client.from('api_tokens').select(TOKEN_FIELDS).order('created_at', { ascending: false }).order('id', { ascending: false }),
      client.from('api_audit_log').select(AUDIT_FIELDS).order('created_at', { ascending: false }).order('id', { ascending: false }).range(offset, offset + PAGE_SIZE),
    ])
    if (tokens.error || journal.error) return { error: 'Не удалось загрузить токены и журнал API.' }
    return { data: { tokens: tokens.data ?? [], entries: (journal.data ?? []).slice(0, PAGE_SIZE), offset, hasNext: (journal.data?.length ?? 0) > PAGE_SIZE } }
  } catch {
    return { error: 'Не удалось загрузить данные API. Проверьте доступ к админке.' }
  }
}

export async function createApiToken(name: string): Promise<ApiActionResult<{ token: ApiToken; secret: string }>> {
  try {
    const ownerId = await requireAdmin()
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 100) {
      return { error: 'Введите название токена от 1 до 100 символов.' }
    }
    const secret = `mcp_${randomBytes(32).toString('hex')}`
    const { data, error } = await serviceClient().from('api_tokens').insert({
      owner_id: ownerId,
      name: name.trim(),
      prefix: secret.slice(0, 12),
      token_hash: createHash('sha256').update(secret).digest('hex'),
    }).select(TOKEN_FIELDS).single()
    if (error || !data) return { error: 'Не удалось создать токен. Попробуйте ещё раз.' }
    // Only the successful create response contains the secret. Never log it.
    return { data: { token: data, secret } }
  } catch {
    return { error: 'Не удалось создать токен. Проверьте доступ к админке.' }
  }
}

export async function revokeApiToken(id: string): Promise<ApiActionResult<{ revokedAt: string }>> {
  try {
    await requireAdmin()
    if (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return { error: 'Некорректный токен.' }
    }
    const revokedAt = new Date().toISOString()
    const { data, error } = await serviceClient().from('api_tokens').update({ revoked_at: revokedAt }).eq('id', id).is('revoked_at', null).select('id').maybeSingle()
    if (error || !data) return { error: 'Не удалось отозвать токен. Возможно, он уже отозван. Обновите список.' }
    return { data: { revokedAt } }
  } catch {
    return { error: 'Не удалось отозвать токен. Проверьте доступ к админке.' }
  }
}
