/**
 * Server actions silently accept submissions whose hidden `website` honeypot
 * is filled (see app/book/actions.ts). Mirror that check client-side so bots
 * never count as conversions in PostHog.
 */
export function isHoneypotFilled(formData: FormData): boolean {
  return (formData.get('website') ?? '').toString().trim() !== ''
}
