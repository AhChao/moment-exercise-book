import { describe, expect, it } from 'vitest'
import { allExercises, chapterOfExercise, chapters, exerciseById, exercisesOf, nextExercise } from './loader'

describe('content loader', () => {
  it('loads chapters in order with unique ids', () => {
    const cs = chapters()
    expect(cs.length).toBeGreaterThan(0)
    expect(new Set(cs.map((c) => c.id)).size).toBe(cs.length)
    expect(cs.map((c) => c.order)).toEqual([...cs.map((c) => c.order)].sort((a, b) => a - b))
  })

  it('every exercise belongs to exactly one chapter and ids are unique', () => {
    const all = allExercises()
    expect(new Set(all.map((e) => e.id)).size).toBe(all.length)
    for (const e of all) expect(chapterOfExercise(e.id)).toBeDefined()
    const total = chapters().reduce((n, c) => n + exercisesOf(c.id).length, 0)
    expect(total).toBe(all.length)
  })

  it('finds an exercise and walks to the next one', () => {
    const first = allExercises()[0]!
    expect(exerciseById(first.id)).toBe(first)
    expect(nextExercise(first.id)?.id).toBe(allExercises()[1]?.id)
    expect(nextExercise(allExercises().at(-1)!.id)).toBeUndefined()
    expect(exerciseById('nope')).toBeUndefined()
  })
})
