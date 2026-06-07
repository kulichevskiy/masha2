// Server wrapper for the floating CTA cluster. Resolves whether the gift page
// is visible (RLS-gated reader returns null when hidden) and hands the flag to
// the client cluster, which owns the per-route visibility rules.

import { getPublicGiftCertificate } from '../gift/data'
import { FloatingBookButton } from './floating-book-button'

export async function FloatingCta() {
  const gift = await getPublicGiftCertificate()
  return <FloatingBookButton giftVisible={Boolean(gift?.is_visible)} />
}
