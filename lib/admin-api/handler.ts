import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Json } from '@/lib/supabase/database.types'
import { authenticate, type AdminDb, type Principal } from './auth'
import { ApiError, databaseError } from './errors'
import { expectedVersion, jsonBody, pagination, response, result } from './http'
import { resources } from './resources'
import { reorderSchema, uuid, validate, validatePatch } from './schema'
import { beginUpload, drainStorageCleanup, getUpload, verifyUpload } from './uploads'

type Context = { db: AdminDb; token: Principal; auditId: string | null }
const supportedMethods = ['GET', 'POST', 'PATCH', 'DELETE']

async function mutate(ctx: Context, resource: string, action: string, id: string, version: number | null, data: unknown) {
  const { data: row, error } = await ctx.db.rpc('admin_api_mutate', {
    p_resource: resource, p_action: action, p_id: id, p_expected_version: version,
    p_data: data as Json, p_token_id: ctx.token.id, p_audit_id: ctx.auditId!,
  })
  databaseError(error)
  return row
}

function invalidate() {
  for (const path of ['/admin', '/', '/new', '/kids', '/video', '/book', '/workshop', '/gift']) revalidatePath(path)
}

function validateId(id: string) { validate(uuid, id, 'id'); return id }
function notFound(): never { throw new ApiError(404, 'not_found', 'Unknown API endpoint') }
function notAllowed(): never { throw new ApiError(405, 'method_not_allowed', 'Method not available for this resource') }

async function dispatch(request: Request, path: string[], ctx: Context): Promise<Response> {
  const [name, id, action] = path
  const url = new URL(request.url)
  if (name === 'uploads') {
    if (path.length === 1 && request.method === 'POST') return result(await beginUpload(ctx.db, ctx.token, await jsonBody(request), ctx.auditId!), 201)
    if (path.length === 2 && request.method === 'GET') {
      const upload = await getUpload(ctx.db, ctx.token, validateId(id))
      return result({ id: upload.id, expires_at: upload.expires_at, completed_at: upload.completed_at, result: upload.result })
    }
    if (path.length === 3 && action === 'complete' && request.method === 'POST') {
      await verifyUpload(ctx.db, ctx.token, validateId(id))
      return result(await mutate(ctx, 'uploads', 'complete-upload', id, null, {}))
    }
    notFound()
  }
  const resource = Object.hasOwn(resources, name) ? resources[name] : undefined
  if (!resource || path.length > 2 || (resource.singleton && id)) notFound()
  if (id === 'reorder') {
    if (!resource.reorder || request.method !== 'POST') notAllowed()
    const data = validate(reorderSchema, await jsonBody(request)) as { items: { id: string; version: number }[] }
    if (new Set(data.items.map(item => item.id)).size !== data.items.length) throw new ApiError(400, 'invalid_request', 'Duplicate reorder id')
    return result(await mutate(ctx, name, 'reorder', '', null, data))
  }
  if (id) validateId(id)
  if (request.method === 'GET') {
    let query = ctx.db.from(resource.table).select(resource.columns)
    if (name === 'settings') query = query.eq('key', 'booking_recipient_email')
    if (id) query = query.eq('id', id)
    if (resource.singleton || id) {
      const { data, error } = await query.limit(1).maybeSingle()
      databaseError(error)
      if (!data) throw new ApiError(404, 'not_found', 'Resource not found')
      return result(data)
    }
    const allowedParams = ['limit', 'offset', ...(name === 'media' ? ['kind', 'page'] : []), ...(name === 'workshop-subscribers' ? ['season', 'city'] : [])]
    for (const key of url.searchParams.keys()) if (!allowedParams.includes(key)) throw new ApiError(400, 'invalid_request', `Unknown query parameter: ${key}`)
    if (name === 'media') {
      const kind = url.searchParams.get('kind'), page = url.searchParams.get('page')
      if (kind) { validate({ type: 'string', enum: ['photo', 'video'] }, kind, 'kind'); query = query.eq('kind', kind) }
      if (page) { validate({ type: 'string', enum: ['portraits', 'kids', 'video'] }, page, 'page'); query = query.contains('pages', [page]) }
    }
    if (name === 'workshop-subscribers') {
      for (const [key, column, values] of [['season', 'seasons', ['winter', 'spring', 'summer']], ['city', 'cities', ['berlin', 'hamburg', 'paris']]] as const) {
        const value = url.searchParams.get(key)
        if (value) { validate({ type: 'string', enum: [...values] }, value, key); query = query.contains(column, [value]) }
      }
    }
    const { limit, offset } = pagination(url)
    query = resource.ordered ? query.order('position').order('id') : query.order('created_at', { ascending: false }).order('id', { ascending: false })
    const { data, error } = await query.range(offset, offset + limit)
    databaseError(error)
    return response({ data: (data ?? []).slice(0, limit), pagination: { limit, offset, next_offset: (data?.length ?? 0) > limit ? offset + limit : null } })
  }
  if (request.method === 'POST' && !id && resource.create) {
    const data = validatePatch(name, await jsonBody(request), true)
    return result(await mutate(ctx, name, 'create', '', null, data), 201)
  }
  if (request.method === 'PATCH' && (resource.singleton || id) && resource.update) {
    const version = expectedVersion(request)
    const data = validatePatch(name, await jsonBody(request))
    return result(await mutate(ctx, name, 'update', name === 'settings' ? 'booking_recipient_email' : id ?? '', version, data))
  }
  if (request.method === 'DELETE' && id && resource.delete) {
    await mutate(ctx, name, 'delete', id, expectedVersion(request), {})
    return result({ id, deleted: true })
  }
  notAllowed()
}

export async function handleApi(request: Request, path: string[], suppliedDb?: AdminDb): Promise<Response> {
  let context: Context | undefined
  let mutating = false
  try {
    const db = suppliedDb ?? createAdminClient()
    const token = await authenticate(request, db)
    context = { db, token, auditId: null }
    mutating = request.method !== 'GET' && request.method !== 'HEAD'
    if (mutating) {
      const safeResource = Object.hasOwn(resources, path[0]) || path[0] === 'uploads' ? path[0] : 'unknown'
      const safeId = /^[a-f0-9-]{36}$/i.test(path[1] ?? '') ? path[1] : null
      const { data, error } = await db.from('api_audit_log').insert({ token_id: token.id, token_name: token.name, operation: `${request.method}${path[1] === 'reorder' ? ' reorder' : path[2] === 'complete' ? ' complete' : ''}`, resource: safeResource, resource_id: safeId, status: 'started' }).select('id').single()
      databaseError(error)
      context.auditId = data!.id
    }
    if (!supportedMethods.includes(request.method)) notAllowed()
    const output = await dispatch(request, path, context)
    if (mutating) {
      invalidate()
      await drainStorageCleanup(db).catch(() => undefined)
    }
    return output
  } catch (cause) {
    const error = cause instanceof ApiError ? cause : new ApiError(500, 'internal_error', 'The operation could not be completed')
    if (context?.auditId) {
      // Never store request content, token values, exception messages or URLs.
      try {
        await context.db.from('api_audit_log').update({ status: 'failed', error_code: error.code, completed_at: new Date().toISOString() }).eq('id', context.auditId).eq('status', 'started')
      } catch { /* An unavailable database leaves an explicit started entry. */ }
    }
    return response({ error: { code: error.code, message: error.message } }, error.status, error.status === 401 ? { 'WWW-Authenticate': 'Bearer' } : {})
  }
}
