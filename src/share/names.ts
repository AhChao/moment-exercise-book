// Pure helpers: export file names and which exercises are worth exporting.
import type { SheetSource } from './types'

export function ymd(date: Date): string {
  const y = String(date.getFullYear()).padStart(4, '0')
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}${m}${d}`
}

/** Keeps ids safe as a file name. */
function safe(id: string): string {
  return id.replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'export'
}

/** moment-<exercise id>-YYYYMMDD.jpg */
export function imageFileName(exerciseId: string, date: Date): string {
  return `moment-${safe(exerciseId)}-${ymd(date)}.jpg`
}

/** exercise: moment-<id>-date.pdf, chapter: moment-chapter-<id>-date.pdf, all: moment-exercise-book-date.pdf */
export function pdfFileName(kind: 'exercise' | 'chapter' | 'all', id: string, date: Date): string {
  const d = ymd(date)
  if (kind === 'exercise') return `moment-${safe(id)}-${d}.pdf`
  if (kind === 'chapter') return `moment-chapter-${safe(id)}-${d}.pdf`
  return `moment-exercise-book-${d}.pdf`
}

/** 'withPhotos' keeps only exercises with at least one photo; 'all' returns everything. Order is kept. */
export function exportableSources(all: SheetSource[], mode: 'withPhotos' | 'all'): SheetSource[] {
  if (mode === 'all') return all.slice()
  return all.filter((s) => s.photos.some((p) => p != null))
}
