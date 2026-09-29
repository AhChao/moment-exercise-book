// Gallery-picker import. Thin: decoding only; the logic lives in prepareImport.ts.
import { prepareImport } from './prepareImport'
import type { NewPhoto } from './types'

export async function importPhotoFile(file: File): Promise<NewPhoto> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  const { kind, exif, cleanBytes, lens } = prepareImport(bytes)
  const type = kind === 'jpeg' ? 'image/jpeg' : file.type || `image/${kind}`
  const blob = new Blob([cleanBytes as BlobPart], { type })
  let width: number
  let height: number
  try {
    const bmp = await createImageBitmap(blob)
    width = bmp.width
    height = bmp.height
    bmp.close()
  } catch {
    throw new Error('not-an-image')
  }
  return { blob, source: 'import', exif, applied: {}, lens, width, height }
}
