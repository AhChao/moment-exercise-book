// Thin browser glue around applyDevelop. All math lives in apply.ts.
import type { DevelopSpec } from '@/types'
import { applyDevelop } from './apply'
import { isIdentity } from './identity'

function fitSize(w: number, h: number, maxEdge?: number): { w: number; h: number } {
  if (!maxEdge || Math.max(w, h) <= maxEdge) return { w, h }
  const k = maxEdge / Math.max(w, h)
  return { w: Math.max(1, Math.round(w * k)), h: Math.max(1, Math.round(h * k)) }
}

/** Full-size (or maxEdge-limited) developed JPEG. Identity without maxEdge returns the source untouched. */
export async function renderDeveloped(
  source: Blob,
  dev: DevelopSpec,
  opts: { maxEdge?: number; quality?: number } = {},
): Promise<Blob> {
  if (isIdentity(dev) && !opts.maxEdge) return source
  const bitmap = await createImageBitmap(source)
  try {
    const { w, h } = fitSize(bitmap.width, bitmap.height, opts.maxEdge)
    const canvas = new OffscreenCanvas(w, h)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('canvas-unavailable')
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(bitmap, 0, 0, w, h)
    if (!isIdentity(dev)) {
      const img = ctx.getImageData(0, 0, w, h)
      applyDevelop(img.data, dev)
      ctx.putImageData(img, 0, 0)
    }
    return await canvas.convertToBlob({ type: 'image/jpeg', quality: opts.quality ?? 0.92 })
  } finally {
    bitmap.close()
  }
}

/** Interactive preview: scale down to maxEdge first, then develop that small copy only. */
export function drawDevelopedPreview(
  canvas: HTMLCanvasElement,
  bitmap: ImageBitmap,
  dev: DevelopSpec,
  maxEdge = 1024,
): void {
  const { w, h } = fitSize(bitmap.width, bitmap.height, maxEdge)
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bitmap, 0, 0, w, h)
  if (isIdentity(dev)) return
  const img = ctx.getImageData(0, 0, w, h)
  applyDevelop(img.data, dev)
  ctx.putImageData(img, 0, 0)
}
