// Exercise content is authored as JSON under content/exercises/ and bundled eagerly: the whole
// curriculum is small and must work offline.
import type { Chapter, ChapterFile, Exercise } from '@/types'

const files = import.meta.glob('../../content/exercises/*.json', { eager: true, import: 'default' }) as Record<
  string,
  ChapterFile
>

const chapterFiles: ChapterFile[] = Object.values(files).sort((a, b) => a.chapter.order - b.chapter.order)
const byExercise = new Map<string, { exercise: Exercise; chapter: Chapter }>()
for (const f of chapterFiles) for (const e of f.exercises) byExercise.set(e.id, { exercise: e, chapter: f.chapter })

export function chapters(): Chapter[] {
  return chapterFiles.map((f) => f.chapter)
}

export function exercisesOf(chapterId: string): Exercise[] {
  return chapterFiles.find((f) => f.chapter.id === chapterId)?.exercises ?? []
}

export function chapterById(chapterId: string): Chapter | undefined {
  return chapterFiles.find((f) => f.chapter.id === chapterId)?.chapter
}

export function exerciseById(id: string): Exercise | undefined {
  return byExercise.get(id)?.exercise
}

export function chapterOfExercise(id: string): Chapter | undefined {
  return byExercise.get(id)?.chapter
}

export function allExercises(): Exercise[] {
  return chapterFiles.flatMap((f) => f.exercises)
}

/** The exercise after `id` in reading order (crossing chapter boundaries), if any. */
export function nextExercise(id: string): Exercise | undefined {
  const all = allExercises()
  const i = all.findIndex((e) => e.id === id)
  return i >= 0 ? all[i + 1] : undefined
}
