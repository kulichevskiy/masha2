// Gift-certificate content reader. Read path only for now (order submission is
// a separate slice). getPublicGiftCertificate() is RLS-gated and returns null
// when is_visible = false; both the raw row and its jsonb columns are converted
// into a typed GiftCertificate.

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Tables } from '@/lib/supabase/database.types'

type GiftCertificateRow = Tables<'gift_certificate'>

// One selectable amount tile. `price` is display text (e.g. "450 €"); `id` is a
// stable identity so selection and React keys don't ride on the price string.
export type Amount = {
  id: string
  price: string
}

export type GalleryItem = {
  photo_path: string
}

export type GiftCertificate = {
  id: string
  is_visible: boolean
  body: string | null
  amounts: Amount[]
  gallery: GalleryItem[]
}

// jsonb columns come back as `Json`; cast in one place so the rest of the app
// sees a clean typed shape.
function normalise(row: GiftCertificateRow): GiftCertificate {
  return {
    id: row.id,
    is_visible: row.is_visible,
    body: row.body,
    amounts: (row.amounts as Amount[] | null) ?? [],
    gallery: (row.gallery as GalleryItem[] | null) ?? [],
  }
}

export async function getPublicGiftCertificate(): Promise<GiftCertificate | null> {
  const supabase = await createClient()
  // Explicit visibility filter. RLS already hides the row for anon, but the
  // cookie-backed server client picks up the admin's session on /gift, and the
  // "Admins can view all gift_certificate" policy would otherwise expose a
  // hidden draft to logged-in admins on the public route.
  const { data, error } = await supabase
    .from('gift_certificate')
    .select('*')
    .eq('is_visible', true)
    .limit(1)
    .maybeSingle()
  if (error || !data) return null
  return normalise(data)
}

// Admin reader: service-role, always returns the singleton (including hidden
// drafts) so the /admin editor can see unpublished content.
export async function getAdminGiftCertificate(): Promise<GiftCertificate | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('gift_certificate')
    .select('*')
    .limit(1)
    .maybeSingle()
  if (error || !data) return null
  return normalise(data)
}

// Builds a public URL for a storage path inside the `photos` bucket. Gift
// photos live under the `gift/` prefix.
export function giftPhotoUrl(
  supabaseUrl: string,
  storagePath: string | null | undefined
): string | null {
  if (!storagePath) return null
  return `${supabaseUrl}/storage/v1/object/public/photos/${storagePath}`
}
