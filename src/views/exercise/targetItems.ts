// Display strings for the values a shot prescribes. Numbers are formatted here, once.
import type { CaptureSpec } from '@/types'
import { formatIso, formatShutter } from '@/judge/format'
import { autoValue, targetLabel } from '@/copy/exercise'

export type TargetKey = 'shutter' | 'iso' | 'ev' | 'wb' | 'zoom' | 'focus'

export interface TargetItem {
  key: TargetKey
  text: string
  /** true when the value is not prescribed and shown as automatic */
  auto: boolean
}

const trim = (n: number, digits = 1): string => String(Number(n.toFixed(digits)))

export function formatEv(ev: number): string {
  const v = Number(ev.toFixed(1))
  return `${v > 0 ? '+' : ''}${v} EV`
}
export const formatKelvin = (k: number): string => `${Math.round(k)}K`
export const formatZoom = (z: number): string => `${trim(z)}×`
export const formatFocus = (m: number): string => `${trim(m, m < 1 ? 2 : 1)} m`

/**
 * Chips for a spec. Prescribed values always appear; with `withAuto` the others appear as
 * "auto" (compensation is skipped while shutter or ISO is set, since it has no effect then).
 */
export function targetItems(spec: CaptureSpec, withAuto = false): TargetItem[] {
  const out: TargetItem[] = []
  const add = (key: TargetKey, label: string, value: number | null, fmt: (n: number) => string): void => {
    if (value !== null) out.push({ key, text: key === 'iso' ? fmt(value) : `${label} ${fmt(value)}`, auto: false })
    else if (withAuto) out.push({ key, text: `${label} ${autoValue}`, auto: true })
  }
  add('shutter', targetLabel.shutter, spec.shutterSec, formatShutter)
  add('iso', 'ISO', spec.iso, formatIso)
  if (spec.shutterSec === null && spec.iso === null) add('ev', targetLabel.ev, spec.ev, formatEv)
  add('wb', targetLabel.wb, spec.wbKelvin, formatKelvin)
  add('zoom', targetLabel.zoom, spec.zoom, formatZoom)
  add('focus', targetLabel.focus, spec.focusMeters, formatFocus)
  return out
}
