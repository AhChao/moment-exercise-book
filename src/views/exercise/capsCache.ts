// Last known camera capabilities, written by the capture screen and read for planning slots.
import type { Capabilities } from '@/camera/types'

export const CAPS_KEY = 'meb:caps'

type StoreLike = Pick<Storage, 'getItem' | 'setItem'>

/** Assumed until the camera has been opened once: everything works except the ultrawide (planShot handles 0.5). */
export const ASSUMED_CAPS: Capabilities = {
  available: true,
  zoom: { min: 1, max: 20, step: 0.1 },
  iso: { min: 30, max: 7518, step: 1 },
  shutterSec: { min: 1 / 17500, max: 16, step: 0.00001 },
  ev: { min: -4, max: 4, step: 1 / 6 },
  wbKelvin: { min: 2850, max: 7000, step: 50 },
  focusMeters: { min: 0.05, max: 3.77, step: 0.01 },
  torch: false,
  canManualExposure: true,
  canManualWB: true,
  canManualFocus: true,
}

function defaultStore(): StoreLike | null {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage
  } catch {
    return null
  }
}

export function readCachedCaps(store: StoreLike | null = defaultStore()): Capabilities {
  try {
    const raw = store?.getItem(CAPS_KEY)
    if (!raw) return ASSUMED_CAPS
    const parsed = JSON.parse(raw) as Partial<Capabilities> | null
    if (!parsed || typeof parsed !== 'object' || typeof parsed.available !== 'boolean') return ASSUMED_CAPS
    return {
      torch: false,
      canManualExposure: false,
      canManualWB: false,
      canManualFocus: false,
      ...parsed,
    } as Capabilities
  } catch {
    return ASSUMED_CAPS
  }
}

export function writeCachedCaps(caps: Capabilities, store: StoreLike | null = defaultStore()): void {
  try {
    store?.setItem(CAPS_KEY, JSON.stringify(caps))
  } catch {
    // storage may be blocked; planning falls back to the assumed capabilities
  }
}
