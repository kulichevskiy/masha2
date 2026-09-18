import { ApiError } from './errors'

export function response(data: unknown, status = 200, extra: Record<string, string> = {}) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', ...extra } })
}
export function result(data: unknown, status = 200) {
  const version = data && typeof data === 'object' && 'version' in data ? data.version : undefined
  return response({ data }, status, typeof version === 'number' ? { ETag: `"${version}"` } : {})
}
export function expectedVersion(request: Request): number {
  const value = request.headers.get('if-match')
  if (!value) throw new ApiError(428, 'precondition_required', 'Send the ETag from the latest read in If-Match')
  const match = /^"([1-9][0-9]*)"$/.exec(value)
  const parsed = Number(match?.[1])
  if (!match || !Number.isSafeInteger(parsed) || parsed > 2147483647) throw new ApiError(400, 'invalid_request', 'If-Match must contain one quoted integer version')
  return parsed
}
export function pagination(url: URL) {
  const integer = (key: string, fallback: number, max: number) => {
    const raw = url.searchParams.get(key)
    if (raw === null) return fallback
    if (!/^\d+$/.test(raw)) throw new ApiError(400, 'invalid_request', `Invalid ${key}`)
    const number = Number(raw)
    if (!Number.isSafeInteger(number) || number > max || (key === 'limit' && number < 1)) throw new ApiError(400, 'invalid_request', `Invalid ${key}`)
    return number
  }
  return { limit: integer('limit', 50, 100), offset: integer('offset', 0, 10000000) }
}

export async function jsonBody(request: Request): Promise<unknown> {
  if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') throw new ApiError(415, 'unsupported_media_type', 'Send application/json')
  const max = 1024 * 1024
  if (Number(request.headers.get('content-length') ?? 0) > max) throw new ApiError(413, 'payload_too_large', 'JSON body exceeds 1 MiB')
  const reader = request.body?.getReader()
  if (!reader) throw new ApiError(400, 'invalid_request', 'A JSON object is required')
  let length = 0
  const chunks: Uint8Array[] = []
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    length += value.length
    if (length > max) {
      await reader.cancel()
      throw new ApiError(413, 'payload_too_large', 'JSON body exceeds 1 MiB')
    }
    chunks.push(value)
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')) }
  catch { throw new ApiError(400, 'invalid_request', 'Malformed JSON') }
}
