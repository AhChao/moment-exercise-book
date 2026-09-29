import { describe, expect, it } from 'vitest'
import { decodeSuggest, developChips, encodeSuggest, signed } from './suggest'

describe('suggest', () => {
  it('round-trips a suggestion', () => {
    const dev = { shadows: -50, highlights: 0, exposure: 10, warmth: 0 }
    expect(decodeSuggest(encodeSuggest(dev))).toEqual(dev)
  })

  it('rejects malformed and all-zero input', () => {
    expect(decodeSuggest(undefined)).toBeNull()
    expect(decodeSuggest('1,2,3')).toBeNull()
    expect(decodeSuggest('a,b,c,d')).toBeNull()
    expect(decodeSuggest('0,0,0,0')).toBeNull()
  })

  it('clamps out-of-range values', () => {
    expect(decodeSuggest('500,0,0,-500')).toEqual({ shadows: 100, highlights: 0, exposure: 0, warmth: -100 })
  })

  it('lists only non-zero sliders as chips', () => {
    expect(developChips({ shadows: -50, highlights: 0, exposure: 0, warmth: 40 })).toEqual(['陰影 -50', '暖度 +40'])
    expect(developChips(null)).toEqual([])
    expect(signed(0)).toBe('0')
  })
})
