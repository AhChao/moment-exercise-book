import { describe, expect, it } from 'vitest'
import { resolveExposure, scaleByStops, usesStops } from './exposureMath'

const isoRange = { min: 30, max: 7518 }
const shutterRange = { min: 1 / 17000, max: 16 }
const base = { isoRange, shutterRange }

describe('scaleByStops', () => {
  it('doubles per stop', () => {
    expect(scaleByStops(100, 1)).toBe(200)
    expect(scaleByStops(100, -2)).toBe(25)
    expect(scaleByStops(100, 0)).toBe(100)
    expect(scaleByStops(100, 0.5)).toBeCloseTo(141.42, 1)
  })
})

describe('resolveExposure', () => {
  it('scales ISO for a prescribed shutter', () => {
    const r = resolveExposure({ ...base, shutterSec: 1 / 60, iso: null, stops: 2, baseIso: 200 })
    expect(r.iso).toBe(800)
    expect(r.shutterSec).toBe(1 / 60)
    expect(r.achievedStops).toBeCloseTo(2)
    expect(r.clamped).toBeNull()
  })

  it('scales shutter for a prescribed ISO', () => {
    const r = resolveExposure({ ...base, shutterSec: null, iso: 100, stops: -1, baseShutterSec: 1 / 30 })
    expect(r.shutterSec).toBeCloseTo(1 / 60)
    expect(r.iso).toBe(100)
    expect(r.achievedStops).toBeCloseTo(-1)
    expect(r.clamped).toBeNull()
  })

  it('reports the stops actually delivered when ISO hits the ceiling', () => {
    const r = resolveExposure({ ...base, shutterSec: 1 / 500, iso: null, stops: 3, baseIso: 3000 })
    expect(r.iso).toBe(7518)
    expect(r.clamped).toBe('iso-max')
    expect(r.achievedStops).toBeCloseTo(Math.log2(7518 / 3000))
  })

  it('reports the floor when the light is too bright for the shutter', () => {
    const r = resolveExposure({ ...base, shutterSec: 1 / 30, iso: null, stops: -2, baseIso: 60 })
    expect(r.iso).toBe(30)
    expect(r.clamped).toBe('iso-min')
    expect(r.achievedStops).toBeCloseTo(-1)
  })

  it('clamps the shutter at both ends', () => {
    const slow = resolveExposure({ ...base, shutterSec: null, iso: 50, stops: 3, baseShutterSec: 4 })
    expect(slow.shutterSec).toBe(16)
    expect(slow.clamped).toBe('shutter-max')
    expect(slow.achievedStops).toBeCloseTo(2)
    const fast = resolveExposure({ ...base, shutterSec: null, iso: 50, stops: -2, baseShutterSec: 1 / 20000 })
    expect(fast.shutterSec).toBeCloseTo(1 / 17000)
    expect(fast.clamped).toBe('shutter-min')
  })

  it('returns both-prescribed and both-free inputs unchanged', () => {
    const both = resolveExposure({ ...base, shutterSec: 1 / 60, iso: 400, stops: 2, baseIso: 100 })
    expect(both).toEqual({ iso: 400, shutterSec: 1 / 60, achievedStops: 0, clamped: null })
    const free = resolveExposure({ ...base, shutterSec: null, iso: null, stops: 2 })
    expect(free).toEqual({ iso: null, shutterSec: null, achievedStops: 0, clamped: null })
  })
})

describe('usesStops', () => {
  it('is true for exactly one prescribed value', () => {
    expect(usesStops(1 / 60, null)).toBe(true)
    expect(usesStops(null, 100)).toBe(true)
    expect(usesStops(1 / 60, 100)).toBe(false)
    expect(usesStops(null, null)).toBe(false)
  })
})
