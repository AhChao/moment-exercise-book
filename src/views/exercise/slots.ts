// Pure logic about which frames of an exercise hold a photo.
import type { CaptureSpec, PhotoMeta } from '@/types'

/** Photos for each slot; a slot whose photo no longer exists counts as empty. */
export function slotPhotos(slots: readonly (string | null)[], photos: readonly PhotoMeta[], count: number): (PhotoMeta | null)[] {
  const byId = new Map(photos.map((p) => [p.id, p]))
  return Array.from({ length: count }, (_, i) => {
    const id = slots[i]
    return (id ? byId.get(id) : undefined) ?? null
  })
}

export const filledIndexes = (photos: readonly (PhotoMeta | null)[]): number[] =>
  photos.flatMap((p, i) => (p ? [i] : []))

/** Completion needs at least one photo; checks never block it. */
export const canComplete = (photos: readonly (PhotoMeta | null)[]): boolean => filledIndexes(photos).length >= 1

/** Side-by-side comparison needs two photos. */
export const canCompare = (photos: readonly (PhotoMeta | null)[]): boolean => filledIndexes(photos).length >= 2

/** A shot with nothing prescribed and an adjustment set is a development-only step. */
export function isDevelopOnly(capture: CaptureSpec, develop: unknown): boolean {
  return develop !== null && Object.values(capture).every((v) => v === null)
}

/** Keeps a query-string shot index inside the exercise. */
export function clampShotIndex(raw: number, count: number): number {
  if (!Number.isFinite(raw) || count <= 0) return 0
  return Math.min(count - 1, Math.max(0, Math.trunc(raw)))
}
