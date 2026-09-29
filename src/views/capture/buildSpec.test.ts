import { describe, expect, it } from 'vitest'
import { normalizeCapabilities } from '@/camera/capabilities'
import { PIXEL10_RAW } from '@/camera/pixel10.fixture'
import type { Capabilities } from '@/camera/types'
import type { CaptureSpec } from '@/types'
import { EMPTY_SPEC, availableControls, buildSpec, isFreeChoice, isSlowShot, panelControls } from './buildSpec'

const caps: Capabilities = normalizeCapabilities(PIXEL10_RAW, 'back')
const shot = (over: Partial<CaptureSpec>): CaptureSpec => ({ ...EMPTY_SPEC, ...over })

describe('buildSpec', () => {
  it('keeps prescribed values and ignores overrides on them', () => {
    const spec = buildSpec(shot({ shutterSec: 0.008, iso: 100 }), { shutterSec: 0.5, iso: 800 }, caps)
    expect(spec.shutterSec).toBeCloseTo(0.008, 6)
    expect(spec.iso).toBe(100)
  })

  it('fills null fields from the learner overrides', () => {
    const spec = buildSpec(shot({ zoom: 1 }), { wbKelvin: 4500, focusMeters: 0.3 }, caps)
    expect(spec).toMatchObject({ zoom: 1, wbKelvin: 4500, focusMeters: 0.3, shutterSec: null, iso: null })
  })

  it('clamps overrides to the phone range', () => {
    const spec = buildSpec(EMPTY_SPEC, { zoom: 50, iso: 99999, wbKelvin: 100 }, caps)
    expect(spec.zoom).toBe(caps.zoom!.max)
    expect(spec.iso).toBe(caps.iso!.max)
    expect(spec.wbKelvin).toBe(caps.wbKelvin!.min)
  })

  it('drops compensation while shutter or ISO is fixed', () => {
    expect(buildSpec(EMPTY_SPEC, { ev: 1 }, caps).ev).toBe(1)
    expect(buildSpec(EMPTY_SPEC, { ev: 1, iso: 200 }, caps).ev).toBeNull()
    expect(buildSpec(shot({ shutterSec: 0.01 }), { ev: 1 }, caps).ev).toBeNull()
  })

  it('nulls controls the phone does not expose', () => {
    const limited: Capabilities = { ...caps, canManualExposure: false, canManualWB: false, canManualFocus: false }
    const spec = buildSpec(EMPTY_SPEC, { shutterSec: 0.01, iso: 200, wbKelvin: 4000, focusMeters: 1, ev: 1 }, limited)
    expect(spec).toMatchObject({ shutterSec: null, iso: null, wbKelvin: null, focusMeters: null, ev: 1 })
  })

  it('treats an unavailable camera as having no ranges', () => {
    const none: Capabilities = { available: false, torch: false, canManualExposure: false, canManualWB: false, canManualFocus: false }
    expect(buildSpec(shot({ zoom: 1 }), {}, none)).toEqual(EMPTY_SPEC)
  })
})

describe('panel and flags', () => {
  it('detects a free-choice shot', () => {
    expect(isFreeChoice(EMPTY_SPEC)).toBe(true)
    expect(isFreeChoice(shot({ zoom: 1 }))).toBe(false)
  })

  it('lists panel rows for exposed, unprescribed controls only', () => {
    expect(panelControls(EMPTY_SPEC, caps)).toEqual(['zoom', 'ev', 'shutter', 'iso', 'wb', 'focus'])
    expect(panelControls(shot({ shutterSec: 0.01, iso: 100, zoom: 1 }), caps)).toEqual(['ev', 'wb', 'focus'])
    expect(panelControls(EMPTY_SPEC, { ...caps, canManualWB: false })).not.toContain('wb')
  })

  it('reports availability from capabilities', () => {
    const avail = availableControls({ ...caps, zoom: { min: 1, max: 1, step: 0.1 } })
    expect(avail.zoom).toBe(false)
    expect(avail.shutter).toBe(true)
  })

  it('marks 1/15 s and slower as slow', () => {
    expect(isSlowShot(shot({ shutterSec: 1 / 15 }))).toBe(true)
    expect(isSlowShot(shot({ shutterSec: 1 }))).toBe(true)
    expect(isSlowShot(shot({ shutterSec: 1 / 30 }))).toBe(false)
    expect(isSlowShot(EMPTY_SPEC)).toBe(false)
  })
})
