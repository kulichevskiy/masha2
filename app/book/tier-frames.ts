// Which photograph stands beside each booking tier. A tier can carry its own
// frame (`photo_path`, pinned in admin); every tier without one takes the next
// unused portrait from the top of the /portraits feed, in feed order, so the
// page never shows an empty plate and Maria curates the defaults the same way
// she curates the home page. The pure assignment lives here; fetching is in
// tier-photos.ts.

import type { HomeFrame } from '@/lib/home-story-photos'

export type TierPhotoSource = { id: string; photo_path: string | null }

export function assignTierFrames(
  tiers: TierPhotoSource[],
  pinned: (path: string) => HomeFrame,
  portraits: HomeFrame[]
): Record<string, HomeFrame | null> {
  const frames: Record<string, HomeFrame | null> = {}
  let next = 0
  for (const tier of tiers) {
    if (tier.photo_path) {
      frames[tier.id] = pinned(tier.photo_path)
    } else {
      frames[tier.id] = portraits[next] ?? null
      next += 1
    }
  }
  return frames
}

// "300 €" is a price; "upon request" is not. The page sets the two apart.
export function isPricedTier(priceText: string): boolean {
  return /\d/.test(priceText)
}
