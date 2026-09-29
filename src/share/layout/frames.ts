// Taped polaroid-style frames, two per row (one row = one atomic block).
import { exerciseCopy } from '@/copy/exercise'
import type { DisplayOp, SheetFrameInfo } from '../types'
import { block, paragraphParts, shiftOp, stack, type Block, type Part } from './blocks'
import { LEADING, SIZE, SPACE, TAPE_ALPHA, withAlpha, type Ctx } from './sizes'

const PER_ROW = 2

interface Cell {
  index: number
  frame: SheetFrameInfo
  labelParts: Part[]
  captionParts: Part[]
  h: number
}

/** Largest w x h with the given aspect that fits inside the box. */
export function fitAspect(aspect: number, boxW: number, boxH: number): { w: number; h: number } {
  const a = aspect > 0 && Number.isFinite(aspect) ? aspect : 3 / 4
  let h = boxH
  let w = h * a
  if (w > boxW) {
    w = boxW
    h = w / a
  }
  return { w, h }
}

function measureCell(ctx: Ctx, index: number, frame: SheetFrameInfo, cellW: number, areaH: number): Cell {
  const { s, theme } = ctx
  const inner = cellW - 2 * SPACE.framePad * s
  const labelParts = paragraphParts(ctx, frame.label, 0, inner, {
    font: ctx.f.frameLabel, size: s * SIZE.frameLabel, color: theme.ink, leading: LEADING.title, align: 'center',
  })
  const captionParts = paragraphParts(ctx, frame.caption, 0, inner, {
    font: ctx.f.caption, size: s * SIZE.caption, color: theme.inkSoft, leading: LEADING.small, align: 'center',
  })
  const textH = (ps: Part[]): number => ps.reduce((n, p) => n + p.h, 0)
  const pad = SPACE.framePad * s
  const h = pad + areaH + 0.5 * s + textH(labelParts) + (captionParts.length ? 0.2 * s + textH(captionParts) : 0) + pad
  return { index, frame, labelParts, captionParts, h }
}

function drawCell(ctx: Ctx, c: Cell, x: number, top: number, cellW: number, cellH: number, areaH: number): DisplayOp[] {
  const { s, theme } = ctx
  const pad = SPACE.framePad * s
  const ops: DisplayOp[] = [
    { op: 'rect', x, y: top, w: cellW, h: cellH, fill: theme.paperLight, stroke: theme.inkFaint, lineWidth: Math.max(1, s * SPACE.hairline), radius: s * SPACE.radius },
  ]
  const box = fitAspect(c.frame.hasPhoto ? c.frame.aspect : 3 / 4, cellW - 2 * pad, areaH)
  const px = x + (cellW - box.w) / 2
  const py = top + pad + (areaH - box.h) / 2
  if (c.frame.hasPhoto) {
    ops.push({ op: 'photo', frame: c.index, x: px, y: py, w: box.w, h: box.h })
  } else {
    ops.push({ op: 'rect', x: px, y: py, w: box.w, h: box.h, fill: theme.paper, stroke: theme.inkFaint, lineWidth: Math.max(1, s * SPACE.hairline), dashed: true })
    ops.push({
      op: 'text', x: px + box.w / 2, y: py + box.h / 2 + s * SIZE.empty * 0.35, text: exerciseCopy.emptyFrame,
      font: ctx.f.empty, color: theme.inkFaint, align: 'center',
    })
  }
  let y = top + pad + areaH + 0.5 * s
  const push = (parts: Part[]): void => {
    const st = stack(parts)
    for (const op of st.ops) ops.push(shiftOp(op, x + pad, y))
    y += st.h
  }
  push(c.labelParts)
  if (c.captionParts.length) {
    y += 0.2 * s
    push(c.captionParts)
  }
  // Tape last so it sits on top of the frame edge.
  const tapeW = cellW * SPACE.tapeWidthRatio
  const tapeH = SPACE.tapeHeight * s
  ops.push({ op: 'rect', x: x + (cellW - tapeW) / 2, y: top - tapeH / 2, w: tapeW, h: tapeH, fill: withAlpha(theme.yellow, TAPE_ALPHA) })
  return ops
}

export function frameBlocks(ctx: Ctx, frames: SheetFrameInfo[]): Block[] {
  if (frames.length === 0) return []
  const { s, w, x0 } = ctx
  const gutter = SPACE.frameGutter * s
  const cellW = frames.length === 1 ? w * SPACE.frameSoloWidth : (w - gutter) / PER_ROW
  const areaH = (cellW - 2 * SPACE.framePad * s) * SPACE.frameAreaRatio
  const cells = frames.map((f, i) => measureCell(ctx, i, f, cellW, areaH))
  const tapeOver = (SPACE.tapeHeight * s) / 2
  const blocks: Block[] = []
  for (let i = 0; i < cells.length; i += PER_ROW) {
    const row = cells.slice(i, i + PER_ROW)
    const rowH = Math.max(...row.map((c) => c.h))
    const rowW = row.length * cellW + (row.length - 1) * gutter
    const startX = x0 + (w - rowW) / 2
    const ops = row.flatMap((c, k) => drawCell(ctx, c, startX + k * (cellW + gutter), tapeOver, cellW, rowH, areaH))
    blocks.push(block(i === 0 ? SPACE.gap * s : SPACE.frameGutter * s, true, [{ h: tapeOver + rowH, ops }]))
  }
  return blocks
}
