// Predictions, observation, reflection (questions plus the learner's note on ruled lines),
// the results list and the completion stamp.
import { exerciseCopy } from '@/copy/exercise'
import { sheetCopy } from '@/copy/sheet'
import type { DisplayOp, SheetContent } from '../types'
import type { SheetContentWithPredictions } from './extended'
import { block, paragraphParts, withHead, type Block, type Part } from './blocks'
import { bodyStyle, sectionLabel } from './intro'
import { SIZE, SPACE, baselineIn, type Ctx } from './sizes'
import { wrapText } from './wrap'

/** Ruled lines with the note written on them; a blank note still gets the minimum number of lines. */
export function ruledParts(ctx: Ctx, note: string): Part[] {
  const { s, theme, w, x0 } = ctx
  const pitch = SPACE.ruledPitch * s
  const size = s * SIZE.note
  const written = wrapText(note, w - s * 0.4, ctx.f.note, ctx.measurer)
  const n = Math.max(SPACE.ruledMinLines, written.length)
  const parts: Part[] = []
  for (let i = 0; i < n; i++) {
    const ops: DisplayOp[] = [
      { op: 'line', x1: x0, y1: pitch, x2: x0 + w, y2: pitch, stroke: theme.inkFaint, lineWidth: Math.max(1, s * SPACE.hairline) },
    ]
    const text = written[i]
    if (text) {
      ops.push({ op: 'text', x: x0 + s * 0.2, y: pitch - SPACE.ruledBaselineLift * s, text, font: ctx.f.note, color: theme.ink })
    }
    parts.push({ h: pitch, ops })
  }
  return parts
}

function questionParts(ctx: Ctx, text: string, bullet: boolean): Part[] {
  const { s, theme, x0, w } = ctx
  const indent = bullet ? SPACE.indent * s : 0
  const parts = paragraphParts(ctx, text, x0 + indent, w - indent, bodyStyle(ctx))
  const first = parts[0]
  if (bullet && first) {
    const d = SPACE.bullet * s
    const cy = baselineIn(s * SIZE.body, first.h) - s * SIZE.body * 0.3
    first.ops.push({ op: 'rect', x: x0 + (indent - d) / 2, y: cy - d / 2, w: d, h: d, radius: d / 2, fill: theme.accent })
  }
  return parts
}

/** Notes on: prompt(s) then ruled lines carrying the note. Notes off: prompt(s) only. */
function itemBlock(ctx: Ctx, prompts: string[], withNotes: boolean, note: string, gap: number): Block {
  const bullet = prompts.length > 1
  const parts = prompts.flatMap((p) => questionParts(ctx, p, bullet))
  if (withNotes) parts.push(...ruledParts(ctx, note))
  return block(gap, true, parts)
}

function section(ctx: Ctx, label: string, items: (Block | null)[]): Block[] {
  return items.filter((b): b is Block => b !== null).map((b, i) =>
    i === 0 ? { ...b, gap: SPACE.section * ctx.s, parts: withHead(sectionLabel(ctx, label), b.parts) } : b,
  )
}

export function predictBlocks(ctx: Ctx, c: SheetContentWithPredictions): Block[] {
  const gap = SPACE.gap * ctx.s
  return section(ctx, exerciseCopy.predict, c.predictions.map((prompt, i) =>
    itemBlock(ctx, [prompt], c.includeNotes, c.predictionNotes?.[i] ?? '', gap),
  ))
}

export function observeBlocks(ctx: Ctx, c: SheetContent): Block[] {
  if (c.observeQuestions.length === 0 && !c.includeNotes) return []
  return section(ctx, exerciseCopy.observe, [itemBlock(ctx, c.observeQuestions, c.includeNotes, c.observeNotes, 0)])
}

export function reflectBlocks(ctx: Ctx, c: SheetContent): Block[] {
  const gap = SPACE.gap * ctx.s
  return section(ctx, exerciseCopy.reflect, c.reflectPrompts.map((r) =>
    itemBlock(ctx, [r.prompt], c.includeNotes, r.note, gap),
  ))
}

export function resultBlocks(ctx: Ctx, c: SheetContent): Block[] {
  if (c.results.length === 0) return []
  const { s, theme, x0, w } = ctx
  const indent = SPACE.indent * s
  const parts = c.results.flatMap((line) => {
    const failed = line.includes(sheetCopy.resultFail)
    const color = failed ? theme.accent : theme.green
    const ps = paragraphParts(ctx, line, x0 + indent, w - indent, bodyStyle(ctx))
    const first = ps[0]
    if (first) {
      const d = SPACE.bullet * s
      const cy = baselineIn(s * SIZE.body, first.h) - s * SIZE.body * 0.3
      first.ops.push({ op: 'rect', x: x0 + (indent - d) / 2, y: cy - d / 2, w: d, h: d, radius: d / 2, fill: color })
    }
    return ps
  })
  return [block(SPACE.section * s, true, withHead(sectionLabel(ctx, exerciseCopy.results), parts))]
}

export function stampBlock(ctx: Ctx, completed: boolean): Block[] {
  if (!completed) return []
  const { s, theme, x0, w } = ctx
  const h = SPACE.stamp * s
  const r = SPACE.stampRadius * s
  return [block(SPACE.section * s, true, [{
    h,
    ops: [{ op: 'stamp', x: x0 + w - r, y: h / 2, text: exerciseCopy.doneStamp, color: theme.green }],
  }])]
}
