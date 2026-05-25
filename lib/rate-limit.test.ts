import { describe, it, expect, beforeEach } from 'vitest'
import { checkRate, __resetRateLimitForTests } from './rate-limit'

describe('checkRate', () => {
  beforeEach(() => {
    __resetRateLimitForTests()
  })

  it('allows the first N requests in a window', () => {
    expect(checkRate('a', { max: 3 })).toBe(true)
    expect(checkRate('a', { max: 3 })).toBe(true)
    expect(checkRate('a', { max: 3 })).toBe(true)
  })

  it('rejects the N+1th request inside the window', () => {
    checkRate('b', { max: 3 })
    checkRate('b', { max: 3 })
    checkRate('b', { max: 3 })
    expect(checkRate('b', { max: 3 })).toBe(false)
  })

  it('resets after the window expires', () => {
    let now = 0
    const clock = () => now
    expect(checkRate('c', { max: 2, windowMs: 1000, now: clock })).toBe(true)
    expect(checkRate('c', { max: 2, windowMs: 1000, now: clock })).toBe(true)
    expect(checkRate('c', { max: 2, windowMs: 1000, now: clock })).toBe(false)
    now = 2000
    expect(checkRate('c', { max: 2, windowMs: 1000, now: clock })).toBe(true)
  })

  it('keeps independent keys in independent buckets', () => {
    checkRate('alice', { max: 1 })
    expect(checkRate('alice', { max: 1 })).toBe(false)
    expect(checkRate('bob', { max: 1 })).toBe(true)
  })
})
