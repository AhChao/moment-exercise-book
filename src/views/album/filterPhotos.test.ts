import { describe, expect, it } from 'vitest'
import type { Attempt, Lens, PhotoMeta } from '@/types'
import { filterPhotos, normalizeLens, photosByChapter } from './filterPhotos'

const photo = (id: string, lens: Lens) => ({ id, lens }) as PhotoMeta
const attempt = (exerciseId: string, slots: (string | null)[]): Attempt => ({
  exerciseId,
  slots,
  observeNotes: '',
  reflectNotes: [],
  updatedAt: 0,
  completedAt: null,
})

const photos = [photo('p1', 'main'), photo('p2', 'tele'), photo('p3', 'main'), photo('p4', 'unknown')]
const byChapter = photosByChapter(
  { e1: attempt('e1', ['p1', null]), e2: attempt('e2', ['p2', 'p3']), lost: attempt('lost', ['p4']) },
  (id) => ({ e1: 'c1', e2: 'c2' })[id as 'e1' | 'e2'],
)

describe('normalizeLens', () => {
  it('accepts known lenses and rejects everything else', () => {
    expect(normalizeLens('tele')).toBe('tele')
    expect(normalizeLens('unknown')).toBe('')
    expect(normalizeLens('<script>')).toBe('')
    expect(normalizeLens('')).toBe('')
  })
})

describe('photosByChapter', () => {
  it('groups assigned photos by chapter and skips exercises with no chapter', () => {
    expect([...(byChapter.get('c1') ?? [])]).toEqual(['p1'])
    expect([...(byChapter.get('c2') ?? [])].sort()).toEqual(['p2', 'p3'])
    expect(byChapter.size).toBe(2)
  })
})

describe('filterPhotos', () => {
  it('returns everything without a filter, including photos of unknown lens', () => {
    expect(filterPhotos(photos, { lens: '', chapter: '' }, byChapter).map((p) => p.id)).toEqual(['p1', 'p2', 'p3', 'p4'])
  })
  it('filters by lens and keeps order', () => {
    expect(filterPhotos(photos, { lens: 'main', chapter: '' }, byChapter).map((p) => p.id)).toEqual(['p1', 'p3'])
  })
  it('treats an invalid lens as no filter', () => {
    expect(filterPhotos(photos, { lens: 'zzz', chapter: '' }, byChapter)).toHaveLength(4)
  })
  it('filters by chapter, and combines with lens', () => {
    expect(filterPhotos(photos, { lens: '', chapter: 'c2' }, byChapter).map((p) => p.id)).toEqual(['p2', 'p3'])
    expect(filterPhotos(photos, { lens: 'main', chapter: 'c2' }, byChapter).map((p) => p.id)).toEqual(['p3'])
  })
  it('an unknown chapter matches nothing', () => {
    expect(filterPhotos(photos, { lens: '', chapter: 'nope' }, byChapter)).toEqual([])
  })
})
