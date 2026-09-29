// JPEG EXIF reader and GPS eraser. Pure: operates on bytes, no DOM.
// Shared single source: the camera engine reads it to verify a shot, the import path reads it
// and erases GPS before storing. Do not write a second parser.
import type { ExifInfo } from '@/types'

const TAG = {
  make: 0x010f, model: 0x0110, orientation: 0x0112,
  exposureTime: 0x829a, fNumber: 0x829d, iso: 0x8827, dateTimeOriginal: 0x9003,
  exposureBias: 0x9204, focalLength: 0x920a, whiteBalance: 0xa403,
  focalLength35: 0xa405, lensModel: 0xa434,
  exifIfd: 0x8769, gpsIfd: 0x8825,
} as const

const TYPE_SIZE: Record<number, number> = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 }

/** Unused tag id written over the GPS pointer; readers skip unknown tags. */
const NEUTRALISED_TAG = 0xea1c

interface Entry { tag: number; type: number; count: number; valueAt: number; entryAt: number }

interface Exif {
  view: DataView
  tiff: number
  little: boolean
  ifd0: number
}

function locateExif(bytes: Uint8Array): Exif | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) return null
  let p = 2
  while (p + 4 <= view.byteLength) {
    if (view.getUint8(p) !== 0xff) return null
    const marker = view.getUint8(p + 1)
    if (marker === 0xda || marker === 0xd9) return null
    const len = view.getUint16(p + 2)
    if (marker === 0xe1 && p + 10 <= view.byteLength && readAscii(view, p + 4, 4) === 'Exif') {
      const tiff = p + 10
      if (tiff + 8 > view.byteLength) return null
      const little = view.getUint16(tiff) === 0x4949
      return { view, tiff, little, ifd0: view.getUint32(tiff + 4, little) }
    }
    p += 2 + len
  }
  return null
}

function readAscii(view: DataView, at: number, n: number): string {
  let s = ''
  for (let i = 0; i < n && at + i < view.byteLength; i++) {
    const c = view.getUint8(at + i)
    if (c === 0) break
    s += String.fromCharCode(c)
  }
  return s
}

function entries(x: Exif, ifdOffset: number): Entry[] {
  const { view, tiff, little } = x
  const start = tiff + ifdOffset
  if (ifdOffset === 0 || start + 2 > view.byteLength) return []
  const count = view.getUint16(start, little)
  const out: Entry[] = []
  for (let i = 0; i < count; i++) {
    const e = start + 2 + i * 12
    if (e + 12 > view.byteLength) break
    const type = view.getUint16(e + 2, little)
    const n = view.getUint32(e + 4, little)
    const size = (TYPE_SIZE[type] ?? 0) * n
    out.push({
      tag: view.getUint16(e, little), type, count: n, entryAt: e,
      valueAt: size > 4 ? tiff + view.getUint32(e + 8, little) : e + 8,
    })
  }
  return out
}

function numbers(x: Exif, e: Entry): number[] {
  const { view, little } = x
  const size = TYPE_SIZE[e.type]
  const out: number[] = []
  if (!size) return out
  for (let i = 0; i < Math.min(e.count, 4); i++) {
    const p = e.valueAt + i * size
    if (p + size > view.byteLength) break
    switch (e.type) {
      case 1: case 7: out.push(view.getUint8(p)); break
      case 3: out.push(view.getUint16(p, little)); break
      case 4: out.push(view.getUint32(p, little)); break
      case 9: out.push(view.getInt32(p, little)); break
      case 5: { const d = view.getUint32(p + 4, little); out.push(d ? view.getUint32(p, little) / d : 0); break }
      case 10: { const d = view.getInt32(p + 4, little); out.push(d ? view.getInt32(p, little) / d : 0); break }
    }
  }
  return out
}

function text(x: Exif, e: Entry): string {
  return readAscii(x.view, e.valueAt, e.count).trim()
}

/** Reads the tags the app uses. Never throws: malformed input yields { hasExif: false, hasGps: false }. */
export function parseExifBytes(bytes: Uint8Array): ExifInfo {
  const empty: ExifInfo = { hasExif: false, hasGps: false }
  try {
    const x = locateExif(bytes)
    if (!x) return empty
    const info: ExifInfo = { hasExif: true, hasGps: false }
    const ifd0 = entries(x, x.ifd0)
    let exifIfd: Entry[] = []
    for (const e of ifd0) {
      if (e.tag === TAG.make) info.make = text(x, e)
      else if (e.tag === TAG.model) info.model = text(x, e)
      else if (e.tag === TAG.orientation) info.orientation = numbers(x, e)[0]
      else if (e.tag === TAG.exifIfd) exifIfd = entries(x, x.view.getUint32(e.entryAt + 8, x.little))
      else if (e.tag === TAG.gpsIfd) info.hasGps = x.view.getUint32(e.entryAt + 8, x.little) !== 0
    }
    for (const e of exifIfd) {
      const n = numbers(x, e)[0]
      if (e.tag === TAG.exposureTime) info.exposureTime = n
      else if (e.tag === TAG.fNumber) info.fNumber = n
      else if (e.tag === TAG.iso) info.iso = n
      else if (e.tag === TAG.dateTimeOriginal) info.dateTimeOriginal = text(x, e)
      else if (e.tag === TAG.exposureBias) info.exposureBias = n
      else if (e.tag === TAG.focalLength) info.focalLength = n
      else if (e.tag === TAG.whiteBalance) info.whiteBalance = n
      else if (e.tag === TAG.focalLength35) info.focalLength35 = n
      else if (e.tag === TAG.lensModel) info.lensModel = text(x, e)
    }
    return info
  } catch {
    return empty
  }
}

export async function parseExif(blob: Blob): Promise<ExifInfo> {
  // EXIF lives in the first 64 KiB segment(s); reading a bounded head avoids loading 12 MP files twice.
  const head = await blob.slice(0, 256 * 1024).arrayBuffer()
  return parseExifBytes(new Uint8Array(head))
}

/**
 * Returns a copy of the JPEG with the GPS block erased: the GPS IFD and every out-of-line value it
 * points to are zeroed, and the IFD0 pointer is disabled. All other bytes are unchanged, so the
 * image data and remaining EXIF stay valid. Input without GPS is returned as an identical copy.
 */
export function stripGps(bytes: Uint8Array): Uint8Array {
  const out = bytes.slice()
  try {
    const x = locateExif(out)
    if (!x) return out
    for (const e of entries(x, x.ifd0)) {
      if (e.tag !== TAG.gpsIfd) continue
      const gpsOffset = x.view.getUint32(e.entryAt + 8, x.little)
      if (!gpsOffset) continue
      const gps = entries(x, gpsOffset)
      for (const g of gps) {
        const size = (TYPE_SIZE[g.type] ?? 0) * g.count
        if (size > 4 && g.valueAt + size <= out.length) out.fill(0, g.valueAt, g.valueAt + size)
      }
      const start = x.tiff + gpsOffset
      out.fill(0, start, Math.min(out.length, start + 2 + gps.length * 12 + 4))
      x.view.setUint16(e.entryAt, NEUTRALISED_TAG, x.little)
      x.view.setUint32(e.entryAt + 8, 0, x.little)
    }
  } catch {
    // Leave the copy as-is: an unparsable file has no reachable GPS block.
  }
  return out
}
