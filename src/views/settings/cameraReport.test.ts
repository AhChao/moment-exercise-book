import { describe, expect, it } from 'vitest'
import type { Capabilities } from '@/camera/types'
import { buildCameraReport } from './cameraReport'

const pixel: Capabilities = {
  available: true,
  torch: true,
  zoom: { min: 1, max: 20, step: 0.1 },
  iso: { min: 30, max: 7518, step: 1 },
  shutterSec: { min: 0.000057, max: 16, step: 0.00001 },
  ev: { min: -4, max: 4, step: 1 / 6 },
  wbKelvin: { min: 2850, max: 7000, step: 50 },
  focusMeters: { min: 0.05, max: 3.772, step: 0.01 },
  canManualExposure: true,
  canManualWB: true,
  canManualFocus: true,
}

const byKey = (caps: Capabilities) => Object.fromEntries(buildCameraReport(caps).map((r) => [r.key, r]))

describe('buildCameraReport', () => {
  it('lists the six controls in a fixed order', () => {
    expect(buildCameraReport(pixel).map((r) => r.key)).toEqual(['shutter', 'iso', 'ev', 'wb', 'focus', 'zoom'])
  })

  it('formats ranges for a full-featured phone', () => {
    const r = byKey(pixel)
    expect(r.shutter?.available).toBe(true)
    expect(r.shutter?.detail).toBe('1/17544 – 16 s')
    expect(r.iso?.detail).toBe('30 – 7518')
    expect(r.ev?.detail).toBe('-4 – 4 EV')
    expect(r.wb?.detail).toBe('2850 – 7000 K')
    expect(r.focus?.detail).toBe('0.05 – 3.77 m')
    expect(r.zoom?.detail).toBe('1× – 20×')
  })

  it('marks controls the phone lacks as unavailable with no detail', () => {
    const r = byKey({ ...pixel, canManualExposure: false, canManualWB: false, ev: undefined })
    for (const key of ['shutter', 'iso', 'ev', 'wb']) {
      expect(r[key]?.available).toBe(false)
      expect(r[key]?.detail).toBe('')
    }
    expect(r.focus?.available).toBe(true)
  })

  it('reports everything unavailable when the camera is not available', () => {
    expect(buildCameraReport({ ...pixel, available: false }).every((r) => !r.available)).toBe(true)
  })
})
