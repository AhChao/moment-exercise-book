// Turns judged checks into display lines. Unknown results are dropped (never shown).
import type { Check, CheckResult, Shot } from '@/types'
import { formatIso, formatShutter } from '@/judge/format'
import { checkFieldLabel, checkTarget } from '@/copy/exercise'
import { lensName } from '@/copy/photo'

export interface CheckLine {
  key: string
  status: 'pass' | 'fail'
  /** e.g. "1/30" - the frame the check belongs to */
  frame: string
  field: string
  measured: string
  /** only for failures */
  target: string | null
}

function fmt(field: Check['field'], v: number | string): string {
  if (typeof v === 'string') return v in lensName ? lensName[v as keyof typeof lensName] : v
  if (field === 'iso') return formatIso(v)
  if (field === 'shutterSec') return formatShutter(v)
  return `${Math.round(v)} mm`
}

export function targetText(check: Check): string {
  const { op, value, field } = check
  if (Array.isArray(value)) return checkTarget.between(fmt(field, value[0]), fmt(field, value[1]))
  const v = fmt(field, value)
  if (op === '<=') return checkTarget.atMost(v)
  if (op === '>=') return checkTarget.atLeast(v)
  return v
}

/** Maps "actual" (already formatted by the judge, lens as its key) to display text. */
function measuredText(actual: string): string {
  return actual in lensName ? lensName[actual as keyof typeof lensName] : actual
}

export function checkLines(results: readonly CheckResult[], shots: readonly Shot[]): CheckLine[] {
  const lines: CheckLine[] = []
  results.forEach((r, i) => {
    if (r.status === 'unknown') return
    lines.push({
      key: `${i}`,
      status: r.status,
      frame: shots[r.check.shot]?.label ?? '',
      field: checkFieldLabel[r.check.field],
      measured: measuredText(r.actual ?? ''),
      target: r.status === 'fail' ? `${checkTarget.goalPrefix} ${targetText(r.check)}` : null,
    })
  })
  return lines
}
