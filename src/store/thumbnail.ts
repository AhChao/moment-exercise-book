// Browser-only glue: 480 px long-edge JPEG thumbnail.
export const THUMB_EDGE = 480

export async function makeThumbnail(blob: Blob): Promise<Blob> {
  // createImageBitmap applies EXIF orientation, so the thumb is upright.
  const bmp = await createImageBitmap(blob)
  try {
    const scale = Math.min(1, THUMB_EDGE / Math.max(bmp.width, bmp.height))
    const w = Math.max(1, Math.round(bmp.width * scale))
    const h = Math.max(1, Math.round(bmp.height * scale))
    const canvas = new OffscreenCanvas(w, h)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('canvas-unavailable')
    ctx.drawImage(bmp, 0, 0, w, h)
    return await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.8 })
  } finally {
    bmp.close()
  }
}
