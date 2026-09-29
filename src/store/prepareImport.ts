// Pure part of photo import: bytes -> { exif, cleanBytes, lens }. No DOM.
import { parseExifBytes, stripGps } from '@/lib/exif'
import { detectLens } from '@/lib/lens'
import type { ExifInfo, Lens } from '@/types'

export type ImageKind = 'jpeg' | 'png' | 'webp' | 'heic'

export interface PreparedImport {
  kind: ImageKind
  exif: ExifInfo
  cleanBytes: Uint8Array
  lens: Lens
}

const ascii = (b: Uint8Array, at: number, n: number) => String.fromCharCode(...b.subarray(at, at + n))

export function sniffImage(b: Uint8Array): ImageKind | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpeg'
  if (b.length >= 8 && b[0] === 0x89 && ascii(b, 1, 3) === 'PNG') return 'png'
  if (b.length >= 12 && ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 4) === 'WEBP') return 'webp'
  if (b.length >= 12 && ascii(b, 4, 4) === 'ftyp' && /^(heic|heix|hevc|mif1|msf1|heif)$/.test(ascii(b, 8, 4))) return 'heic'
  return null
}

/** Throws Error('not-an-image') for unrecognised bytes. GPS is erased from JPEGs; the input is not modified. */
export function prepareImport(bytes: Uint8Array): PreparedImport {
  const kind = sniffImage(bytes)
  if (!kind) throw new Error('not-an-image')
  if (kind !== 'jpeg') {
    const exif: ExifInfo = { hasExif: false, hasGps: false }
    return { kind, exif, cleanBytes: bytes.slice(), lens: detectLens(exif) }
  }
  const cleanBytes = stripGps(bytes)
  const exif = parseExifBytes(cleanBytes)
  return { kind, exif, cleanBytes, lens: detectLens(exif) }
}
