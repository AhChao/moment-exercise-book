// The verified capture sequence, proven on a Pixel 10 (see docs/spec.md, MANUAL EXPOSURE RELIABILITY).
import type { AppliedSettings, CaptureSpec, ExifInfo } from '@/types'
import { parseExif } from '../lib/exif'
import { CameraError } from './types'
import type { CapturePhase, CaptureResult, Capabilities } from './types'
import type { ConstraintSet, Device } from './device'
import { splitConstraints, unitsToSec } from './constraints'
import { compareToRequest } from './verify'

export const MAX_ATTEMPTS = 3
export const AUTO_SETTLE_MS = 600
export const MANUAL_SETTLE_MS = 1500
/** White balance, focus and compensation need a moment to settle when exposure is automatic. */
export const OTHERS_SETTLE_MS = 1000
const WB_TOLERANCE_K = 150

export type ExifParser = (blob: Blob) => Promise<ExifInfo>

const message = (e: unknown): string => (e instanceof Error ? `${e.name}: ${e.message}` : String(e))

/**
 * Applies zoom / white balance / focus / compensation sets. Individual failures are ignored:
 * an unsupported property must not block the shot. After a manual colour temperature the track
 * is read back; the phone sometimes ignores the first apply, so it is retried once.
 */
async function applyOthers(device: Device, sets: ConstraintSet[]): Promise<void> {
  for (const set of sets) {
    try {
      await device.apply(set)
      const want = set.colorTemperature
      if (typeof want === 'number') {
        const got = device.settings().colorTemperature
        if (got !== undefined && Math.abs(got - want) > WB_TOLERANCE_K) await device.apply(set)
      }
    } catch {
      // best effort
    }
  }
}

function buildApplied(spec: CaptureSpec, exif: ExifInfo | undefined, device: Device): AppliedSettings {
  const s = device.settings()
  const applied: AppliedSettings = {}
  const shutter = exif?.exposureTime ?? (s.exposureTime !== undefined ? unitsToSec(s.exposureTime) : undefined)
  const iso = exif?.iso ?? s.iso
  if (shutter !== undefined) applied.shutterSec = shutter
  if (iso !== undefined) applied.iso = iso
  // Auto-mode track values are unreliable, so only prescribed axes are recorded from the track.
  if (spec.ev !== null && s.exposureCompensation !== undefined) applied.ev = s.exposureCompensation
  if (spec.wbKelvin !== null && s.colorTemperature !== undefined) applied.wbKelvin = s.colorTemperature
  if (s.zoom !== undefined) applied.zoom = s.zoom
  if (spec.focusMeters !== null && s.focusDistance !== undefined) applied.focusMeters = s.focusDistance
  return applied
}

export async function captureWithDevice(
  device: Device,
  spec: CaptureSpec,
  caps: Capabilities,
  onPhase: (phase: CapturePhase) => void = () => {},
  parse: ExifParser = parseExif,
): Promise<CaptureResult> {
  const { exposure, others } = splitConstraints(spec, caps)
  const prescribed = spec.shutterSec !== null || spec.iso !== null

  if (!prescribed) {
    onPhase('preparing')
    await applyOthers(device, others)
    onPhase('settling')
    await device.sleep(OTHERS_SETTLE_MS)
    onPhase('shooting')
    let blob: Blob
    try {
      blob = await device.takePhoto()
    } catch (e) {
      throw new CameraError('failed', message(e))
    }
    const exif = await parse(blob)
    return { blob, applied: buildApplied(spec, exif, device), verified: true, attempts: 1 }
  }

  let blob: Blob | undefined
  let exif: ExifInfo | undefined
  let mismatch = 'no photo taken'
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    onPhase(attempt === 1 ? 'preparing' : 'retrying')
    try {
      await applyOthers(device, others)
      await device.apply({ exposureMode: 'continuous' })
      await device.sleep(AUTO_SETTLE_MS)
      if (exposure) await device.apply(exposure)
      onPhase('settling')
      await device.sleep(MANUAL_SETTLE_MS)
      onPhase('shooting')
      blob = await device.takePhoto()
      onPhase('verifying')
      exif = await parse(blob)
      const v = compareToRequest(spec, exif)
      if (v.ok) return { blob, applied: buildApplied(spec, exif, device), verified: true, attempts: attempt }
      mismatch = v.mismatch ?? 'mismatch'
    } catch (e) {
      mismatch = message(e)
    }
    if (attempt < MAX_ATTEMPTS) await device.reopen()
  }
  if (!blob) throw new CameraError('failed', mismatch)
  return { blob, applied: buildApplied(spec, exif, device), verified: false, attempts: MAX_ATTEMPTS, mismatch }
}
