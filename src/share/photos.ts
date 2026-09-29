// Decodes the frame photos of one sheet, developed and limited to maxEdge, one at a time.
import type { PhotoMeta } from '@/types'
import { renderDeveloped } from '@/develop/render'

/** Sequential on purpose: at most one full-size decode is alive. A failure gives null for that photo. */
export async function loadSheetPhotos(
  photos: (PhotoMeta | null)[],
  getBlob: (id: string) => Promise<Blob>,
  maxEdge: number,
): Promise<(ImageBitmap | null)[]> {
  const out: (ImageBitmap | null)[] = []
  for (const p of photos) {
    if (!p) {
      out.push(null)
      continue
    }
    try {
      const source = await getBlob(p.id)
      const developed = await renderDeveloped(source, p.develop, { maxEdge, quality: 0.9 })
      out.push(await createImageBitmap(developed))
    } catch {
      out.push(null)
    }
  }
  return out
}

/** Releases the bitmaps returned by loadSheetPhotos. */
export function closeAll(bitmaps: (ImageBitmap | null)[]): void {
  for (const b of bitmaps) b?.close()
}
