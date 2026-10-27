import { Resend, type CreateEmailOptions } from 'resend'

export function notificationSender(email: string) {
  const raw = process.env.BOOKING_FROM_ADDRESS ?? 'onboarding@resend.dev'
  const address = raw.match(/<([^>]+)>/)?.[1]?.trim() ?? raw.trim()
  const name = email.replace(/["<>\r\n]/g, '').slice(0, 80)
  // Callers supply the form name to preserve the established display name.
  return { address, name }
}
export async function sendNotification(
  apiKey: string,
  message: Omit<CreateEmailOptions, 'from'> & { from: ReturnType<typeof notificationSender> },
  prefix: string,
) {
  try {
    const result = await new Resend(apiKey).emails.send({
      ...message,
      from: `"${message.from.name} via ${prefix}" <${message.from.address}>`,
    } as CreateEmailOptions)
    if (result.error) console.error(`${prefix}: resend returned error`, result.error)
  } catch (error) {
    console.error(`${prefix}: resend threw`, error)
  }
}
