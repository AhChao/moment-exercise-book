// Building blocks of the flow layout. A Part is a horizontal slab with ops relative to its top;
// a Block is a list of parts that the paginator places (atomic blocks move together).
import type { DisplayOp } from '../types'
import { baselineIn, type Ctx } from './sizes'
import { wrapText } from './wrap'

export interface Part {
  h: number
  ops: DisplayOp[]
}

export interface Block {
  /** space above the block (dropped at the top of a page) */
  gap: number
  /** true: keep all parts on one page when they fit on a page */
  atomic: boolean
  parts: Part[]
}

export function shiftOp(op: DisplayOp, dx: number, dy: number): DisplayOp {
  switch (op.op) {
    case 'line':
      return { ...op, x1: op.x1 + dx, x2: op.x2 + dx, y1: op.y1 + dy, y2: op.y2 + dy }
    default:
      return { ...op, x: op.x + dx, y: op.y + dy }
  }
}

/** Parts stacked top to bottom into one part. */
export function stack(parts: Part[]): Part {
  const ops: DisplayOp[] = []
  let y = 0
  for (const p of parts) {
    for (const op of p.ops) ops.push(y === 0 ? op : shiftOp(op, 0, y))
    y += p.h
  }
  return { h: y, ops }
}

export interface TextStyle {
  font: string
  size: number
  color: string
  /** line height as a multiple of size */
  leading: number
  align?: 'left' | 'center' | 'right'
}

export function lineOf(text: string, x: number, style: TextStyle): Part {
  const h = style.size * style.leading
  const t: Extract<DisplayOp, { op: 'text' }> = { op: 'text', x, y: baselineIn(style.size, h), text, font: style.font, color: style.color }
  if (style.align) t.align = style.align
  return { h, ops: [t] }
}

/** One part per wrapped line of text placed in the column [x, x + width]. */
export function paragraphParts(ctx: Ctx, text: string, x: number, width: number, style: TextStyle): Part[] {
  const lines = wrapText(text, width, style.font, ctx.measurer)
  const ax = style.align === 'center' ? x + width / 2 : style.align === 'right' ? x + width : x
  return lines.map((l) => lineOf(l, ax, style))
}

/** Puts a heading part on top of the first part of a list. */
export function withHead(head: Part, parts: Part[]): Part[] {
  const [firstPart, ...rest] = parts
  return firstPart ? [stack([head, firstPart]), ...rest] : [head]
}

export const block = (gap: number, atomic: boolean, parts: Part[]): Block => ({ gap, atomic, parts })

/** Removes the leading gap and returns the same block (used for the first block of a section). */
export function setGap(b: Block, gap: number): Block {
  return { ...b, gap }
}
