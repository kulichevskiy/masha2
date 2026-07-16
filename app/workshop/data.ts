// Workshop content reader. Two entry points by audience:
//   - getPublicWorkshop(): the public /workshop page — always returns the row.
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

// One column in the "03 — the three days" breakdown. Fixed three of these on the
// page (Day 1/2/3). `note` is an optional annotation line under the heading
// (e.g. "extended option only" on the third day); `bullets` is the column list.
export type WorkshopDay = {
  day: string
  title: string
  note: string
  bullets: string[]
}

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
  sales_open: boolean
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
  closed_heading: string | null
  closed_intro: string | null
  tariffs_intro: string | null
  program: ProgramDay[]
  days: WorkshopDay[]
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
    sales_open: row.sales_open,
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
    closed_heading: row.closed_heading,
    closed_intro: row.closed_intro,
    tariffs_intro: row.tariffs_intro,
    program: (row.program as ProgramDay[] | null) ?? [],
    // Coerce each day to the full shape. The column was seeded out-of-band, so
    // defend against rows missing `note`/`bullets` rather than trusting the cast.
    days: ((row.days as Partial<WorkshopDay>[] | null) ?? []).map((d) => ({
      day: d.day ?? '',
      title: d.title ?? '',
      note: d.note ?? '',
      bullets: Array.isArray(d.bullets) ? d.bullets : [],
    })),
    tariffs: (row.tariffs as Tariff[] | null) ?? [],
    gallery: (row.gallery as GalleryItem[] | null) ?? [],
    faq: (row.faq as FaqItem[] | null) ?? [],
  }
}

export async function getPublicWorkshop(): Promise<Workshop | null> {
  const supabase = await createClient()
  // The page is always live — sales_open decides Apply vs Subscribe, not
  // visibility — so there's no filter here: everyone reads the singleton row.
  const { data, error } = await supabase
    .from('workshop')
    .select('*')
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
