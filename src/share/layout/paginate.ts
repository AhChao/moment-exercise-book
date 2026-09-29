// Places blocks onto pages. Atomic blocks move whole to the next page when they do not fit;
// other blocks (long paragraphs) and blocks taller than a page are split between their parts.
import type { DisplayOp, SheetGeometry, SheetPage } from '../types'
import { shiftOp, type Block, type Part } from './blocks'
import { SIZE, SPACE, baselineIn, type Ctx } from './sizes'
import { fitOneLine } from './wrap'

interface Draft {
  ops: DisplayOp[]
}

function footerOps(ctx: Ctx, footer: string, height: number): DisplayOp[] {
  const { s, theme, x0, w, margin } = ctx
  const ruleY = height - margin - SPACE.footer * s + 0.4 * s
  return [
    { op: 'line', x1: x0, y1: ruleY, x2: x0 + w, y2: ruleY, stroke: theme.inkFaint, lineWidth: Math.max(1, s * SPACE.hairline) },
    { op: 'text', x: x0, y: height - margin, text: fitOneLine(footer, w, ctx.f.footer, ctx.measurer), font: ctx.f.footer, color: theme.inkSoft },
  ]
}

function headerOps(ctx: Ctx, title: string): DisplayOp[] {
  const { s, theme, x0, w, margin } = ctx
  const size = s * SIZE.header
  const lh = size * 1.4
  return [
    { op: 'text', x: x0, y: margin + baselineIn(size, lh), text: fitOneLine(title, w, ctx.f.header, ctx.measurer), font: ctx.f.header, color: theme.inkSoft },
    { op: 'line', x1: x0, y1: margin + lh + 0.3 * s, x2: x0 + w, y2: margin + lh + 0.3 * s, stroke: theme.inkFaint, lineWidth: Math.max(1, s * SPACE.hairline) },
  ]
}

export function paginate(ctx: Ctx, blocks: Block[], geometry: SheetGeometry, title: string, footer: string): SheetPage[] {
  const { s, theme, margin, pageWidth } = ctx
  const auto = geometry.pageHeight === 'auto'
  const fixedH = geometry.pageHeight === 'auto' ? 0 : geometry.pageHeight
  const footerH = SPACE.footer * s
  const limit = auto ? Infinity : fixedH - margin - footerH

  const pages: Draft[] = []
  let cur: Draft = { ops: [] }
  let y = margin
  let top = margin

  const startPage = (): void => {
    const first = pages.length === 0
    cur = { ops: first ? [] : headerOps(ctx, title) }
    pages.push(cur)
    top = first ? margin : margin + SPACE.header * s
    y = top
  }
  startPage()

  const place = (part: Part): void => {
    for (const op of part.ops) cur.ops.push(shiftOp(op, 0, y))
    y += part.h
  }

  for (const b of blocks) {
    const total = b.parts.reduce((n, p) => n + p.h, 0)
    const gap = y === top ? 0 : b.gap
    if (b.atomic) {
      if (y + gap + total <= limit) {
        y += gap
        b.parts.forEach(place)
        continue
      }
      if (y > top) startPage()
      if (top + total <= limit) {
        b.parts.forEach(place)
        continue
      }
      // Taller than a page body: fall through to splitting by parts.
    }
    let g = y === top ? 0 : b.gap
    for (const p of b.parts) {
      if (y + g + p.h > limit && y > top) {
        startPage()
        g = 0
      }
      y += g
      g = 0
      place(p)
    }
  }

  const height = auto ? y + footerH + margin : fixedH
  return pages.map((d): SheetPage => ({
    width: pageWidth,
    height,
    ops: [
      { op: 'rect', x: 0, y: 0, w: pageWidth, h: height, fill: theme.paper },
      ...d.ops,
      ...footerOps(ctx, footer, height),
    ],
  }))
}
