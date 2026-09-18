import { randomUUID } from 'node:crypto'
import type { Json } from '@/lib/supabase/database.types'
import type { AdminDb, Principal } from './auth'
import { ApiError, databaseError } from './errors'
import { uploadSchema, validate } from './schema'

export async function beginUpload(db: AdminDb, token: Principal, input: unknown, auditId: string) {
  const data = validate(uploadSchema, input) as Record<string, Json>
  const isVideo = data.kind === 'video'
  if (isVideo ? (data.purpose !== 'media' || data.content_type !== 'video/mp4' || !data.width || !data.height || !data.duration_seconds)
    : (data.content_type === 'video/mp4' || Number(data.size) > 10 * 1024 * 1024 || data.duration_seconds !== undefined)) {
    throw new ApiError(400, 'invalid_request', 'Invalid media format, size or video metadata')
  }
  const id = randomUUID()
  const bucket = isVideo ? 'videos' : 'photos'
  const directory = `${data.purpose === 'media' ? bucket : data.purpose}/api/${id}`
  const extensions: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif', 'video/mp4': 'mp4' }
  // Paths are assigned by the server, never taken from the caller's filename.
  const storagePath = `${directory}/source.${extensions[String(data.content_type)]}`
  const posterPath = isVideo ? `${directory}/poster.jpg` : null
  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
  const source = await db.storage.from(bucket).createSignedUploadUrl(storagePath, { upsert: false })
  databaseError(source.error)
  const poster = posterPath ? await db.storage.from(bucket).createSignedUploadUrl(posterPath, { upsert: false }) : null
  databaseError(poster?.error ?? null)
  // Check revocation and persist the session + audit atomically after signing,
  // before any signed destination is exposed to the caller.
  const inserted = await db.rpc('admin_api_mutate', {
    p_resource: 'uploads', p_action: 'begin-upload', p_id: id, p_expected_version: null,
    p_data: { purpose: data.purpose, kind: data.kind, bucket, storage_path: storagePath, poster_path: posterPath, metadata: data, expires_at: expiresAt },
    p_token_id: token.id, p_audit_id: auditId,
  })
  databaseError(inserted.error)
  return {
    id, expires_at: expiresAt,
    source: { url: source.data!.signedUrl, method: 'PUT', headers: { 'Content-Type': data.content_type, 'Cache-Control': 'public, max-age=31536000, immutable' } },
    poster: poster ? { url: poster.data!.signedUrl, method: 'PUT', headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=31536000, immutable' } } : null,
  }
}

export async function getUpload(db: AdminDb, token: Principal, id: string) {
  const { data, error } = await db.from('api_uploads').select('*').eq('id', id).eq('token_id', token.id).maybeSingle()
  databaseError(error)
  if (!data) throw new ApiError(404, 'not_found', 'Upload not found')
  return data
}

export async function verifyUpload(db: AdminDb, token: Principal, id: string) {
  const upload = await getUpload(db, token, id)
  if (upload.completed_at) return upload
  if (Date.parse(upload.expires_at) <= Date.now()) throw new ApiError(409, 'upload_expired', 'Start a new upload session')
  const metadata = upload.metadata as Record<string, Json>
  for (const path of [upload.storage_path, upload.poster_path].filter((v): v is string => Boolean(v))) {
    const folder = path.slice(0, path.lastIndexOf('/'))
    const name = path.slice(path.lastIndexOf('/') + 1)
    const { data: files, error } = await db.storage.from(upload.bucket).list(folder, { search: name, limit: 10 })
    databaseError(error)
    const file = files?.find(f => f.name === name && f.id)
    if (!file) throw new ApiError(409, 'upload_incomplete', 'Upload source and poster files before completing')
    const size = Number(file.metadata?.size ?? file.metadata?.contentLength)
    const expectedType = path === upload.storage_path ? metadata.content_type : 'image/jpeg'
    const expectedSize = path === upload.storage_path ? Number(metadata.size) : 10 * 1024 * 1024
    if (file.metadata?.mimetype !== expectedType || !Number.isFinite(size) || size <= 0 || (path === upload.storage_path ? size !== expectedSize : size > expectedSize)) {
      throw new ApiError(400, 'invalid_upload', 'Stored file does not match its declared type or size')
    }
  }
  return upload
}

// Deletion commits the DB record + durable queue together. Storage failure never
// turns a live row into a broken reference. Later mutations retry pending work.
export async function drainStorageCleanup(db: AdminDb): Promise<void> {
  const { data, error } = await db.from('api_storage_cleanup').select('*').order('created_at').limit(10)
  if (error) return
  for (const entry of data ?? []) {
    const removed = await db.storage.from(entry.bucket).remove(entry.paths)
    if (!removed.error) await db.from('api_storage_cleanup').delete().eq('id', entry.id)
  }
}
