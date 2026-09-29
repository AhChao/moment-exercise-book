import type { Capabilities, RangeCap } from './types'
import { unitsToSec } from './constraints'

export const UNAVAILABLE: Capabilities = {
  available: false,
  torch: false,
  canManualExposure: false,
  canManualWB: false,
  canManualFocus: false,
}

function range(v: unknown, scale = 1): RangeCap | undefined {
  if (!v || typeof v !== 'object') return undefined
  const r = v as Partial<RangeCap>
  if (typeof r.min !== 'number' || typeof r.max !== 'number') return undefined
  const step = typeof r.step === 'number' && r.step > 0 ? r.step : 0
  return { min: r.min * scale, max: r.max * scale, step: step * scale }
}

function modes(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((m): m is string => typeof m === 'string') : []
}

/** Pure: converts the Web API capability object into app units (seconds, kelvin, metres). */
export function normalizeCapabilities(raw: object, label?: string): Capabilities {
  const r = raw as Record<string, unknown>
  const iso = range(r.iso)
  const shutterSec = range(r.exposureTime, unitsToSec(1))
  const wbKelvin = range(r.colorTemperature)
  const focusMeters = range(r.focusDistance)
  return {
    available: true,
    label,
    zoom: range(r.zoom),
    iso,
    shutterSec,
    ev: range(r.exposureCompensation),
    wbKelvin,
    focusMeters,
    torch: r.torch === true,
    canManualExposure: !!iso && !!shutterSec && modes(r.exposureMode).includes('manual'),
    canManualWB: !!wbKelvin && modes(r.whiteBalanceMode).includes('manual'),
    canManualFocus: !!focusMeters && modes(r.focusMode).includes('manual'),
  }
}
