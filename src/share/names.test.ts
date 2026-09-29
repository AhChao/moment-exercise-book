import { describe, expect, it } from 'vitest'
import type { PhotoMeta } from '@/types'
import { exportableSources, imageFileName, pdfFileName, ymd } from './names'
import type { SheetSource } from './types'

const day = new Date(2026, 8, 5)
const photo = { id: 'p1' } as unknown as PhotoMeta
const src = (id: string, photos: (PhotoMeta | null)[]): SheetSource =>
  ({ exercise: { id }, chapterTitle: '', attempt: undefined, photos }) as unknown as SheetSource

describe('file names', () => {
  it('formats the local date with padding', () => {
    expect(ymd(day)).toBe('20260905')
  })
  it('names the image after the exercise', () => {
    expect(imageFileName('light-01', day)).toBe('moment-light-01-20260905.jpg')
  })
  it('names pdfs per kind', () => {
    expect(pdfFileName('exercise', 'light-01', day)).toBe('moment-light-01-20260905.pdf')
    expect(pdfFileName('chapter', 'light', day)).toBe('moment-chapter-light-20260905.pdf')
    expect(pdfFileName('all', '', day)).toBe('moment-exercise-book-20260905.pdf')
  })
  it('sanitises unsafe characters', () => {
    expect(imageFileName('a/b c', day)).toBe('moment-a-b-c-20260905.jpg')
  })
})

describe('exportableSources', () => {
  const list = [src('a', [null, null]), src('b', [null, photo]), src('c', [photo])]
  it('keeps only exercises with a photo, in order', () => {
    expect(exportableSources(list, 'withPhotos').map((s) => s.exercise.id)).toEqual(['b', 'c'])
  })
  it('returns everything in all mode without aliasing the input', () => {
    const out = exportableSources(list, 'all')
    expect(out).toHaveLength(3)
    expect(out).not.toBe(list)
  })
  it('handles an empty list', () => {
    expect(exportableSources([], 'withPhotos')).toEqual([])
  })
})
