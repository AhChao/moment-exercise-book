import type { Attempt, Need } from '@/types'

/** Needs worth a chip on an exercise row, in a stable order. */
const VISIBLE_NEEDS: readonly Need[] = ['ultrawide', 'tele', 'night']

export function visibleNeeds(needs: readonly Need[]): Need[] {
  return VISIBLE_NEEDS.filter((n) => needs.includes(n))
}

/** Photo ids assigned to the exercise's frames, in frame order, with empty frames dropped. */
export function assignedPhotos(attempt: Attempt | undefined): { photoId: string; slot: number }[] {
  const out: { photoId: string; slot: number }[] = []
  attempt?.slots.forEach((photoId, slot) => {
    if (photoId) out.push({ photoId, slot })
  })
  return out
}
