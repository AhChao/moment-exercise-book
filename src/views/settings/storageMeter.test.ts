import { describe, expect, it } from 'vitest'
import { usagePercent } from './storageMeter'

describe('usagePercent', () => {
  it('computes a rounded share', () => {
    expect(usagePercent(50, 200)).toBe(25)
  })
  it('never shows an invisible bar for non-zero usage', () => {
    expect(usagePercent(1, 1_000_000)).toBe(1)
  })
  it('clamps at 100', () => {
    expect(usagePercent(300, 200)).toBe(100)
  })
  it('handles missing quota or usage', () => {
    expect(usagePercent(10, 0)).toBe(0)
    expect(usagePercent(0, 100)).toBe(0)
    expect(usagePercent(Number.NaN, 100)).toBe(0)
  })
})
