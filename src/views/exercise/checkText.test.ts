import { describe, expect, it } from 'vitest'
import type { Check, CheckResult, Shot } from '@/types'
import { checkLines, targetText } from './checkText'

const shot = (label: string): Shot => ({
  label,
  capture: { shutterSec: null, iso: null, ev: null, wbKelvin: null, zoom: null, focusMeters: null },
  develop: null,
  hint: '',
})
const check = (over: Partial<Check>): Check => ({ shot: 0, field: 'iso', op: '==', value: 100, ...over })

describe('checkText', () => {
  it('formats targets per operator', () => {
    expect(targetText(check({ op: '<=', value: 400 }))).toBe('ISO 400 以下')
    expect(targetText(check({ op: '>=', value: 200 }))).toBe('ISO 200 以上')
    expect(targetText(check({ field: 'shutterSec', op: 'between', value: [0.025, 0.042] }))).toBe('1/40 至 1/24')
    expect(targetText(check({ field: 'lens', value: 'tele' }))).toBe('長焦')
  })

  it('hides unknown results and only gives targets for failures', () => {
    const results: CheckResult[] = [
      { check: check({}), status: 'pass', actual: 'ISO 100' },
      { check: check({ shot: 1, value: 400 }), status: 'fail', actual: 'ISO 200' },
      { check: check({ shot: 1 }), status: 'unknown' },
    ]
    const lines = checkLines(results, [shot('A'), shot('B')])
    expect(lines).toHaveLength(2)
    expect(lines[0]).toMatchObject({ status: 'pass', frame: 'A', measured: 'ISO 100', target: null })
    expect(lines[1]).toMatchObject({ status: 'fail', frame: 'B', target: '目標 ISO 400' })
  })

  it('translates lens keys in measured values', () => {
    const r: CheckResult[] = [{ check: check({ field: 'lens', value: 'main' }), status: 'pass', actual: 'main' }]
    expect(checkLines(r, [shot('A')])[0]?.measured).toBe('主鏡頭')
  })
})
