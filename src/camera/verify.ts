import type { CaptureSpec, ExifInfo } from '@/types'

const TOLERANCE = 0.05

function check(name: string, expected: number, got: number | undefined): string | null {
  if (got === undefined || !Number.isFinite(got)) return `${name}: expected ${fmt(expected)}, got missing`
  if (Math.abs(got - expected) <= Math.abs(expected) * TOLERANCE) return null
  return `${name}: expected ${fmt(expected)}, got ${fmt(got)}`
}

const fmt = (n: number): string => String(Number(n.toPrecision(4)))

/** Only shutter and ISO are verifiable from EXIF; anything else prescribed is ok by definition. */
export function compareToRequest(requested: CaptureSpec, exif: ExifInfo): { ok: boolean; mismatch?: string } {
  const problems: string[] = []
  if (requested.shutterSec !== null) {
    const p = check('shutterSec', requested.shutterSec, exif.exposureTime)
    if (p) problems.push(p)
  }
  if (requested.iso !== null) {
    const p = check('iso', requested.iso, exif.iso)
    if (p) problems.push(p)
  }
  return problems.length ? { ok: false, mismatch: problems.join('; ') } : { ok: true }
}
