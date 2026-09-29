// Builds export sources (exercise + attempt + frame photos) from the library state.
import type { Attempt, Exercise, PhotoMeta } from '@/types'
import { slotPhotos } from '@/views/exercise/slots'
import type { SheetSource } from '../types'

export function buildSources(
  exercises: readonly Exercise[],
  chapterTitle: string,
  attempts: Record<string, Attempt>,
  photos: readonly PhotoMeta[],
): SheetSource[] {
  return exercises.map((exercise) => {
    const attempt = attempts[exercise.id]
    return {
      exercise,
      chapterTitle,
      attempt,
      photos: slotPhotos(attempt?.slots ?? [], photos, exercise.shots.length),
    }
  })
}

/** "2026/09/05", printed in the footer of the sheet. */
export function footerDate(date: Date): string {
  const y = String(date.getFullYear()).padStart(4, '0')
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}/${m}/${d}`
}
