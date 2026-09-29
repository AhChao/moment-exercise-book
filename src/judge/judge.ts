import type { Check, CheckField, CheckResult, Exercise, PhotoMeta } from '@/types'
import { formatIso, formatShutter } from './format'

/** Relative tolerance for `==` on numeric fields; focalLength35 uses an absolute 0.5 mm. */
const REL_TOL: Partial<Record<CheckField, number>> = { shutterSec: 0.03, iso: 0.05 }

function read(photo: PhotoMeta, field: CheckField): number | string | undefined {
  switch (field) {
    case 'iso': return photo.exif.iso
    case 'shutterSec': return photo.exif.exposureTime
    case 'focalLength35': return photo.exif.focalLength35
    case 'lens': return photo.lens === 'unknown' ? undefined : photo.lens
  }
}

function display(field: CheckField, v: number | string): string {
  if (typeof v === 'string') return v
  if (field === 'iso') return formatIso(v)
  if (field === 'shutterSec') return formatShutter(v)
  return `${Math.round(v)} mm`
}

function numEq(field: CheckField, a: number, v: number): boolean {
  const rel = REL_TOL[field]
  if (rel !== undefined) return Math.abs(a - v) <= rel * Math.abs(v)
  return Math.abs(a - v) <= 0.5
}

/** null = the check cannot be evaluated (value / operator type mismatch). */
function evaluate(check: Check, actual: number | string): boolean | null {
  const { op, value, field } = check
  if (typeof actual === 'string') {
    return op === '==' && typeof value === 'string' ? actual === value : null
  }
  // Tiny epsilon so values that are equal after float rounding are not failed.
  const eps = (x: number) => 1e-9 * Math.max(1, Math.abs(x))
  if (op === 'between') {
    if (!Array.isArray(value)) return null
    const [lo, hi] = value
    return actual >= lo - eps(lo) && actual <= hi + eps(hi)
  }
  if (typeof value !== 'number') return null
  if (op === '<=') return actual <= value + eps(value)
  if (op === '>=') return actual >= value - eps(value)
  return numEq(field, actual, value)
}

export function judgeExercise(exercise: Exercise, photos: (PhotoMeta | null)[]): CheckResult[] {
  return exercise.checks.map((check): CheckResult => {
    const photo = photos[check.shot] ?? null
    if (!photo) return { check, status: 'unknown' }
    const actual = read(photo, check.field)
    if (actual === undefined || (typeof actual === 'number' && !Number.isFinite(actual))) {
      return { check, status: 'unknown' }
    }
    const ok = evaluate(check, actual)
    if (ok === null) return { check, status: 'unknown' }
    return { check, status: ok ? 'pass' : 'fail', actual: display(check.field, actual) }
  })
}

export function summarizeChecks(results: CheckResult[]): { pass: number; fail: number; unknown: number } {
  const out = { pass: 0, fail: 0, unknown: 0 }
  for (const r of results) out[r.status]++
  return out
}
