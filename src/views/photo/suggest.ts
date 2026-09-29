// Suggested adjustment values travel from the exercise page to the photo viewer in `?suggest=`.
import type { DevelopSpec } from '@/types'
import { isIdentity } from '@/develop/identity'
import { developLabel } from '@/copy/photo'

const KEYS: (keyof DevelopSpec)[] = ['shadows', 'highlights', 'exposure', 'warmth']
const clamp = (n: number): number => Math.min(100, Math.max(-100, Math.round(n)))

export const encodeSuggest = (dev: DevelopSpec): string => KEYS.map((k) => dev[k]).join(',')

/** null for anything that is not four numbers, or for an all-zero suggestion. */
export function decodeSuggest(raw: unknown): DevelopSpec | null {
  if (typeof raw !== 'string') return null
  const parts = raw.split(',').map((s) => Number(s))
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return null
  const dev = Object.fromEntries(KEYS.map((k, i) => [k, clamp(parts[i] ?? 0)])) as unknown as DevelopSpec
  return isIdentity(dev) ? null : dev
}

/** "+50" / "-40"; zero renders as "0". */
export const signed = (n: number): string => (n > 0 ? `+${n}` : String(n))

/** Chips such as "陰影 -50" for the non-zero sliders of a suggestion. */
export function developChips(dev: DevelopSpec | null): string[] {
  if (!dev) return []
  return KEYS.filter((k) => dev[k] !== 0).map((k) => `${developLabel[k]} ${signed(dev[k])}`)
}
