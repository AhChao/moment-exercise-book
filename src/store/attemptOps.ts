// Pure helpers for building and normalising Attempt values.
import type { Attempt } from '@/types'

export function padTo<T>(list: T[], n: number, fill: T): T[] {
  return list.length >= n ? list.slice(0, n) : [...list, ...Array<T>(n - list.length).fill(fill)]
}

export function blankAttempt(exerciseId: string, slotCount: number, now: number): Attempt {
  return {
    exerciseId,
    slots: Array<string | null>(slotCount).fill(null),
    observeNotes: '',
    reflectNotes: [],
    updatedAt: now,
    completedAt: null,
  }
}

/** Existing attempt (or a blank one) with slots padded/trimmed to slotCount. Returns a new object. */
export function fitAttempt(existing: Attempt | undefined, exerciseId: string, slotCount: number, now: number): Attempt {
  const a = existing ?? blankAttempt(exerciseId, slotCount, now)
  const fitted: Attempt = { ...a, slots: padTo(a.slots, slotCount, null), reflectNotes: [...a.reflectNotes] }
  // Older attempts have no predictNotes; leave the field absent rather than inventing it.
  if (a.predictNotes) fitted.predictNotes = [...a.predictNotes]
  return fitted
}

export function clearPhotoFromSlots(a: Attempt, photoId: string): Attempt | null {
  if (!a.slots.includes(photoId)) return null
  return { ...a, slots: a.slots.map((s) => (s === photoId ? null : s)) }
}
