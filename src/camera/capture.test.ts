import { describe, expect, it } from 'vitest'
import type { CaptureSpec, ExifInfo } from '@/types'
import { captureWithDevice } from './capture'
import type { ExifParser } from './capture'
import { normalizeCapabilities } from './capabilities'
import type { ConstraintSet, Device, DeviceSettings } from './device'
import { CameraError } from './types'
import type { CapturePhase } from './types'
import { PIXEL10_RAW } from './pixel10.fixture'

const AUTO: CaptureSpec = { shutterSec: null, iso: null, ev: null, wbKelvin: null, zoom: null, focusMeters: null }
// Only the exposure trio, so the call log holds nothing but the sequence under test.
const EXPOSURE_ONLY = normalizeCapabilities({
  iso: PIXEL10_RAW.iso, exposureTime: PIXEL10_RAW.exposureTime, exposureMode: PIXEL10_RAW.exposureMode,
})
const SPEC: CaptureSpec = { ...AUTO, shutterSec: 0.01, iso: 400 }

type Step = { exif: Partial<ExifInfo> } | { error: string }
const good: Step = { exif: { iso: 400, exposureTime: 0.01 } }
const bad: Step = { exif: { iso: 337, exposureTime: 0.01 } }

function setup(steps: Step[], settings: DeviceSettings = {}) {
  const log: string[] = []
  const blobs: Blob[] = []
  const exifOf = new Map<Blob, Partial<ExifInfo>>()
  let call = 0
  const device: Device = {
    apply: async (set: ConstraintSet) => { log.push(`apply ${JSON.stringify(set)}`) },
    takePhoto: async () => {
      log.push('takePhoto')
      const step = steps[Math.min(call++, steps.length - 1)]
      if ('error' in step) throw Object.assign(new Error('platform error'), { name: 'UnknownError' })
      const blob = new Blob([new Uint8Array([call])])
      blobs.push(blob)
      exifOf.set(blob, step.exif)
      return blob
    },
    settings: () => settings,
    reopen: async () => { log.push('reopen') },
    sleep: async (ms) => { log.push(`sleep ${ms}`) },
  }
  const parse: ExifParser = async (b) => ({ hasExif: true, hasGps: false, ...exifOf.get(b) })
  return { device, log, blobs, parse }
}

describe('captureWithDevice, prescribed exposure', () => {
  it('succeeds on the first try with the exact call order', async () => {
    const t = setup([good])
    const r = await captureWithDevice(t.device, SPEC, EXPOSURE_ONLY, undefined, t.parse)
    expect(r.verified).toBe(true)
    expect(r.attempts).toBe(1)
    expect(t.log).toEqual([
      'apply {"exposureMode":"continuous"}',
      'sleep 600',
      'apply {"exposureMode":"manual","iso":400,"exposureTime":100}',
      'sleep 1500',
      'takePhoto',
    ])
  })

  it('retries twice on mismatch, then succeeds on attempt 3', async () => {
    const t = setup([bad, bad, good])
    const r = await captureWithDevice(t.device, SPEC, EXPOSURE_ONLY, undefined, t.parse)
    expect(r.attempts).toBe(3)
    expect(r.verified).toBe(true)
    expect(t.log.filter((l) => l === 'reopen')).toHaveLength(2)
    expect(r.blob).toBe(t.blobs[2])
  })

  it('recovers from a platform error', async () => {
    const t = setup([{ error: 'x' }, good])
    const r = await captureWithDevice(t.device, SPEC, EXPOSURE_ONLY, undefined, t.parse)
    expect(r.attempts).toBe(2)
    expect(r.verified).toBe(true)
    expect(t.log.filter((l) => l === 'reopen')).toHaveLength(1)
  })

  it('returns verified false with the mismatch and last blob after three failures', async () => {
    const t = setup([bad, bad, bad])
    const r = await captureWithDevice(t.device, SPEC, EXPOSURE_ONLY, undefined, t.parse)
    expect(r.verified).toBe(false)
    expect(r.attempts).toBe(3)
    expect(r.mismatch).toBe('iso: expected 400, got 337')
    expect(r.blob).toBe(t.blobs[2])
    expect(r.applied.iso).toBe(337)
    // no pointless reopen after the last attempt
    expect(t.log.filter((l) => l === 'reopen')).toHaveLength(2)
  })

  it('keeps the earlier blob when the last attempt throws', async () => {
    const t = setup([bad, bad, { error: 'x' }])
    const r = await captureWithDevice(t.device, SPEC, EXPOSURE_ONLY, undefined, t.parse)
    expect(r.verified).toBe(false)
    expect(r.blob).toBe(t.blobs[1])
    expect(r.mismatch).toContain('UnknownError')
  })

  it('rejects with CameraError when no attempt produced a photo', async () => {
    const t = setup([{ error: 'x' }])
    await expect(captureWithDevice(t.device, SPEC, EXPOSURE_ONLY, undefined, t.parse)).rejects.toBeInstanceOf(CameraError)
  })

  it('reports phases in order across a retry', async () => {
    const t = setup([bad, good])
    const phases: CapturePhase[] = []
    await captureWithDevice(t.device, SPEC, EXPOSURE_ONLY, (p) => phases.push(p), t.parse)
    expect(phases).toEqual([
      'preparing', 'settling', 'shooting', 'verifying',
      'retrying', 'settling', 'shooting', 'verifying',
    ])
  })

  it('reads applied values from EXIF first, then the track', async () => {
    const t = setup([good], { zoom: 1, exposureTime: 100, iso: 999 })
    const r = await captureWithDevice(t.device, SPEC, EXPOSURE_ONLY, undefined, t.parse)
    expect(r.applied).toEqual({ shutterSec: 0.01, iso: 400, zoom: 1 })
  })
})

describe('captureWithDevice, no prescribed exposure', () => {
  it('takes exactly one photo after a 1000 ms settle', async () => {
    const t = setup([{ exif: {} }])
    const phases: CapturePhase[] = []
    const r = await captureWithDevice(t.device, AUTO, normalizeCapabilities(PIXEL10_RAW), (p) => phases.push(p), t.parse)
    expect(r.verified).toBe(true)
    expect(r.attempts).toBe(1)
    expect(t.log.filter((l) => l === 'takePhoto')).toHaveLength(1)
    expect(t.log).toContain('sleep 1000')
    expect(t.log).not.toContain('reopen')
    expect(t.log.some((l) => l.includes('"exposureMode":"manual"'))).toBe(false)
    expect(phases).toEqual(['preparing', 'settling', 'shooting'])
  })

  it('retries a manual colour temperature the phone ignored, once', async () => {
    const t = setup([{ exif: {} }], { colorTemperature: 5000 })
    await captureWithDevice(t.device, { ...AUTO, wbKelvin: 3000 }, normalizeCapabilities(PIXEL10_RAW), undefined, t.parse)
    const wbApplies = t.log.filter((l) => l.includes('colorTemperature'))
    expect(wbApplies).toHaveLength(2)
  })

  it('accepts the phone quantising the colour temperature', async () => {
    const t = setup([{ exif: {} }], { colorTemperature: 2950 })
    const r = await captureWithDevice(t.device, { ...AUTO, wbKelvin: 3000 }, normalizeCapabilities(PIXEL10_RAW), undefined, t.parse)
    expect(t.log.filter((l) => l.includes('colorTemperature'))).toHaveLength(1)
    expect(r.applied.wbKelvin).toBe(2950)
  })
})
