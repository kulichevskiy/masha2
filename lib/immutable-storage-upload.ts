import type { SupabaseClient } from '@supabase/supabase-js'

export const IMMUTABLE_CACHE_CONTROL = 'public, max-age=31536000, immutable'

/** Upload with an exact Cache-Control header (the Storage SDK always prepends max-age=). */
export async function uploadImmutableObject(
  supabase: SupabaseClient,
  bucket: string,
  objectPath: string,
  body: Blob,
  contentType = body.type
): Promise<{ error: { message: string } | null }> {
  const { data: { session } } = await supabase.auth.getSession()
  const apiKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY!
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/${bucket}/${objectPath.split('/').map(encodeURIComponent).join('/')}`,
    {
      method: 'POST',
      headers: {
        apikey: apiKey,
        Authorization: `Bearer ${session?.access_token ?? apiKey}`,
        'Cache-Control': IMMUTABLE_CACHE_CONTROL,
        'Content-Type': contentType || 'application/octet-stream',
        'x-upsert': 'false',
      },
      body,
    }
  )

  if (response.ok) return { error: null }
  let message = `Storage upload failed (${response.status})`
  try {
    const payload = await response.json() as { message?: string; error?: string }
    message = payload.message ?? payload.error ?? message
  } catch {}
  return { error: { message } }
}
