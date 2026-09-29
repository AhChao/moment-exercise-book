import { describe, expect, it } from 'vitest'
import type { Check, Exercise, ExifInfo, Lens, PhotoMeta } from '@/types'
import { NO_DEVELOP } from '@/types'
import { judgeExercise, summarizeChecks } from './judge'

function photo(exif: Partial<ExifInfo>, lens: Lens = 'main'): PhotoMeta {
  return {
    id: 'p', createdAt: 0, source: 'camera', width: 3000, height: 4000, bytes: 1,
    exif: { hasExif: true, hasGps: false, ...exif }, applied: {}, lens, develop: NO_DEVELOP,
  }
}

function ex(checks: Check[]): Exercise {
  return {
    id: 'e', title: 't', level: 1, goal: '', scene: '', fixed: [], shots: [], observe: [],
    reflect: [], needs: [], checks, sources: [],
  }
}

const one = (check: Check, p: PhotoMeta | null) => judgeExercise(ex([check]), [p])[0]

describe('judgeExercise', () => {
  it('returns one result per check, in order', () => {
    const checks: Check[] = [
      { shot: 0, field: 'iso', op: '<=', value: 400 },
      { shot: 1, field: 'iso', op: '>=', value: 400 },
    ]
    const r = judgeExercise(ex(checks), [photo({ iso: 200 }), photo({ iso: 800 })])
    expect(r.map((x) => x.status)).toEqual(['pass', 'pass'])
    expect(r.map((x) => x.check)).toEqual(checks)
  })

  it('maps each field', () => {
    const p = photo({ iso: 200, exposureTime: 1 / 125, focalLength35: 24 }, 'ultrawide')
    expect(one({ shot: 0, field: 'iso', op: '<=', value: 200 }, p)).toMatchObject({ status: 'pass', actual: 'ISO 200' })
    expect(one({ shot: 0, field: 'shutterSec', op: '<=', value: 0.01 }, p)).toMatchObject({ status: 'pass', actual: '1/125' })
    expect(one({ shot: 0, field: 'focalLength35', op: '>=', value: 20 }, p)).toMatchObject({ status: 'pass', actual: '24 mm' })
    expect(one({ shot: 0, field: 'lens', op: '==', value: 'ultrawide' }, p)).toMatchObject({ status: 'pass', actual: 'ultrawide' })
    expect(one({ shot: 0, field: 'lens', op: '==', value: 'main' }, p).status).toBe('fail')
  })

  it('handles <= and >= boundaries', () => {
    const p = photo({ iso: 400 })
    expect(one({ shot: 0, field: 'iso', op: '<=', value: 399 }, p).status).toBe('fail')
    expect(one({ shot: 0, field: 'iso', op: '>=', value: 401 }, p).status).toBe('fail')
    expect(one({ shot: 0, field: 'iso', op: '>=', value: 400 }, p).status).toBe('pass')
  })

  it('between is inclusive at both ends', () => {
    const c: Check = { shot: 0, field: 'iso', op: 'between', value: [100, 400] }
    expect(one(c, photo({ iso: 100 })).status).toBe('pass')
    expect(one(c, photo({ iso: 400 })).status).toBe('pass')
    expect(one(c, photo({ iso: 99 })).status).toBe('fail')
    expect(one(c, photo({ iso: 401 })).status).toBe('fail')
  })

  it('== uses 3% for shutter and 5% for iso', () => {
    const sh: Check = { shot: 0, field: 'shutterSec', op: '==', value: 0.01 }
    expect(one(sh, photo({ exposureTime: 0.0102 })).status).toBe('pass')
    expect(one(sh, photo({ exposureTime: 0.0104 })).status).toBe('fail')
    const iso: Check = { shot: 0, field: 'iso', op: '==', value: 200 }
    expect(one(iso, photo({ iso: 209 })).status).toBe('pass')
    expect(one(iso, photo({ iso: 211 })).status).toBe('fail')
  })

  it('is unknown for a missing photo or a missing value, never fail', () => {
    const c: Check = { shot: 0, field: 'iso', op: '<=', value: 400 }
    expect(one(c, null)).toEqual({ check: c, status: 'unknown' })
    expect(judgeExercise(ex([c]), [])[0].status).toBe('unknown')
    expect(one(c, photo({})).status).toBe('unknown')
    expect(one({ shot: 0, field: 'lens', op: '==', value: 'main' }, photo({}, 'unknown')).status).toBe('unknown')
    expect(one({ shot: 0, field: 'focalLength35', op: '>=', value: 20 }, photo({})).status).toBe('unknown')
  })

  it('is unknown when value type does not fit the field or op', () => {
    expect(one({ shot: 0, field: 'iso', op: '<=', value: 'x' }, photo({ iso: 100 })).status).toBe('unknown')
    expect(one({ shot: 0, field: 'iso', op: 'between', value: 5 }, photo({ iso: 100 })).status).toBe('unknown')
    expect(one({ shot: 0, field: 'lens', op: '<=', value: 'main' }, photo({}, 'main')).status).toBe('unknown')
  })
})

describe('summarizeChecks', () => {
  it('counts each status', () => {
    const c: Check = { shot: 0, field: 'iso', op: '<=', value: 1 }
    expect(summarizeChecks([
      { check: c, status: 'pass' }, { check: c, status: 'fail' },
      { check: c, status: 'unknown' }, { check: c, status: 'pass' },
    ])).toEqual({ pass: 2, fail: 1, unknown: 1 })
    expect(summarizeChecks([])).toEqual({ pass: 0, fail: 0, unknown: 0 })
  })
})
