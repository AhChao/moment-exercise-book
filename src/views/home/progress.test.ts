import { describe, expect, it } from 'vitest'
import type { Attempt, Chapter, Exercise } from '@/types'
import { chapterProgress, findContinue, isCompleted, percent, type ChapterWithExercises } from './progress'

const ex = (id: string) => ({ id }) as Exercise
const chapter = (id: string, order: number) => ({ id, order, title: id, blurb: '', level: 1 }) as Chapter
const attempt = (exerciseId: string, completedAt: number | null): Attempt => ({
  exerciseId,
  slots: [],
  observeNotes: '',
  reflectNotes: [],
  updatedAt: 0,
  completedAt,
})

const book: ChapterWithExercises[] = [
  { chapter: chapter('c1', 1), exercises: [ex('a'), ex('b')] },
  { chapter: chapter('c2', 2), exercises: [ex('c'), ex('d'), ex('e')] },
]

describe('progress', () => {
  it('counts only attempts with completedAt', () => {
    const attempts = { a: attempt('a', 5), b: attempt('b', null) }
    expect(isCompleted('a', attempts)).toBe(true)
    expect(isCompleted('b', attempts)).toBe(false)
    expect(isCompleted('zzz', attempts)).toBe(false)
    expect(chapterProgress(book[0]!.exercises, attempts)).toEqual({ done: 1, total: 2 })
  })

  it('percent rounds and survives an empty chapter', () => {
    expect(percent({ done: 1, total: 3 })).toBe(33)
    expect(percent({ done: 0, total: 0 })).toBe(0)
    expect(percent({ done: 2, total: 2 })).toBe(100)
  })
})

describe('findContinue', () => {
  it('starts at the very first exercise on an empty book', () => {
    const t = findContinue(book, {})
    expect(t?.exercise.id).toBe('a')
    expect(t?.started).toBe(false)
    expect(t?.progress).toEqual({ done: 0, total: 2 })
  })

  it('skips completed exercises and crosses chapter boundaries', () => {
    const attempts = { a: attempt('a', 1), b: attempt('b', 2), c: attempt('c', 3) }
    const t = findContinue(book, attempts)
    expect(t?.exercise.id).toBe('d')
    expect(t?.chapter.id).toBe('c2')
    expect(t?.started).toBe(true)
    expect(t?.progress).toEqual({ done: 1, total: 3 })
  })

  it('picks the first gap, not the last completed', () => {
    const attempts = { b: attempt('b', 2) }
    expect(findContinue(book, attempts)?.exercise.id).toBe('a')
  })

  it('returns null when everything is complete', () => {
    const all = Object.fromEntries(['a', 'b', 'c', 'd', 'e'].map((id) => [id, attempt(id, 1)]))
    expect(findContinue(book, all)).toBeNull()
  })
})
