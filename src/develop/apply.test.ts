import { describe, expect, it } from 'vitest'
import type { DevelopSpec } from '@/types'
import { applyDevelop } from './apply'
import { isIdentity } from './identity'

const ZERO: DevelopSpec = { shadows: 0, highlights: 0, exposure: 0, warmth: 0 }
const px = (r: number, g = r, b = r, a = 255) => new Uint8ClampedArray([r, g, b, a])
const run = (data: Uint8ClampedArray, dev: Partial<DevelopSpec>) => {
  const out = new Uint8ClampedArray(data)
  applyDevelop(out, { ...ZERO, ...dev })
  return out
}

describe('isIdentity', () => {
  it('detects all-zero, null and non-zero specs', () => {
    expect(isIdentity(ZERO)).toBe(true)
    expect(isIdentity(null)).toBe(true)
    expect(isIdentity({ ...ZERO, warmth: 1 })).toBe(false)
  })
})

describe('applyDevelop identity', () => {
  it('leaves every byte unchanged', () => {
    const data = new Uint8ClampedArray(256 * 4)
    for (let i = 0; i < data.length; i++) data[i] = (i * 37 + 11) % 256
    const before = Array.from(data)
    applyDevelop(data, ZERO)
    expect(Array.from(data)).toEqual(before)
  })
})

describe('applyDevelop monotonicity', () => {
  const values = [0, 1, 8, 32, 64, 100, 128, 170, 200, 240, 254, 255]
  const sliders = [-100, -75, -50, -25, -1, 0, 1, 25, 50, 75, 100]
  for (const key of ['shadows', 'highlights', 'exposure'] as const) {
    it(`increasing ${key} never darkens any channel`, () => {
      for (const r of values) for (const g of values) {
        const src = px(r, g, (r + g) >> 1)
        let prev: Uint8ClampedArray | null = null
        for (const s of sliders) {
          const out = run(src, { [key]: s })
          if (prev) for (let c = 0; c < 3; c++) expect(out[c]).toBeGreaterThanOrEqual(prev[c])
          prev = out
        }
      }
    })
  }
  it('stays monotonic with warmth applied', () => {
    let prev: Uint8ClampedArray | null = null
    for (const s of sliders) {
      const out = run(px(90, 120, 150), { exposure: s, warmth: 40 })
      if (prev) for (let c = 0; c < 3; c++) expect(out[c]).toBeGreaterThanOrEqual(prev[c])
      prev = out
    }
  })
})

describe('applyDevelop clamping and alpha', () => {
  it('clamps to 0 and 255', () => {
    expect(Array.from(run(px(200), { exposure: 100 }).slice(0, 3))).toEqual([255, 255, 255])
    expect(Array.from(run(px(0), { shadows: -100, exposure: -100 }).slice(0, 3))).toEqual([0, 0, 0])
    expect(Array.from(run(px(255), { highlights: 100, exposure: 100 }).slice(0, 3))).toEqual([255, 255, 255])
  })
  it('leaves alpha untouched', () => {
    const out = run(px(100, 100, 100, 77), { shadows: 80, highlights: -60, exposure: 30, warmth: 50 })
    expect(out[3]).toBe(77)
  })
})

describe('applyDevelop tonal behaviour', () => {
  it('positive warmth raises R and lowers B; negative does the reverse; G is kept', () => {
    const warm = run(px(128), { warmth: 50 })
    expect(warm[0]).toBeGreaterThan(128)
    expect(warm[2]).toBeLessThan(128)
    expect(warm[1]).toBe(128)
    const cool = run(px(128), { warmth: -50 })
    expect(cool[0]).toBeLessThan(128)
    expect(cool[2]).toBeGreaterThan(128)
  })
  it('shadows changes dark pixels far more than near-white ones', () => {
    const dark = run(px(20), { shadows: 100 })[0] - 20
    const bright = run(px(250), { shadows: 100 })[0] - 250
    expect(dark).toBeGreaterThan(50)
    expect(Math.abs(bright)).toBeLessThanOrEqual(1)
    expect(dark).toBeGreaterThan(Math.abs(bright) * 20)
  })
  it('highlights changes bright pixels far more than dark ones', () => {
    const bright = 200 - run(px(200), { highlights: -100 })[0]
    const dark = Math.abs(run(px(10), { highlights: -100 })[0] - 10)
    expect(bright).toBeGreaterThan(20)
    expect(dark).toBeLessThanOrEqual(1)
  })
  it('exposure gain follows 2^(exposure/100*1.5)', () => {
    expect(run(px(40), { exposure: 100 })[0]).toBe(Math.round(40 * Math.pow(2, 1.5)))
    expect(run(px(100), { exposure: -100 })[0]).toBe(Math.round(100 * Math.pow(2, -1.5)))
  })
})
