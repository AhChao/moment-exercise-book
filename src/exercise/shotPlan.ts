import type { Capabilities, RangeCap } from '@/camera/types'
import type { CaptureSpec, Exercise, Shot } from '@/types'

export type PlanReason =
  | 'ultrawide' | 'exposure' | 'whiteBalance' | 'focus' | 'compensation' | 'zoom' | 'noCamera'

export interface ShotPlan {
  mode: 'camera' | 'import'
  /** capture spec clamped to what the phone offers */
  spec: CaptureSpec
  /** why the slot cannot be shot in-app; empty when mode is camera */
  notes: PlanReason[]
}

function clampTo(v: number | null, cap: RangeCap | undefined): number | null {
  if (v === null || !cap) return null
  return Math.min(cap.max, Math.max(cap.min, v))
}

/** Every prescribed value clamped into the phone's range; a value the phone has no range for becomes null. */
export function clampSpec(spec: CaptureSpec, caps: Capabilities): CaptureSpec {
  return {
    shutterSec: clampTo(spec.shutterSec, caps.shutterSec),
    iso: clampTo(spec.iso, caps.iso),
    ev: clampTo(spec.ev, caps.ev),
    wbKelvin: clampTo(spec.wbKelvin, caps.wbKelvin),
    zoom: clampTo(spec.zoom, caps.zoom),
    focusMeters: clampTo(spec.focusMeters, caps.focusMeters),
  }
}

export function planShot(shot: Shot, caps: Capabilities): ShotPlan {
  const c = shot.capture
  const notes: PlanReason[] = []

  if (c.zoom === 0.5) notes.push('ultrawide')
  if (!caps.available) {
    notes.push('noCamera')
    return { mode: 'import', spec: clampSpec(c, caps), notes }
  }

  if (c.zoom !== null && c.zoom !== 0.5) {
    const z = caps.zoom
    // No zoom range at all (front camera) still allows the default 1x.
    const outside = z ? c.zoom < z.min || c.zoom > z.max : c.zoom !== 1
    if (outside) notes.push('zoom')
  }
  if ((c.shutterSec !== null || c.iso !== null) && !caps.canManualExposure) notes.push('exposure')
  if (c.wbKelvin !== null && !caps.canManualWB) notes.push('whiteBalance')
  if (c.focusMeters !== null && !caps.canManualFocus) notes.push('focus')
  // ev is ignored while shutter / iso are prescribed; ev 0 is the phone's own default.
  if (c.ev !== null && c.ev !== 0 && c.shutterSec === null && c.iso === null && !caps.ev) {
    notes.push('compensation')
  }

  return { mode: notes.length ? 'import' : 'camera', spec: clampSpec(c, caps), notes }
}

export function exerciseNeedsImport(exercise: Exercise, caps: Capabilities): boolean {
  return exercise.shots.some((s) => planShot(s, caps).mode === 'import')
}
