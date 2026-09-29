import { describe, expect, it } from 'vitest'
import { formatIso, formatShutter } from './format'

describe('formatShutter', () => {
  it('formats fast speeds as 1/N', () => {
    expect(formatShutter(1 / 125)).toBe('1/125')
    expect(formatShutter(0.008)).toBe('1/125')
    expect(formatShutter(1 / 4000)).toBe('1/4000')
    expect(formatShutter(0.25)).toBe('1/4')
    expect(formatShutter(0.4)).toBe('1/3')
  })
  it('formats fractions of a second above 0.4', () => {
    expect(formatShutter(0.5)).toBe('0.5 s')
    expect(formatShutter(0.8)).toBe('0.8 s')
  })
  it('formats one second and longer', () => {
    expect(formatShutter(1)).toBe('1 s')
    expect(formatShutter(2)).toBe('2 s')
    expect(formatShutter(1.5)).toBe('1.5 s')
    expect(formatShutter(16)).toBe('16 s')
  })
  it('returns an empty string for invalid input', () => {
    expect(formatShutter(0)).toBe('')
    expect(formatShutter(NaN)).toBe('')
  })
})

describe('formatIso', () => {
  it('prefixes ISO and rounds', () => {
    expect(formatIso(200)).toBe('ISO 200')
    expect(formatIso(199.6)).toBe('ISO 200')
  })
})
