// Turns the camera's capabilities into the rows shown in the settings screen. Pure.
import type { Capabilities, RangeCap } from '@/camera/types'
import { formatShutter } from '@/judge/format'
import { settings } from '@/copy/settings'

export interface CameraRow {
  key: 'shutter' | 'iso' | 'ev' | 'wb' | 'focus' | 'zoom'
  label: string
  available: boolean
  /** range text such as "1/6000 - 16 s"; empty when the control is missing */
  detail: string
}

const labels = settings.camera.controls

/** Rounds to `digits` decimals and drops trailing zeros: 3.7722 -> "3.77", 4 -> "4". */
function num(n: number, digits = 1): string {
  return String(Number(n.toFixed(digits)))
}

function span(range: RangeCap | undefined, fmt: (n: number) => string, suffix = ''): string {
  if (!range) return ''
  const a = fmt(range.min)
  const b = fmt(range.max)
  return `${a === b ? a : `${a} – ${b}`}${suffix}`
}

export function buildCameraReport(caps: Capabilities): CameraRow[] {
  const row = (key: CameraRow['key'], label: string, available: boolean, detail: string): CameraRow => {
    const ok = caps.available && available
    return { key, label, available: ok, detail: ok ? detail : '' }
  }
  const whole = (n: number) => String(Math.round(n))
  return [
    row('shutter', labels.shutter, caps.canManualExposure && !!caps.shutterSec, span(caps.shutterSec, formatShutter)),
    row('iso', labels.iso, caps.canManualExposure && !!caps.iso, span(caps.iso, whole)),
    row('ev', labels.ev, !!caps.ev, span(caps.ev, (n) => num(n), ' EV')),
    row('wb', labels.wb, caps.canManualWB, span(caps.wbKelvin, whole, ' K')),
    row('focus', labels.focus, caps.canManualFocus, span(caps.focusMeters, (n) => num(n, 2), ' m')),
    row('zoom', labels.zoom, !!caps.zoom, span(caps.zoom, (n) => `${num(n)}×`)),
  ]
}
