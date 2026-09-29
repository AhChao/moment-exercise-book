// Browser glue: a CaptureResult becomes a NewPhoto (GPS erased, dimensions measured, lens detected).
import type { CaptureResult } from '@/camera/types'
import { parseExif, stripGps } from '@/lib/exif'
import { detectLens } from '@/lib/lens'
import type { NewPhoto } from '@/store/types'

export async function prepareCapture(result: CaptureResult): Promise<NewPhoto> {
  const bytes = new Uint8Array(await result.blob.arrayBuffer())
  const blob = new Blob([stripGps(bytes) as BlobPart], { type: 'image/jpeg' })
  const exif = await parseExif(blob)
  const bitmap = await createImageBitmap(blob)
  const { width, height } = bitmap
  bitmap.close()
  return { blob, source: 'camera', exif, applied: result.applied, lens: detectLens(exif), width, height }
}
