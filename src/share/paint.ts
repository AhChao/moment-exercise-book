// Executes a display list with Canvas 2D. No layout decisions live here.
import type { DisplayOp, SheetPage, SheetTheme } from './types'

export type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D

const DASH: [number, number] = [8, 6]

/** Deterministic PRNG so the grain looks the same on every export. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function paintBackground(ctx: Ctx2D, page: SheetPage, theme: SheetTheme): void {
  ctx.fillStyle = theme.paper
  ctx.fillRect(0, 0, page.width, page.height)
  const rand = mulberry32(page.width * 31 + Math.round(page.height))
  const dots = Math.min(9000, Math.round((page.width * page.height) / 700))
  ctx.fillStyle = 'rgba(107, 90, 76, 0.06)'
  for (let i = 0; i < dots; i++) {
    const s = rand() < 0.2 ? 2 : 1
    ctx.fillRect(Math.floor(rand() * page.width), Math.floor(rand() * page.height), s, s)
  }
}

function roundedPath(ctx: Ctx2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath()
  const rr = (ctx as { roundRect?: (x: number, y: number, w: number, h: number, r: number) => void }).roundRect
  if (r > 0 && rr) rr.call(ctx, x, y, w, h, r)
  else ctx.rect(x, y, w, h)
}

function paintRect(ctx: Ctx2D, op: Extract<DisplayOp, { op: 'rect' }>): void {
  roundedPath(ctx, op.x, op.y, op.w, op.h, op.radius ?? 0)
  if (op.fill) {
    ctx.fillStyle = op.fill
    ctx.fill()
  }
  if (op.stroke) {
    ctx.strokeStyle = op.stroke
    ctx.lineWidth = op.lineWidth ?? 1
    ctx.setLineDash(op.dashed ? DASH : [])
    ctx.stroke()
    ctx.setLineDash([])
  }
}

function paintLine(ctx: Ctx2D, op: Extract<DisplayOp, { op: 'line' }>): void {
  ctx.strokeStyle = op.stroke
  ctx.lineWidth = op.lineWidth
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(op.x1, op.y1)
  if (op.wavy) {
    const dx = op.x2 - op.x1
    const dy = op.y2 - op.y1
    const len = Math.hypot(dx, dy)
    const steps = Math.max(2, Math.round(len / 3))
    const nx = len ? -dy / len : 0
    const ny = len ? dx / len : 0
    const amp = Math.max(1, op.lineWidth * 0.9)
    const period = 14
    for (let i = 1; i <= steps; i++) {
      const t = i / steps
      const off = Math.sin((t * len * 2 * Math.PI) / period) * amp
      ctx.lineTo(op.x1 + dx * t + nx * off, op.y1 + dy * t + ny * off)
    }
  } else {
    ctx.lineTo(op.x2, op.y2)
  }
  ctx.stroke()
}

function paintPhoto(ctx: Ctx2D, op: Extract<DisplayOp, { op: 'photo' }>, bitmap: ImageBitmap | null | undefined, theme: SheetTheme): void {
  ctx.save()
  ctx.beginPath()
  ctx.rect(op.x, op.y, op.w, op.h)
  ctx.clip()
  if (!bitmap || bitmap.width === 0 || bitmap.height === 0) {
    // Empty frame area: a slightly deeper paper tone, no image.
    ctx.fillStyle = theme.paper
    ctx.fillRect(op.x, op.y, op.w, op.h)
    ctx.fillStyle = 'rgba(107, 90, 76, 0.16)'
    ctx.fillRect(op.x, op.y, op.w, op.h)
  } else {
    const scale = Math.max(op.w / bitmap.width, op.h / bitmap.height)
    const sw = op.w / scale
    const sh = op.h / scale
    const sx = (bitmap.width - sw) / 2
    const sy = (bitmap.height - sh) / 2
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(bitmap, sx, sy, sw, sh, op.x, op.y, op.w, op.h)
  }
  ctx.restore()
}

function paintStamp(ctx: Ctx2D, op: Extract<DisplayOp, { op: 'stamp' }>, theme: SheetTheme): void {
  // (x, y) is the centre of the stamp; it is rotated about that point.
  const font = `700 30px ${theme.fontHand}`
  ctx.font = font
  const padX = 18
  const boxH = 54
  const boxW = ctx.measureText(op.text).width + padX * 2
  ctx.save()
  ctx.translate(op.x, op.y)
  ctx.rotate((-5 * Math.PI) / 180)
  ctx.strokeStyle = op.color
  ctx.lineJoin = 'round'
  ctx.lineWidth = 3
  roundedPath(ctx, -boxW / 2, -boxH / 2, boxW, boxH, 6)
  ctx.stroke()
  ctx.lineWidth = 1.5
  roundedPath(ctx, -boxW / 2 + 6, -boxH / 2 + 6, boxW - 12, boxH - 12, 3)
  ctx.stroke()
  ctx.fillStyle = op.color
  ctx.font = font
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(op.text, 0, 1)
  ctx.restore()
}

function paintStrip(ctx: Ctx2D, op: Extract<DisplayOp, { op: 'strip' }>, theme: SheetTheme): void {
  roundedPath(ctx, op.x, op.y, op.w, op.h, 3)
  ctx.fillStyle = theme.film
  ctx.fill()
  const pitch = 18
  const r = 3.4
  const inset = 11
  ctx.fillStyle = theme.paper
  ctx.globalAlpha = 0.85
  for (let x = op.x + pitch / 2; x < op.x + op.w; x += pitch) {
    for (const cy of [op.y + inset, op.y + op.h - inset]) {
      ctx.beginPath()
      ctx.arc(x, cy, r, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.globalAlpha = 1
}

/** Paints one page onto a canvas context already sized to page.width x page.height. */
export function paintPage(ctx: Ctx2D, page: SheetPage, photos: (ImageBitmap | null)[], theme: SheetTheme): void {
  paintBackground(ctx, page, theme)
  for (const op of page.ops) {
    switch (op.op) {
      case 'rect':
        paintRect(ctx, op)
        break
      case 'line':
        paintLine(ctx, op)
        break
      case 'text':
        ctx.font = op.font
        ctx.fillStyle = op.color
        ctx.textAlign = op.align ?? 'left'
        ctx.textBaseline = 'alphabetic'
        ctx.fillText(op.text, op.x, op.y)
        break
      case 'photo':
        paintPhoto(ctx, op, photos[op.frame], theme)
        break
      case 'stamp':
        paintStamp(ctx, op, theme)
        break
      case 'strip':
        paintStrip(ctx, op, theme)
        break
    }
  }
}
