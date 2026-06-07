'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createHash } from 'node:crypto'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRate } from '@/lib/rate-limit'
import type { TablesUpdate } from '@/lib/supabase/database.types'
import type { Tariff } from './data'

export type WorkshopSubmitResult =
  | { ok: true }
  | { ok: false, error: string }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const NAME_MAX = 200
const INSTAGRAM_MAX = 200
const MESSAGE_MAX = 2000

async function getClientIp(): Promise<string> {
  const h = await headers()
  const fwd = h.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return h.get('x-real-ip') ?? 'unknown'
}

type ServerSupabase = Awaited<ReturnType<typeof createClient>>

async function requireAdmin(supabase: ServerSupabase) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const { data: isAdmin, error } = await supabase.rpc('is_admin')
  if (error || !isAdmin) throw new Error('Forbidden')
}

// ---------------------------------------------------------------------------
// Public form submission
// ---------------------------------------------------------------------------

export async function submitWorkshopApplication(
  formData: FormData
): Promise<WorkshopSubmitResult> {
  // Honeypot — bots that fill the hidden `website` field get silently dropped.
  const honeypot = (formData.get('website') ?? '').toString()
  if (honeypot.trim() !== '') return { ok: true }

  const name = (formData.get('name') ?? '').toString().trim()
  const email = (formData.get('email') ?? '').toString().trim()
  const instagram = (formData.get('instagram') ?? '').toString().trim()
  const message = (formData.get('message') ?? '').toString().trim()

  if (name.length < 1 || name.length > NAME_MAX) {
    return { ok: false, error: 'Please enter your name.' }
  }
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return { ok: false, error: 'Please enter a valid email.' }
  }
  if (instagram.length > INSTAGRAM_MAX) {
    return { ok: false, error: 'Instagram handle is too long.' }
  }
  if (message.length > MESSAGE_MAX) {
    return { ok: false, error: `Message is too long (max ${MESSAGE_MAX} characters).` }
  }

  const ip = await getClientIp()
  if (!checkRate(`workshop:${ip}`)) {
    return { ok: false, error: 'Too many requests — try again in a few minutes.' }
  }

  const h = await headers()
  const userAgent = h.get('user-agent')?.slice(0, 500) ?? null
  const ipHash = createHash('sha256')
    .update(`${ip}:${process.env.BOOKING_IP_SALT ?? ''}`)
    .digest('hex')

  const supabase = createAdminClient()

  // Re-check the visibility gate server-side. The page/banner already disappear
  // when is_visible flips false, but a stale browser tab can still POST this
  // action. Without this check, applications would keep landing in the DB after
  // intake is closed.
  const { data: workshopRow, error: workshopErr } = await supabase
    .from('workshop')
    .select('is_visible, tariffs')
    .limit(1)
    .maybeSingle()

  if (workshopErr) {
    console.error('workshop: failed to read visibility', workshopErr)
    return { ok: false, error: 'Something went wrong on our side. Please try again later.' }
  }
  if (!workshopRow || !workshopRow.is_visible) {
    return { ok: false, error: 'Applications are closed.' }
  }

  // Resolve the chosen intake. The posted value is a public-form input, so we
  // only trust the two known keys and resolve the *label* server-side from the
  // current tariffs — never store a client-provided free-text label. An
  // invalid/missing key (or a key with no matching tariff) leaves intake null
  // and the application is still accepted.
  const intakeKey = (formData.get('intake') ?? '').toString().trim()
  let intake: string | null = null
  if (intakeKey === 'short' || intakeKey === 'full') {
    const tariffs = (workshopRow.tariffs as Tariff[] | null) ?? []
    const tariff = tariffs.find((t) => t.key === intakeKey)
    if (tariff) intake = `${tariff.name} — ${tariff.price}`
  }

  const { data: recipientRow, error: recipientErr } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'booking_recipient_email')
    .maybeSingle()

  if (recipientErr) {
    console.error('workshop: failed to read recipient email', recipientErr)
    return { ok: false, error: 'Something went wrong on our side. Please try again later.' }
  }
  const recipient = recipientRow?.value?.trim()
  if (!recipient) {
    console.error('workshop: recipient email not configured')
    return { ok: false, error: 'Applications are temporarily unavailable. Please email directly.' }
  }

  const { error: insertErr } = await supabase.from('workshop_applications').insert({
    name,
    email,
    instagram: instagram.length > 0 ? instagram : null,
    message: message.length > 0 ? message : null,
    intake,
    ip_hash: ipHash,
    user_agent: userAgent,
  })

  if (insertErr) {
    console.error('workshop: insert failed', insertErr)
    return { ok: false, error: 'Could not save your application. Please try again.' }
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    // DB row is already saved — application is not lost; log and move on.
    console.error('workshop: RESEND_API_KEY is not set; skipping email notification')
    return { ok: true }
  }

  // Same display-name-as-applicant trick the booking flow uses, so the inbox
  // shows "alex@example.com via workshop"; Reply-To still goes to the applicant.
  const fromAddressRaw = process.env.BOOKING_FROM_ADDRESS ?? 'onboarding@resend.dev'
  const fromAddress = fromAddressRaw.match(/<([^>]+)>/)?.[1]?.trim() ?? fromAddressRaw.trim()
  const displayName = email.replace(/["<>\r\n]/g, '').slice(0, 80)
  const from = `"${displayName} via workshop" <${fromAddress}>`

  const body = [
    'New workshop application',
    '',
    `Name: ${name}`,
    `Email: ${email}`,
    `Instagram: ${instagram.length > 0 ? instagram : '(none)'}`,
    `Intake: ${intake ?? '(not specified)'}`,
    '',
    'Message:',
    message.length > 0 ? message : '(no message)',
    '',
    `Received: ${new Date().toISOString()}`,
  ].join('\n')

  try {
    const resend = new Resend(apiKey)
    const result = await resend.emails.send({
      from,
      to: recipient,
      replyTo: email,
      subject: 'New workshop application',
      text: body,
    })
    if (result.error) {
      console.error('workshop: resend returned error', result.error)
    }
  } catch (err) {
    console.error('workshop: resend threw', err)
  }

  return { ok: true }
}

// ---------------------------------------------------------------------------
// Admin actions — all gated by requireAdmin()
// ---------------------------------------------------------------------------

export async function updateWorkshop(
  patch: TablesUpdate<'workshop'>
): Promise<void> {
  const supabase = await createClient()
  await requireAdmin(supabase)

  // Fetch the single row's id; we never insert from the admin UI.
  const { data: row, error: fetchErr } = await supabase
    .from('workshop')
    .select('id')
    .limit(1)
    .maybeSingle()
  if (fetchErr || !row) {
    throw new Error('Workshop row not found')
  }

  const { error } = await supabase
    .from('workshop')
    .update(patch)
    .eq('id', row.id)

  if (error) {
    throw new Error(`Failed to update workshop: ${error.message}`)
  }

  revalidatePath('/')
  revalidatePath('/workshop')
  revalidatePath('/admin')
}

export async function deleteWorkshopApplication(id: string): Promise<void> {
  const supabase = await createClient()
  await requireAdmin(supabase)

  const { error } = await supabase
    .from('workshop_applications')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to delete workshop application: ${error.message}`)
  }

  revalidatePath('/admin')
}
