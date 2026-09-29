import { describe, expect, it } from 'vitest'
import type { Capabilities } from '@/camera/types'
import type { CaptureSpec, Exercise, Shot } from '@/types'
import { clampSpec, exerciseNeedsImport, planShot } from './shotPlan'

// Pixel 10 capability object, normalised by hand (exposureTime units -> seconds).
const PIXEL10: Capabilities = {
  available: true,
  zoom: { min: 1, max: 20, step: 0.1 },
  iso: { min: 30, max: 7518, step: 1 },
  shutterSec: { min: 0.000056968, max: 16.000002, step: 0.00001 },
  ev: { min: -4, max: 4, step: 1 / 6 },
  wbKelvin: { min: 2850, max: 7000, step: 50 },
  focusMeters: { min: 0.05, max: 3.77, step: 0.01 },
  torch: true,
  canManualExposure: true,
  canManualWB: true,
  canManualFocus: true,
}
const SELFIE: Capabilities = {
  available: true, zoom: { min: 1, max: 4, step: 0.1 }, torch: false,
  canManualExposure: false, canManualWB: false, canManualFocus: false,
}
const NO_CAMERA: Capabilities = {
  available: false, torch: false, canManualExposure: false, canManualWB: false, canManualFocus: false,
}

const NONE: CaptureSpec = { shutterSec: null, iso: null, ev: null, wbKelvin: null, zoom: null, focusMeters: null }
const shot = (capture: Partial<CaptureSpec>): Shot => ({
  label: 's', capture: { ...NONE, ...capture }, develop: null, hint: '',
})

describe('planShot', () => {
  it('shoots a plain 1x shot in-app', () => {
    expect(planShot(shot({ zoom: 1 }), PIXEL10)).toMatchObject({ mode: 'camera', notes: [] })
  })

  it('always imports zoom 0.5 with reason ultrawide', () => {
    for (const caps of [PIXEL10, SELFIE, NO_CAMERA]) {
      const plan = planShot(shot({ zoom: 0.5 }), caps)
      expect(plan.mode).toBe('import')
      expect(plan.notes).toContain('ultrawide')
    }
    expect(planShot(shot({ zoom: 0.5 }), PIXEL10).notes).toEqual(['ultrawide'])
  })

  it('imports when zoom is outside the range', () => {
    expect(planShot(shot({ zoom: 30 }), PIXEL10)).toMatchObject({ mode: 'import', notes: ['zoom'] })
    expect(planShot(shot({ zoom: 5 }), PIXEL10).mode).toBe('camera')
    expect(planShot(shot({ zoom: 8 }), SELFIE).notes).toEqual(['zoom'])
  })

  it('imports for manual exposure without capability', () => {
    expect(planShot(shot({ shutterSec: 0.01 }), SELFIE).notes).toEqual(['exposure'])
    expect(planShot(shot({ iso: 100 }), SELFIE).notes).toEqual(['exposure'])
    expect(planShot(shot({ shutterSec: 0.01, iso: 100 }), PIXEL10).mode).toBe('camera')
  })

  it('imports for white balance, focus and compensation without capability', () => {
    expect(planShot(shot({ wbKelvin: 5000 }), SELFIE).notes).toEqual(['whiteBalance'])
    expect(planShot(shot({ focusMeters: 0.5 }), SELFIE).notes).toEqual(['focus'])
    expect(planShot(shot({ ev: -1 }), SELFIE).notes).toEqual(['compensation'])
    expect(planShot(shot({ ev: -1 }), PIXEL10).mode).toBe('camera')
  })

  it('collects several reasons at once', () => {
    const plan = planShot(shot({ zoom: 0.5, wbKelvin: 3000, focusMeters: 1 }), SELFIE)
    expect(plan.notes).toEqual(['ultrawide', 'whiteBalance', 'focus'])
  })

  it('treats ev 0 and ev alongside manual exposure as needing nothing extra', () => {
    expect(planShot(shot({ ev: 0 }), SELFIE).mode).toBe('camera')
    const caps = { ...PIXEL10, ev: undefined }
    expect(planShot(shot({ ev: 1, shutterSec: 0.01, iso: 100 }), caps).mode).toBe('camera')
  })

  it('imports with noCamera when the camera is unavailable', () => {
    expect(planShot(shot({ zoom: 1 }), NO_CAMERA)).toMatchObject({ mode: 'import', notes: ['noCamera'] })
    expect(planShot(shot({}), NO_CAMERA).mode).toBe('import')
  })

  it('returns a clamped spec', () => {
    const plan = planShot(shot({ iso: 10000, shutterSec: 0.01 }), PIXEL10)
    expect(plan.spec.iso).toBe(7518)
    expect(plan.spec.shutterSec).toBe(0.01)
  })
})

describe('clampSpec', () => {
  it('clamps to the phone ranges', () => {
    const out = clampSpec(
      { shutterSec: 100, iso: 5, ev: -9, wbKelvin: 9000, zoom: 0.5, focusMeters: 100 },
      PIXEL10,
    )
    expect(out).toEqual({
      shutterSec: 16.000002, iso: 30, ev: -4, wbKelvin: 7000, zoom: 1, focusMeters: 3.77,
    })
  })
  it('keeps nulls and drops values the phone has no range for', () => {
    expect(clampSpec(NONE, PIXEL10)).toEqual(NONE)
    expect(clampSpec({ ...NONE, iso: 100, zoom: 2 }, SELFIE)).toEqual({ ...NONE, zoom: 2 })
  })
})

describe('exerciseNeedsImport', () => {
  const exercise = (shots: Shot[]): Exercise => ({
    id: 'e', title: 't', level: 1, goal: '', scene: '', fixed: [], shots, observe: [],
    reflect: [], needs: [], checks: [], sources: [],
  })
  it('is true when any shot imports', () => {
    expect(exerciseNeedsImport(exercise([shot({ zoom: 1 }), shot({ zoom: 0.5 })]), PIXEL10)).toBe(true)
  })
  it('is false when every shot can be taken', () => {
    expect(exerciseNeedsImport(exercise([shot({ zoom: 1 }), shot({ ev: 1 })]), PIXEL10)).toBe(false)
  })
})
