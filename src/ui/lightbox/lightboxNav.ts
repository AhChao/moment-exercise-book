// Pure index logic for the lightbox item list.
export interface LightboxItem { id: string; label?: string }

/** Index of the start item; a missing id falls back to the first item. */
export function startIndex(items: readonly LightboxItem[], startId: string): number {
  const i = items.findIndex((it) => it.id === startId)
  return i < 0 ? 0 : i
}

/** Moves by `dir` and stops at the ends (no wrap-around). */
export function stepIndex(index: number, dir: 1 | -1, count: number): number {
  return Math.min(Math.max(0, count - 1), Math.max(0, index + dir))
}

/** Keeps the index valid when the item list shrinks or reorders under the open lightbox. */
export function keepIndex(items: readonly LightboxItem[], currentId: string | undefined, fallback: number): number {
  if (currentId !== undefined) {
    const i = items.findIndex((it) => it.id === currentId)
    if (i >= 0) return i
  }
  return Math.min(Math.max(0, fallback), Math.max(0, items.length - 1))
}
