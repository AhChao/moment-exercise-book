// Reduces an exercise, its attempt and photos to the display text of the shared page.
// Nothing outside SheetContent leaves this function (no GPS, no file names, no ids).
import type { CheckLine } from '@/views/exercise/checkText'
import { checkLines } from '@/views/exercise/checkText'
import { captionOf } from '@/views/photo/photoInfo'
import { judgeExercise } from '@/judge/judge'
import { common } from '@/copy/common'
import { resultTargetNote, sheetCopy } from '@/copy/sheet'
import type { SheetFrameInfo, SheetOptions, SheetSource } from './types'
import type { SheetContentWithPredictions } from './layout/extended'

const DEFAULT_ASPECT = 3 / 4

function resultLine(l: CheckLine): string {
  const sep = sheetCopy.resultSeparator
  // Some measured values already carry the field name ("ISO 200"); do not repeat it.
  const field = l.measured.startsWith(l.field) ? '' : l.field
  const head = [l.frame, field, l.measured].filter((p) => p !== '').join(sep)
  if (l.status === 'pass') return `${head}${sep}${sheetCopy.resultPass}`
  const target = l.target ? resultTargetNote(l.target) : ''
  return `${head}${sep}${sheetCopy.resultFail}${target}`
}

export function buildSheetContent(source: SheetSource, options: SheetOptions): SheetContentWithPredictions {
  const { exercise: ex, attempt, photos, chapterTitle } = source
  const notes = options.includeNotes

  const frames: SheetFrameInfo[] = ex.shots.map((shot, i) => {
    const photo = photos[i] ?? null
    const aspect = photo && photo.width > 0 && photo.height > 0 ? photo.width / photo.height : DEFAULT_ASPECT
    return {
      label: shot.label.trim(),
      caption: options.includeShootingData && photo ? captionOf(photo).trim() : '',
      aspect,
      hasPhoto: photo !== null,
    }
  })

  const note = (raw: string | undefined): string => (notes ? (raw ?? '').trim() : '')

  const predictions = (ex.predict ?? []).map((prompt) => prompt.trim())
  const predictionNotes = predictions.map((_, i) => note(attempt?.predictNotes?.[i]))

  const results = checkLines(judgeExercise(ex, photos), ex.shots).map(resultLine)

  const date = options.footerDate.trim()

  return {
    chapterTitle: chapterTitle.trim(),
    title: ex.title.trim(),
    level: ex.level,
    concept: ex.concept?.trim() ? ex.concept.trim() : null,
    goal: ex.goal.trim(),
    scene: ex.scene.trim(),
    fixed: ex.fixed.map((f) => f.trim()).filter((f) => f !== ''),
    frames,
    predictions,
    predictionNotes,
    includeNotes: notes,
    observeQuestions: ex.observe.map((q) => q.trim()),
    observeNotes: note(attempt?.observeNotes),
    reflectPrompts: ex.reflect.map((prompt, i) => ({
      prompt: prompt.trim(),
      note: note(attempt?.reflectNotes[i]),
    })),
    results,
    completed: !!attempt && attempt.completedAt !== null,
    footer: date ? `${common.productName}${sheetCopy.footerSeparator}${date}` : common.productName,
  }
}
