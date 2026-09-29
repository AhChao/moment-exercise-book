// Top of the page: title block, concept card, goal and scene, fixed conditions, wavy rule.
import { exerciseCopy } from '@/copy/exercise'
import type { DisplayOp, SheetContent } from '../types'
import { block, lineOf, paragraphParts, shiftOp, stack, withHead, type Block, type Part, type TextStyle } from './blocks'
import { LEADING, SIZE, SPACE, type Ctx } from './sizes'
import { wrapText } from './wrap'

const MAX_LEVEL = 3

export const bodyStyle = (ctx: Ctx): TextStyle => ({ font: ctx.f.body, size: ctx.s * SIZE.body, color: ctx.theme.ink, leading: LEADING.body })

export const sectionLabel = (ctx: Ctx, text: string, color = ctx.theme.accent): Part =>
  lineOf(text, ctx.x0, { font: ctx.f.section, size: ctx.s * SIZE.section, color, leading: LEADING.title })

export function titleBlock(ctx: Ctx, c: SheetContent): Block {
  const { s, theme, w, x0 } = ctx
  const d = SPACE.dot * s
  const dotsW = MAX_LEVEL * d + (MAX_LEVEL - 1) * SPACE.dotGap * s
  const chapter = paragraphParts(ctx, c.chapterTitle, x0, w - dotsW - s, {
    font: ctx.f.chapter, size: s * SIZE.chapter, color: theme.inkSoft, leading: LEADING.small,
  })
  const chapterPart = stack(chapter.length ? chapter : [lineOf('', x0, { font: ctx.f.chapter, size: s * SIZE.chapter, color: theme.inkSoft, leading: LEADING.small })])
  const level = Math.max(0, Math.min(MAX_LEVEL, Math.round(c.level)))
  const ops: DisplayOp[] = [...chapterPart.ops]
  const cy = (chapter[0]?.h ?? chapterPart.h) / 2
  for (let i = 0; i < MAX_LEVEL; i++) {
    const x = x0 + w - dotsW + i * (d + SPACE.dotGap * s)
    const filled = i < level
    ops.push({
      op: 'rect', x, y: cy - d / 2, w: d, h: d, radius: d / 2,
      ...(filled ? { fill: theme.accent } : { stroke: theme.inkFaint, lineWidth: Math.max(1, s * SPACE.hairline) }),
    })
  }
  const title = paragraphParts(ctx, c.title, x0, w, { font: ctx.f.title, size: s * SIZE.title, color: theme.ink, leading: LEADING.title })
  const head: Part = { h: Math.max(chapterPart.h, d), ops }
  return block(0, true, [stack([head, { h: 0.3 * s, ops: [] }, ...title])])
}

export function conceptBlock(ctx: Ctx, concept: string | null): Block[] {
  if (!concept) return []
  const { s, theme, w, x0 } = ctx
  const pad = SPACE.pad * s
  const heading = lineOf(exerciseCopy.concept, x0 + pad, { font: ctx.f.cardHeading, size: s * SIZE.cardHeading, color: theme.accent, leading: LEADING.title })
  const text = paragraphParts(ctx, concept, x0 + pad, w - 2 * pad, bodyStyle(ctx))
  const inner = stack([heading, ...text])
  const h = inner.h + 2 * pad
  const ops: DisplayOp[] = [
    { op: 'rect', x: x0, y: 0, w, h, fill: theme.paperLight, stroke: theme.inkFaint, lineWidth: Math.max(1, s * SPACE.hairline), dashed: true, radius: s * SPACE.radius },
    ...inner.ops.map((o) => shiftOp(o, 0, pad)),
  ]
  return [block(SPACE.section * s, true, [{ h, ops }])]
}

/** A labelled paragraph; may be split across pages by lines. */
export function labelledParagraph(ctx: Ctx, label: string, text: string): Block[] {
  if (!text) return []
  const lines = paragraphParts(ctx, text, ctx.x0, ctx.w, bodyStyle(ctx))
  return [block(SPACE.section * ctx.s, false, withHead(sectionLabel(ctx, label), lines))]
}

export function fixedBlock(ctx: Ctx, fixed: string[]): Block[] {
  if (fixed.length === 0) return []
  const { s, theme, w, x0 } = ctx
  const padX = SPACE.chipPadX * s
  const padY = SPACE.chipPadY * s
  const size = s * SIZE.chip
  const lh = size * LEADING.small
  const gap = SPACE.chipGap * s
  const rows: Part[] = []
  let ops: DisplayOp[] = []
  let x = 0
  let rowH = 0
  const closeRow = (): void => {
    if (ops.length) rows.push({ h: rowH + gap, ops })
    ops = []
    x = 0
    rowH = 0
  }
  for (const text of fixed) {
    const lines = wrapText(text, w - 2 * padX, ctx.f.chip, ctx.measurer)
    const tw = Math.max(...lines.map((l) => ctx.measurer.width(l, ctx.f.chip)), 0)
    const cw = tw + 2 * padX
    const ch = lines.length * lh + 2 * padY
    if (x > 0 && x + cw > w) closeRow()
    ops.push({ op: 'rect', x: x0 + x, y: 0, w: cw, h: ch, fill: theme.paperLight, stroke: theme.inkFaint, lineWidth: Math.max(1, s * SPACE.hairline), radius: Math.min(ch / 2, s) })
    lines.forEach((l, i) => {
      ops.push({ op: 'text', x: x0 + x + padX, y: padY + i * lh + (lh - size) / 2 + size * 0.85, text: l, font: ctx.f.chip, color: theme.ink })
    })
    x += cw + gap
    rowH = Math.max(rowH, ch)
  }
  closeRow()
  return [block(SPACE.section * s, true, withHead(sectionLabel(ctx, exerciseCopy.fixed), rows))]
}

export function ruleBlock(ctx: Ctx): Block {
  const { s, theme, w, x0 } = ctx
  const h = SPACE.ruleHeight * s
  const line: DisplayOp = { op: 'line', x1: x0, y1: h / 2, x2: x0 + w, y2: h / 2, stroke: theme.inkFaint, lineWidth: Math.max(1, s * SPACE.hairline * 1.5), wavy: true }
  return block(SPACE.section * s, true, [{ h, ops: [line] }])
}
