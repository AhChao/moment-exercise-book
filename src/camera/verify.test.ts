import { describe, expect, it } from 'vitest'
import type { CaptureSpec, ExifInfo } from '@/types'
import { compareToRequest } from './verify'

const AUTO: CaptureSpec = { shutterSec: null, iso: null, ev: null, wbKelvin: null, zoom: null, focusMeters: null }
const exif = (p: Partial<ExifInfo>): ExifInfo => ({ hasExif: true, hasGps: false, ...p })

describe('compareToRequest', () => {
  it('accepts values within 5 percent', () => {
    const r = compareToRequest({ ...AUTO, shutterSec: 0.01, iso: 400 }, exif({ exposureTime: 0.0104, iso: 415 }))
    expect(r).toEqual({ ok: true })
  })

  it('rejects iso outside 5 percent with a message', () => {
    const r = compareToRequest({ ...AUTO, iso: 400 }, exif({ iso: 337 }))
    expect(r.ok).toBe(false)
    expect(r.mismatch).toBe('iso: expected 400, got 337')
  })

  it('rejects shutter outside 5 percent', () => {
    const r = compareToRequest({ ...AUTO, shutterSec: 0.01 }, exif({ exposureTime: 0.02 }))
    expect(r.ok).toBe(false)
    expect(r.mismatch).toContain('shutterSec')
  })

  it('treats a missing EXIF value as a mismatch when prescribed', () => {
    const r = compareToRequest({ ...AUTO, iso: 100 }, { hasExif: false, hasGps: false })
    expect(r.ok).toBe(false)
    expect(r.mismatch).toContain('iso')
  })

  it('reports both problems', () => {
    const r = compareToRequest({ ...AUTO, shutterSec: 0.01, iso: 100 }, exif({ exposureTime: 0.1, iso: 900 }))
    expect(r.mismatch).toContain('; ')
  })

  it('ignores unverifiable fields and absent EXIF when nothing is prescribed', () => {
    const r = compareToRequest({ ...AUTO, ev: 1, wbKelvin: 4000, zoom: 2 }, { hasExif: false, hasGps: false })
    expect(r).toEqual({ ok: true })
  })
})
