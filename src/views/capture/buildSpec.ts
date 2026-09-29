// Pure spec building for the capture screen: the shot's prescribed values are locked,
// the learner's choices fill the rest, and everything is clamped to what the phone offers.
import type { Capabilities } from '@/camera/types'
import { clampSpec } from '@/exercise/shotPlan'
import type { CaptureSpec } from '@/types'

export type ControlKey = 'zoom' | 'ev' | 'shutter' | 'iso' | 'wb' | 'focus'

export const EMPTY_SPEC: CaptureSpec = {
  shutterSec: null, iso: null, ev: null, wbKelvin: null, zoom: null, focusMeters: null,
}

/** Which spec field a control edits. */
export const FIELD_OF: Record<ControlKey, keyof CaptureSpec> = {
  zoom: 'zoom', ev: 'ev', shutter: 'shutterSec', iso: 'iso', wb: 'wbKelvin', focus: 'focusMeters',
}

const CONTROL_ORDER: ControlKey[] = ['zoom', 'ev', 'shutter', 'iso', 'wb', 'focus']

/** Nothing prescribed: the learner's own choice, controls start expanded. */
export const isFreeChoice = (shot: CaptureSpec): boolean => Object.values(shot).every((v) => v === null)

export function availableControls(caps: Capabilities): Record<ControlKey, boolean> {
  return {
    zoom: !!caps.zoom && caps.zoom.max > caps.zoom.min,
    ev: !!caps.ev,
    shutter: caps.canManualExposure && !!caps.shutterSec,
    iso: caps.canManualExposure && !!caps.iso,
    wb: caps.canManualWB && !!caps.wbKelvin,
    focus: caps.canManualFocus && !!caps.focusMeters,
  }
}

export const isLocked = (shot: CaptureSpec, key: ControlKey): boolean => shot[FIELD_OF[key]] !== null

/** Controls shown in the panel: exposed by the phone and not prescribed by the shot. */
export function panelControls(shot: CaptureSpec, caps: Capabilities): ControlKey[] {
  const avail = availableControls(caps)
  return CONTROL_ORDER.filter((k) => avail[k] && !isLocked(shot, k))
}

/** The spec handed to the camera. */
export function buildSpec(shot: CaptureSpec, overrides: Partial<CaptureSpec>, caps: Capabilities): CaptureSpec {
  const pick = (k: keyof CaptureSpec): number | null => shot[k] ?? overrides[k] ?? null
  const merged: CaptureSpec = {
    shutterSec: pick('shutterSec'),
    iso: pick('iso'),
    ev: pick('ev'),
    wbKelvin: pick('wbKelvin'),
    zoom: pick('zoom'),
    focusMeters: pick('focusMeters'),
  }
  const avail = availableControls(caps)
  if (!avail.shutter) merged.shutterSec = null
  if (!avail.iso) merged.iso = null
  if (!avail.wb) merged.wbKelvin = null
  if (!avail.focus) merged.focusMeters = null
  const clamped = clampSpec(merged, caps)
  // Compensation has no effect once shutter or ISO is fixed.
  if (clamped.shutterSec !== null || clamped.iso !== null) clamped.ev = null
  return clamped
}

/** Slow enough (1/15 s or longer) that the phone should rest on something steady. */
export const isSlowShot = (spec: CaptureSpec): boolean => spec.shutterSec !== null && spec.shutterSec >= 1 / 15 - 1e-6
