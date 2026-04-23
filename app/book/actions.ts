'use server'

import { headers } from 'next/headers'
import { createHash } from 'node:crypto'
import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/admin'

export type BookingSubmitResult =
  | { ok: true }
  | { ok: false, error: string }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MESSAGE_MAX = 2000

// Per-IP rate limit. Module-level Map — survives as long as the Node instance
// does. Good enough for a portfolio's traffic; swap for Upstash if abuse starts.
const RATE_WINDOW_MS = 10 * 60 * 1000
const RATE_MAX = 3
const rateBuckets = new Map<string, { count: number, resetAt: number }>()

function checkRate(ip: string): boolean {
  const now = Date.now()
  const bucket = rateBuckets.get(ip)
  if (!bucket || bucket.resetAt < now) {
    rateBuckets.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return true
  }
  if (bucket.count >= RATE_MAX) return false
  bucket.count += 1
  return true
}

async function getClientIp(): Promise<string> {
  const h = await headers()
  const fwd = h.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return h.get('x-real-ip') ?? 'unknown'
}

export async function submitBookingRequest(
  formData: FormData
): Promise<BookingSubmitResult> {
  // Honeypot: any bot that fills the hidden `website` field gets silently accepted
  // (no DB write, no email). Humans using password managers won't hit this.
  const honeypot = (formData.get('website') ?? '').toString()
  if (honeypot.trim() !== '') return { ok: true }

  const email = (formData.get('email') ?? '').toString().trim()
  const tierIdRaw = (formData.get('tier_id') ?? '').toString().trim()
  const message = (formData.get('message') ?? '').toString().trim()

  if (!EMAIL_RE.test(email) || email.length > 254) {
    return { ok: false, error: 'Please enter a valid email.' }
  }
  if (message.length > MESSAGE_MAX) {
    return { ok: false, error: `Message is too long (max ${MESSAGE_MAX} characters).` }
  }
  const tierId = tierIdRaw.length > 0 ? tierIdRaw : null

  const ip = await getClientIp()
  if (!checkRate(ip)) {
    return { ok: false, error: 'Too many requests — try again in a few minutes.' }
  }

  const h = await headers()
  const userAgent = h.get('user-agent')?.slice(0, 500) ?? null
  const ipHash = createHash('sha256')
    .update(`${ip}:${process.env.BOOKING_IP_SALT ?? ''}`)
    .digest('hex')

  const supabase = createAdminClient()

  const { data: recipientRow, error: recipientErr } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'booking_recipient_email')
    .maybeSingle()

  if (recipientErr) {
    console.error('booking: failed to read recipient email', recipientErr)
    return { ok: false, error: 'Something went wrong on our side. Please try again later.' }
  }
  const recipient = recipientRow?.value?.trim()
  if (!recipient) {
    console.error('booking: recipient email not configured')
    return { ok: false, error: 'Bookings are temporarily unavailable. Please email directly.' }
  }

  let tierName: string | null = null
  if (tierId) {
    const { data: tierRow } = await supabase
      .from('booking_tiers')
      .select('name')
      .eq('id', tierId)
      .maybeSingle()
    tierName = tierRow?.name ?? null
  }

  const { error: insertErr } = await supabase.from('booking_requests').insert({
    email,
    tier_id: tierId,
    message: message.length > 0 ? message : null,
    ip_hash: ipHash,
    user_agent: userAgent,
  })

  if (insertErr) {
    console.error('booking: insert failed', insertErr)
    return { ok: false, error: 'Could not save your request. Please try again.' }
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    // DB row is already saved — request is not lost; log and move on.
    console.error('booking: RESEND_API_KEY is not set; skipping email notification')
    return { ok: true }
  }

  // `from` must be a verified domain (Resend rejects spoofed sender addresses).
  // Stuff the applicant email into the display-name instead — inbox column
  // shows e.g. "alex@example.com via booking", while Reply-To still points at
  // the applicant so hitting Reply goes straight to them.
  const fromAddressRaw = process.env.BOOKING_FROM_ADDRESS ?? 'onboarding@resend.dev'
  const fromAddress = fromAddressRaw.match(/<([^>]+)>/)?.[1]?.trim() ?? fromAddressRaw.trim()
  const displayName = email.replace(/["<>\r\n]/g, '').slice(0, 80)
  const from = `"${displayName} via booking" <${fromAddress}>`
  const tierLabel = tierName ?? 'general'

  const body = [
    `New booking request`,
    ``,
    `Tier: ${tierLabel}`,
    `Email: ${email}`,
    ``,
    `Message:`,
    message.length > 0 ? message : '(no message)',
    ``,
    `Received: ${new Date().toISOString()}`,
  ].join('\n')

  try {
    const resend = new Resend(apiKey)
    const result = await resend.emails.send({
      from,
      to: recipient,
      replyTo: email,
      subject: `New booking request — ${tierLabel}`,
      text: body,
    })
    if (result.error) {
      console.error('booking: resend returned error', result.error)
    }
  } catch (err) {
    console.error('booking: resend threw', err)
  }

  return { ok: true }
}
