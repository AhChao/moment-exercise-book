// Pure progress counting for the notebook screens. An exercise counts as done when its attempt has
// completedAt set; a photo alone does not complete anything.
import type { Attempt, Chapter, Exercise } from '@/types'

export interface ChapterWithExercises {
  chapter: Chapter
  exercises: Exercise[]
}

export interface Progress {
  done: number
  total: number
}

type Attempts = Record<string, Attempt | undefined>

export function isCompleted(exerciseId: string, attempts: Attempts): boolean {
  return (attempts[exerciseId]?.completedAt ?? null) !== null
}

export function chapterProgress(exercises: readonly Pick<Exercise, 'id'>[], attempts: Attempts): Progress {
  let done = 0
  for (const e of exercises) if (isCompleted(e.id, attempts)) done++
  return { done, total: exercises.length }
}

/** Bar fill, 0..100. An empty chapter shows an empty bar. */
export function percent({ done, total }: Progress): number {
  return total > 0 ? Math.round((done / total) * 100) : 0
}

export interface ContinueTarget {
  exercise: Exercise
  chapter: Chapter
  progress: Progress
  /** true once anything in the book has been completed */
  started: boolean
}

/** First exercise, in reading order, that is not completed; null when everything is. */
export function findContinue(list: readonly ChapterWithExercises[], attempts: Attempts): ContinueTarget | null {
  let started = false
  let target: { exercise: Exercise; entry: ChapterWithExercises } | null = null
  for (const entry of list) {
    for (const exercise of entry.exercises) {
      if (isCompleted(exercise.id, attempts)) started = true
      else if (!target) target = { exercise, entry }
    }
  }
  if (!target) return null
  return {
    exercise: target.exercise,
    chapter: target.entry.chapter,
    progress: chapterProgress(target.entry.exercises, attempts),
    started,
  }
}
