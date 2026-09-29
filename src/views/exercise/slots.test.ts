import { describe, expect, it } from 'vitest'
import type { PhotoMeta } from '@/types'
import { NO_DEVELOP } from '@/types'
import { canCompare, canComplete, clampShotIndex, filledIndexes, isDevelopOnly, slotPhotos } from './slots'

const photo = (id: string): PhotoMeta => ({
  id, createdAt: 0, source: 'camera', width: 1, height: 1, bytes: 1,
  exif: { hasExif: false, hasGps: false }, applied: {}, lens: 'main', develop: { ...NO_DEVELOP },
})

describe('slots', () => {
  const lib = [photo('a'), photo('b')]

  it('maps slots to photos and treats missing photos as empty', () => {
    const p = slotPhotos(['a', 'gone', null], lib, 3)
    expect(p.map((x) => x?.id ?? null)).toEqual(['a', null, null])
    expect(filledIndexes(p)).toEqual([0])
  })

  it('pads short slot arrays to the shot count', () => {
    expect(slotPhotos([], lib, 3)).toEqual([null, null, null])
  })

  it('enables completion at one photo and comparison at two', () => {
    expect(canComplete([null, null])).toBe(false)
    expect(canComplete([photo('a'), null])).toBe(true)
    expect(canCompare([photo('a'), null])).toBe(false)
    expect(canCompare([photo('a'), photo('b')])).toBe(true)
  })

  it('detects development-only shots', () => {
    const none = { shutterSec: null, iso: null, ev: null, wbKelvin: null, zoom: null, focusMeters: null }
    expect(isDevelopOnly(none, { ...NO_DEVELOP })).toBe(true)
    expect(isDevelopOnly(none, null)).toBe(false)
    expect(isDevelopOnly({ ...none, iso: 100 }, { ...NO_DEVELOP })).toBe(false)
  })

  it('clamps the shot index', () => {
    expect(clampShotIndex(5, 3)).toBe(2)
    expect(clampShotIndex(-1, 3)).toBe(0)
    expect(clampShotIndex(Number.NaN, 3)).toBe(0)
    expect(clampShotIndex(1, 0)).toBe(0)
  })
})
