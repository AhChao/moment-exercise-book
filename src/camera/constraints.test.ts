import { describe, expect, it } from 'vitest'
import type { CaptureSpec } from '@/types'
import { normalizeCapabilities } from './capabilities'
import { buildPreviewConstraints, buildShotConstraints, secToUnits, unitsToSec } from './constraints'
import { PIXEL10_RAW } from './pixel10.fixture'

const caps = normalizeCapabilities(PIXEL10_RAW)
const AUTO: CaptureSpec = { shutterSec: null, iso: null, ev: null, wbKelvin: null, zoom: null, focusMeters: null }
const spec = (p: Partial<CaptureSpec>): CaptureSpec => ({ ...AUTO, ...p })

describe('unit conversion', () => {
  it('uses 100 microsecond units', () => {
    expect(secToUnits(1 / 100)).toBeCloseTo(100, 6)
    expect(unitsToSec(10000)).toBe(1)
  })
  it('round trips', () => {
    for (const s of [1 / 8000, 1 / 125, 0.5, 4]) expect(unitsToSec(secToUnits(s))).toBeCloseTo(s, 12)
  })
})

describe('buildShotConstraints', () => {
  it('puts manual exposure into ONE object first', () => {
    const sets = buildShotConstraints(spec({ shutterSec: 0.01, iso: 400 }), caps)
    expect(sets[0]).toEqual({ exposureMode: 'manual', iso: 400, exposureTime: 100 })
    expect(sets.filter((s) => 'iso' in s || 'exposureTime' in s)).toHaveLength(1)
  })

  it('clamps into the phone ranges', () => {
    const [hi] = buildShotConstraints(spec({ shutterSec: 100, iso: 99999 }), caps)
    expect(hi.iso).toBe(7518)
    expect(hi.exposureTime as number).toBeCloseTo(160000.02, 1)
    const [lo] = buildShotConstraints(spec({ shutterSec: 1e-9, iso: 1 }), caps)
    expect(lo.iso).toBe(30)
    expect(lo.exposureTime as number).toBeGreaterThanOrEqual(0.56968)
    const zoom = buildShotConstraints(spec({ zoom: 0.5 }), caps).find((s) => 'zoom' in s)
    expect(zoom!.zoom).toBe(1)
    const wb = buildShotConstraints(spec({ wbKelvin: 1000 }), caps).find((s) => 'colorTemperature' in s)
    expect(wb).toEqual({ whiteBalanceMode: 'manual', colorTemperature: 2850 })
  })

  it('falls back to automatic for null fields', () => {
    const sets = buildShotConstraints(AUTO, caps)
    expect(sets).toContainEqual({ whiteBalanceMode: 'continuous' })
    expect(sets).toContainEqual({ focusMode: 'continuous' })
    expect(sets).toContainEqual({ zoom: 1 })
    expect(sets).toContainEqual({ exposureMode: 'continuous' })
    expect(sets.some((s) => 'iso' in s)).toBe(false)
  })

  it('applies ev only while exposure is automatic', () => {
    expect(buildShotConstraints(spec({ ev: 1 }), caps)).toContainEqual({ exposureCompensation: 1 })
    const manual = buildShotConstraints(spec({ ev: 1, iso: 200, shutterSec: 0.01 }), caps)
    expect(manual.some((s) => 'exposureCompensation' in s)).toBe(false)
    expect(buildShotConstraints(spec({ ev: 9 }), caps)).toContainEqual({ exposureCompensation: 4 })
  })

  it('fills the missing half of a manual pair', () => {
    const [s] = buildShotConstraints(spec({ iso: 800 }), caps)
    expect(s.exposureMode).toBe('manual')
    expect(s.iso).toBe(800)
    expect(typeof s.exposureTime).toBe('number')
  })

  it('skips properties the phone does not expose', () => {
    const zoomOnly = normalizeCapabilities({ zoom: { min: 1, max: 4, step: 0.1 } })
    expect(buildShotConstraints(spec({ iso: 100, wbKelvin: 4000 }), zoomOnly)).toEqual([{ zoom: 1 }])
  })

  it('preview uses the same values as the shot', () => {
    const s = spec({ shutterSec: 0.01, iso: 400, zoom: 2 })
    expect(buildPreviewConstraints(s, caps)).toEqual(buildShotConstraints(s, caps))
  })
})
