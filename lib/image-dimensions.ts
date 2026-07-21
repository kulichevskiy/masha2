// Shared helpers for reasoning about a photo's intrinsic pixel dimensions.
//
// The feed renders each photo at its natural aspect ratio (no cropping), so it
// needs real width/height to reserve layout space and avoid shift while images
// load. Those dimensions live on photos.width / photos.height, captured at
// upload time and backfilled for older rows. When they are missing (an upload
// predating the backfill, or a file the backfill could not measure) we fall
// back to a neutral 4:5 portrait box so the layout still reserves plausible
// space instead of collapsing.

export const FALLBACK_DIMENSIONS = { width: 1000, height: 1250 } as const

/**
 * Resolve the width/height to hand to next/image. Returns the stored dimensions
 * (rounded to whole pixels) when both are valid positive numbers, otherwise the
 * neutral 4:5 fallback. Only the ratio matters downstream — the image is scaled
 * to the column width via CSS — so the fallback's absolute size is arbitrary.
 */
export function resolveImageDimensions(
  width: number | null | undefined,
  height: number | null | undefined
): { width: number; height: number } {
  if (isValidDimension(width) && isValidDimension(height)) {
    return { width: Math.round(width), height: Math.round(height) }
  }
  return { ...FALLBACK_DIMENSIONS }
}

function isValidDimension(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}
