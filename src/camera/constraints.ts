import type { CaptureSpec } from '@/types'
import type { Capabilities, RangeCap } from './types'
import type { ConstraintSet } from './device'

/** The Web API's exposureTime unit is 100 microseconds. */
const UNITS_PER_SEC = 10000
export const secToUnits = (sec: number): number => sec * UNITS_PER_SEC
export const unitsToSec = (units: number): number => units / UNITS_PER_SEC

/** Used only when one of shutter / ISO is prescribed: manual mode needs both values. */
const DEFAULT_ISO = 100
const DEFAULT_SHUTTER_SEC = 1 / 60

const clamp = (v: number, r: RangeCap): number => Math.min(r.max, Math.max(r.min, v))

export interface SplitConstraints {
  /** Manual exposure in ONE object, or null when exposure stays automatic. */
  exposure: ConstraintSet | null
  /** Everything else, one property group per set. */
  others: ConstraintSet[]
}

export function splitConstraints(spec: CaptureSpec, caps: Capabilities): SplitConstraints {
  const prescribed = spec.shutterSec !== null || spec.iso !== null
  let exposure: ConstraintSet | null = null
  const others: ConstraintSet[] = []

  if (prescribed) {
    if (caps.canManualExposure && caps.iso && caps.shutterSec) {
      const sec = clamp(spec.shutterSec ?? DEFAULT_SHUTTER_SEC, caps.shutterSec)
      exposure = {
        exposureMode: 'manual',
        iso: Math.round(clamp(spec.iso ?? DEFAULT_ISO, caps.iso)),
        exposureTime: Math.round(secToUnits(sec) * 100) / 100,
      }
    }
  } else {
    if (caps.canManualExposure) others.push({ exposureMode: 'continuous' })
    if (caps.ev) others.push({ exposureCompensation: clamp(spec.ev ?? 0, caps.ev) })
  }

  if (caps.zoom) others.push({ zoom: clamp(spec.zoom ?? 1, caps.zoom) })
  if (caps.canManualWB && caps.wbKelvin) {
    others.push(
      spec.wbKelvin === null
        ? { whiteBalanceMode: 'continuous' }
        : { whiteBalanceMode: 'manual', colorTemperature: Math.round(clamp(spec.wbKelvin, caps.wbKelvin)) },
    )
  }
  if (caps.canManualFocus && caps.focusMeters) {
    others.push(
      spec.focusMeters === null
        ? { focusMode: 'continuous' }
        : { focusMode: 'manual', focusDistance: clamp(spec.focusMeters, caps.focusMeters) },
    )
  }
  return { exposure, others }
}

export function buildShotConstraints(spec: CaptureSpec, caps: Capabilities): ConstraintSet[] {
  const { exposure, others } = splitConstraints(spec, caps)
  return exposure ? [exposure, ...others] : others
}

/** Live preview uses the same values as the shot: the preview tracks the photo. */
export function buildPreviewConstraints(spec: CaptureSpec, caps: Capabilities): ConstraintSet[] {
  return buildShotConstraints(spec, caps)
}
