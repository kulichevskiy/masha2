import { describe, expect, it } from 'vitest'
import { FALLBACK_DIMENSIONS, resolveImageDimensions } from './image-dimensions'

describe('resolveImageDimensions', () => {
  it('returns the stored dimensions when both are valid', () => {
    expect(resolveImageDimensions(1600, 1200)).toEqual({ width: 1600, height: 1200 })
  })

  it('rounds fractional dimensions to whole pixels', () => {
    expect(resolveImageDimensions(800.6, 600.4)).toEqual({ width: 801, height: 600 })
  })

  it('falls back when height is missing', () => {
    expect(resolveImageDimensions(1600, null)).toEqual(FALLBACK_DIMENSIONS)
  })

  it('falls back when width is missing', () => {
    expect(resolveImageDimensions(null, 1200)).toEqual(FALLBACK_DIMENSIONS)
  })

  it('falls back when both are missing', () => {
    expect(resolveImageDimensions(null, null)).toEqual(FALLBACK_DIMENSIONS)
  })

  it('falls back on non-positive values', () => {
    expect(resolveImageDimensions(0, 1200)).toEqual(FALLBACK_DIMENSIONS)
    expect(resolveImageDimensions(1600, -5)).toEqual(FALLBACK_DIMENSIONS)
  })

  it('falls back on non-finite values', () => {
    expect(resolveImageDimensions(Number.NaN, 1200)).toEqual(FALLBACK_DIMENSIONS)
    expect(resolveImageDimensions(1600, Number.POSITIVE_INFINITY)).toEqual(
      FALLBACK_DIMENSIONS
    )
  })

  it('preserves the 4:5 portrait ratio in the fallback', () => {
    expect(FALLBACK_DIMENSIONS.width / FALLBACK_DIMENSIONS.height).toBeCloseTo(0.8)
  })
})
