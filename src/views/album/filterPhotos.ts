// Pure filter logic for the album. Query values come from the URL, so they are validated here.
import type { Attempt, Lens, PhotoMeta } from '@/types'

export type LensFilter = Exclude<Lens, 'unknown'>

export const LENS_FILTERS: readonly LensFilter[] = ['main', 'ultrawide', 'tele', 'front']

/** '' (all) for anything that is not a known lens. */
export function normalizeLens(raw: string): LensFilter | '' {
  return (LENS_FILTERS as readonly string[]).includes(raw) ? (raw as LensFilter) : ''
}

/** chapter id -> ids of the photos assigned to any of its exercises. */
export function photosByChapter(
  attempts: Record<string, Attempt | undefined>,
  chapterIdOf: (exerciseId: string) => string | undefined,
): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>()
  for (const [exerciseId, attempt] of Object.entries(attempts)) {
    const chapterId = chapterIdOf(exerciseId)
    if (!chapterId || !attempt) continue
    let set = out.get(chapterId)
    if (!set) out.set(chapterId, (set = new Set()))
    for (const id of attempt.slots) if (id) set.add(id)
  }
  return out
}

export interface AlbumFilter {
  lens: string
  chapter: string
}

/** Keeps the incoming order (the library lists newest first). */
export function filterPhotos(
  photos: readonly PhotoMeta[],
  filter: AlbumFilter,
  byChapter: Map<string, Set<string>>,
): PhotoMeta[] {
  const lens = normalizeLens(filter.lens)
  const inChapter = filter.chapter ? byChapter.get(filter.chapter) : undefined
  return photos.filter((p) => {
    if (lens && p.lens !== lens) return false
    if (filter.chapter && !inChapter?.has(p.id)) return false
    return true
  })
}
