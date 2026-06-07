// Workshop content reader. Two entry points by audience:
//   - getPublicWorkshop(): RLS-gated (returns null when is_visible = false).
//   - getAdminWorkshop(): service-role; always returns the row.
// Both convert the raw row + jsonb columns into a typed Workshop.

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Tables } from '@/lib/supabase/database.types'

type WorkshopRow = Tables<'workshop'>

export type ProgramDay = {
  day: string
  title: string
  body: string
  photo_path: string | null
}

export type ScheduleRow = [string, string]

export type GalleryItem = {
  photo_path: string
}

export type FaqItem = {
  question: string
  answer: string
}

// Two fixed pricing tiers shown on /workshop, ordered `short` then `full`.
// `key` is a fixed slot identity (not user-editable); `featured` marks the
// black anchor card (Full = true).
export type Tariff = {
  key: 'short' | 'full'
  name: string
  days: string
  price: string
  summary: string
  desc: string
  days_list: string[]
  extras: string[]
  note: string
  featured: boolean
}

export type Workshop = {
  id: string
  is_visible: boolean
  workshop_number: string | null
  title: string | null
  tagline: string | null
  dates: string | null
  location: string | null
  price: string | null
  seats: string | null
  hero_photo_path: string | null
  intro: string | null
  the_idea_heading: string | null
  the_idea_quote: string | null
  apply_heading: string | null
  apply_intro: string | null
  program: ProgramDay[]
  schedule: ScheduleRow[]
  includes: string[]
  bring: string[]
  tariffs: Tariff[]
  gallery: GalleryItem[]
  faq: FaqItem[]
}

// jsonb columns come back as `Json`; cast in one place so the rest of the
// app sees a clean typed shape. Bad data from the admin form would surface
// as a render-time error, not a type error — fine for a single-tenant app.
function normalise(row: WorkshopRow): Workshop {
  return {
    id: row.id,
    is_visible: row.is_visible,
    workshop_number: row.workshop_number,
    title: row.title,
    tagline: row.tagline,
    dates: row.dates,
    location: row.location,
    price: row.price,
    seats: row.seats,
    hero_photo_path: row.hero_photo_path,
    intro: row.intro,
    the_idea_heading: row.the_idea_heading,
    the_idea_quote: row.the_idea_quote,
    apply_heading: row.apply_heading,
    apply_intro: row.apply_intro,
    program: (row.program as ProgramDay[] | null) ?? [],
    schedule: (row.schedule as ScheduleRow[] | null) ?? [],
    includes: (row.includes as string[] | null) ?? [],
    bring: (row.bring as string[] | null) ?? [],
    tariffs: (row.tariffs as Tariff[] | null) ?? [],
    gallery: (row.gallery as GalleryItem[] | null) ?? [],
    faq: (row.faq as FaqItem[] | null) ?? [],
  }
}

export async function getPublicWorkshop(): Promise<Workshop | null> {
  const supabase = await createClient()
  // Explicit visibility filter. RLS already hides the row for anon, but the
  // cookie-backed server client picks up the admin's session on /workshop,
  // and the "Admins can view all workshop" policy would otherwise expose
  // hidden drafts to logged-in admins on the public route.
  const { data, error } = await supabase
    .from('workshop')
    .select('*')
    .eq('is_visible', true)
    .limit(1)
    .maybeSingle()
  if (error || !data) return null
  return normalise(data)
}

export async function getAdminWorkshop(): Promise<Workshop | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('workshop')
    .select('*')
    .limit(1)
    .maybeSingle()
  if (error || !data) return null
  return normalise(data)
}

// Builds a public URL for a storage path inside the `photos` bucket.
// Workshop photos live under the `workshop/` prefix.
export function workshopPhotoUrl(
  supabaseUrl: string,
  storagePath: string | null | undefined
): string | null {
  if (!storagePath) return null
  return `${supabaseUrl}/storage/v1/object/public/photos/${storagePath}`
}
