'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createHash } from 'node:crypto'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRate } from '@/lib/rate-limit'
import type { TablesUpdate } from '@/lib/supabase/database.types'
import type { Amount } from './data'

export type GiftSubmitResult =
  | { ok: true }
  | { ok: false, error: string }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

async function getClientIp(): Promise<string> {
  const h = await headers()
  const fwd = h.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return h.get('x-real-ip') ?? 'unknown'
}

export async function submitGiftOrder(
  formData: FormData
): Promise<GiftSubmitResult> {
  // Honeypot — bots that fill the hidden `website` field get silently dropped.
  const honeypot = (formData.get('website') ?? '').toString()
  if (honeypot.trim() !== '') return { ok: true }

  const email = (formData.get('email') ?? '').toString().trim()
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return { ok: false, error: 'Please enter a valid email.' }
  }

  const ip = await getClientIp()
  if (!checkRate(`gift:${ip}`)) {
    return { ok: false, error: 'Too many requests — try again in a few minutes.' }
  }

  const h = await headers()
  const userAgent = h.get('user-agent')?.slice(0, 500) ?? null
  const ipHash = createHash('sha256')
    .update(`${ip}:${process.env.BOOKING_IP_SALT ?? ''}`)
    .digest('hex')

  const supabase = createAdminClient()

  // Resolve the chosen amount. The posted value is a public-form input, so we
  // never store a client-provided free-text price — we look the id up in the
  // gift_certificate singleton's amounts and snapshot its display price. An
  // invalid/missing id leaves amount null and the order is still accepted.
  const amountId = (formData.get('amount_id') ?? '').toString().trim()
  let amount: string | null = null
  if (amountId) {
    const { data: giftRow } = await supabase
      .from('gift_certificate')
      .select('amounts')
      .limit(1)
      .maybeSingle()
    const amounts = (giftRow?.amounts as Amount[] | null) ?? []
    amount = amounts.find((a) => a.id === amountId)?.price ?? null
  }

  const { data: recipientRow, error: recipientErr } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'booking_recipient_email')
    .maybeSingle()

  if (recipientErr) {
    console.error('gift: failed to read recipient email', recipientErr)
    return { ok: false, error: 'Something went wrong on our side. Please try again later.' }
  }
  const recipient = recipientRow?.value?.trim()
  if (!recipient) {
    console.error('gift: recipient email not configured')
    return { ok: false, error: 'Gift orders are temporarily unavailable. Please email directly.' }
  }

  const { error: insertErr } = await supabase.from('gift_certificate_requests').insert({
    email,
    amount,
    ip_hash: ipHash,
    user_agent: userAgent,
  })

  if (insertErr) {
    console.error('gift: insert failed', insertErr)
    return { ok: false, error: 'Could not save your order. Please try again.' }
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    // DB row is already saved — order is not lost; log and move on.
    console.error('gift: RESEND_API_KEY is not set; skipping email notification')
    return { ok: true }
  }

  // Same display-name-as-buyer trick the booking flow uses, so the inbox shows
  // "buyer@example.com via gift"; Reply-To still goes to the buyer.
  const fromAddressRaw = process.env.BOOKING_FROM_ADDRESS ?? 'onboarding@resend.dev'
  const fromAddress = fromAddressRaw.match(/<([^>]+)>/)?.[1]?.trim() ?? fromAddressRaw.trim()
  const displayName = email.replace(/["<>\r\n]/g, '').slice(0, 80)
  const from = `"${displayName} via gift" <${fromAddress}>`

  const body = [
    'New gift certificate order',
    '',
    `Amount: ${amount ?? '(not specified)'}`,
    `Email: ${email}`,
    '',
    `Received: ${new Date().toISOString()}`,
  ].join('\n')

  try {
    const resend = new Resend(apiKey)
    const result = await resend.emails.send({
      from,
      to: recipient,
      replyTo: email,
      subject: 'New gift certificate order',
      text: body,
    })
    if (result.error) {
      console.error('gift: resend returned error', result.error)
    }
  } catch (err) {
    console.error('gift: resend threw', err)
  }

  return { ok: true }
}

// ---------------------------------------------------------------------------
// Admin actions — all gated by requireAdmin()
// ---------------------------------------------------------------------------

type ServerSupabase = Awaited<ReturnType<typeof createClient>>

async function requireAdmin(supabase: ServerSupabase) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const { data: isAdmin, error } = await supabase.rpc('is_admin')
  if (error || !isAdmin) throw new Error('Forbidden')
}

export async function updateGiftCertificate(
  patch: TablesUpdate<'gift_certificate'>
): Promise<void> {
  const supabase = await createClient()
  await requireAdmin(supabase)

  // Fetch the single row's id; we never insert from the admin UI.
  const { data: row, error: fetchErr } = await supabase
    .from('gift_certificate')
    .select('id')
    .limit(1)
    .maybeSingle()
  if (fetchErr || !row) {
    throw new Error('Gift certificate row not found')
  }

  const { error } = await supabase
    .from('gift_certificate')
    .update(patch)
    .eq('id', row.id)

  if (error) {
    throw new Error(`Failed to update gift certificate: ${error.message}`)
  }

  revalidatePath('/')
  revalidatePath('/gift')
  revalidatePath('/admin')
}

export async function deleteGiftCertificateRequest(id: string): Promise<void> {
  const supabase = await createClient()
  await requireAdmin(supabase)

  const { error } = await supabase
    .from('gift_certificate_requests')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to delete gift certificate request: ${error.message}`)
  }

  revalidatePath('/admin')
}
