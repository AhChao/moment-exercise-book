import { describe, expect, it } from 'vitest'
import type { PhotoMeta } from '@/types'
import { NO_DEVELOP } from '@/types'
import { captionOf, formatExifTime, photoRows, reviewRows } from './photoInfo'

const base: PhotoMeta = {
  id: 'a', createdAt: Date.UTC(2026, 8, 29, 6, 5), source: 'camera', width: 3, height: 4, bytes: 1,
  exif: { hasExif: true, hasGps: false, iso: 200, exposureTime: 0.008, fNumber: 1.68, focalLength35: 24, dateTimeOriginal: '2026:09:29 14:03:22' },
  applied: {}, lens: 'main', develop: { ...NO_DEVELOP },
}

describe('photoInfo', () => {
  it('builds rows for present fields only', () => {
    const rows = photoRows(base)
    expect(rows.map((r) => r.key)).toEqual(['shutter', 'iso', 'aperture', 'focal', 'lens', 'time', 'source'])
    expect(rows.find((r) => r.key === 'shutter')?.value).toBe('1/125')
    expect(rows.find((r) => r.key === 'aperture')?.value).toBe('f/1.7')
    expect(rows.find((r) => r.key === 'time')?.value).toBe('2026/09/29 14:03')
  })

  it('omits absent fields and unknown lens', () => {
    const rows = photoRows({ ...base, exif: { hasExif: false, hasGps: false }, lens: 'unknown', source: 'import' })
    expect(rows.map((r) => r.key)).toEqual(['source'])
  })

  it('falls back to the capture time only for camera photos', () => {
    const noTime = { ...base, exif: { hasExif: true, hasGps: false } }
    expect(photoRows(noTime).some((r) => r.key === 'time')).toBe(true)
    expect(photoRows({ ...noTime, source: 'import' }).some((r) => r.key === 'time')).toBe(false)
  })

  it('parses stored EXIF time', () => {
    expect(formatExifTime('bad')).toBeNull()
    expect(formatExifTime(undefined)).toBeNull()
  })

  it('takes review values from the engine when EXIF lacks them', () => {
    const rows = reviewRows({ hasExif: false, hasGps: false }, 'main', { shutterSec: 0.5, iso: 100 })
    expect(rows.map((r) => r.value)).toContain('0.5 s')
  })

  it('builds a comparison caption', () => {
    expect(captionOf(base)).toBe('快門 1/125　ISO 200')
    expect(captionOf({ ...base, exif: { hasExif: false, hasGps: false } })).toBe('')
  })
})

describe('exposure compensation row', () => {
  it('shows the reported compensation next to ISO and omits it when absent', () => {
    const base = { hasExif: true, hasGps: false, iso: 200, exposureTime: 1 / 60 }
    const withEvRows = reviewRows(base, 'main', { ev: -1 })
    expect(withEvRows.map((r) => r.key)).toEqual(['shutter', 'iso', 'ev', 'lens'])
    expect(withEvRows.find((r) => r.key === 'ev')?.value).toBe('-1 EV')
    expect(reviewRows(base, 'main', { ev: 0.5 }).find((r) => r.key === 'ev')?.value).toBe('+0.5 EV')
    expect(reviewRows(base, 'main', {}).some((r) => r.key === 'ev')).toBe(false)
  })
})
