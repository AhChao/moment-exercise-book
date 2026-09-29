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
  /** Zoom / white balance / focus, one property group per set. Applied before any exposure work. */
  others: ConstraintSet[]
  /** {exposureMode:'continuous'}; automatic exposure only, null when the phone has no manual mode. */
  autoMode: ConstraintSet | null
  /** {exposureCompensation}; automatic exposure only, always present when caps.ev exists (0 when unset). */
  ev: ConstraintSet | null
  /** The clamped EV that `ev` requests, for read-back verification. */
  evValue: number | null
}

export function splitConstraints(spec: CaptureSpec, caps: Capabilities): SplitConstraints {
  const prescribed = spec.shutterSec !== null || spec.iso !== null
  let exposure: ConstraintSet | null = null
  let autoMode: ConstraintSet | null = null
  let ev: ConstraintSet | null = null
  let evValue: number | null = null
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
    if (caps.canManualExposure) autoMode = { exposureMode: 'continuous' }
    if (caps.ev) {
      evValue = clamp(spec.ev ?? 0, caps.ev)
      ev = { exposureCompensation: evValue }
    }
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
  return { exposure, others, autoMode, ev, evValue }
}

/**
 * Ordered list: manual exposure first (one object) when prescribed; otherwise zoom / wb / focus,
 * then the exposure mode, and exposure compensation LAST as its own set (later calls can drop it).
 */
export function buildShotConstraints(spec: CaptureSpec, caps: Capabilities): ConstraintSet[] {
  const { exposure, others, autoMode, ev } = splitConstraints(spec, caps)
  if (exposure) return [exposure, ...others]
  return [...others, ...(autoMode ? [autoMode] : []), ...(ev ? [ev] : [])]
}

/** Live preview uses the same values as the shot: the preview tracks the photo. */
export function buildPreviewConstraints(spec: CaptureSpec, caps: Capabilities): ConstraintSet[] {
  return buildShotConstraints(spec, caps)
}
