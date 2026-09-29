import { describe, expect, it } from 'vitest'
import { normalizeCapabilities } from './capabilities'
import { PIXEL10_RAW } from './pixel10.fixture'

describe('normalizeCapabilities', () => {
  const caps = normalizeCapabilities(PIXEL10_RAW, 'back camera')

  it('converts exposureTime units to seconds', () => {
    expect(caps.shutterSec!.min).toBeCloseTo(0.56968 / 10000, 10)
    expect(caps.shutterSec!.max).toBeCloseTo(16, 3)
    expect(caps.shutterSec!.step).toBeCloseTo(0.00001, 10)
  })

  it('sets the manual flags', () => {
    expect(caps.available).toBe(true)
    expect(caps.label).toBe('back camera')
    expect(caps.canManualExposure).toBe(true)
    expect(caps.canManualWB).toBe(true)
    expect(caps.canManualFocus).toBe(true)
    expect(caps.torch).toBe(true)
  })

  it('passes ranges through in app units', () => {
    expect(caps.zoom).toEqual({ min: 1, max: 20, step: 0.1 })
    expect(caps.iso).toEqual({ min: 30, max: 7518, step: 1 })
    expect(caps.wbKelvin).toEqual({ min: 2850, max: 7000, step: 50 })
    expect(caps.ev!.min).toBe(-4)
    expect(caps.focusMeters!.max).toBeCloseTo(3.77, 2)
  })

  it('handles an empty object', () => {
    const c = normalizeCapabilities({})
    expect(c.available).toBe(true)
    expect(c.zoom).toBeUndefined()
    expect(c.iso).toBeUndefined()
    expect(c.shutterSec).toBeUndefined()
    expect(c.torch).toBe(false)
    expect(c.canManualExposure).toBe(false)
    expect(c.canManualWB).toBe(false)
    expect(c.canManualFocus).toBe(false)
  })

  it('handles a browser with only zoom (selfie camera)', () => {
    const c = normalizeCapabilities({ zoom: { min: 1, max: 4, step: 0.1 } })
    expect(c.zoom).toEqual({ min: 1, max: 4, step: 0.1 })
    expect(c.canManualExposure).toBe(false)
    expect(c.ev).toBeUndefined()
  })

  it('needs a manual exposure mode for canManualExposure', () => {
    const c = normalizeCapabilities({ ...PIXEL10_RAW, exposureMode: ['continuous'] })
    expect(c.canManualExposure).toBe(false)
  })
})
