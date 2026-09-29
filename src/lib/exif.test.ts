import { describe, expect, it } from 'vitest'
import { parseExifBytes, stripGps } from './exif'
import { detectLens } from './lens'

// Fixed-layout little-endian TIFF, offsets relative to the TIFF header.
const GPS_IFD = 128
const GPS_VALUES = 158 // 3 rationals, 24 bytes
const TIFF_LEN = 182

function buildJpeg({ gps }: { gps: boolean }): Uint8Array {
  const tiff = new DataView(new ArrayBuffer(TIFF_LEN))
  const le = true
  const put = (o: number, v: number, size: 1 | 2 | 4) =>
    size === 1 ? tiff.setUint8(o, v) : size === 2 ? tiff.setUint16(o, v, le) : tiff.setUint32(o, v, le)
  const ascii = (o: number, s: string) => { for (let i = 0; i < s.length; i++) tiff.setUint8(o + i, s.charCodeAt(i)) }
  const entry = (o: number, tag: number, type: number, count: number, value: number, valueSize: 2 | 4 = 4) => {
    put(o, tag, 2); put(o + 2, type, 2); put(o + 4, count, 4); put(o + 8, value, valueSize)
  }

  ascii(0, 'II'); put(2, 0x2a, 2); put(4, 8, 4)
  // IFD0 at 8: make, model, ExifIFD pointer, GPS pointer
  put(8, 4, 2)
  entry(10, 0x010f, 2, 7, 62)
  entry(22, 0x0110, 2, 9, 69)
  entry(34, 0x8769, 4, 1, 78)
  entry(46, 0x8825, 4, 1, gps ? GPS_IFD : 0)
  ascii(62, 'Google'); ascii(69, 'Pixel 10')
  // ExifIFD at 78: exposure time 1/125, ISO 400, 35mm focal length 24
  put(78, 3, 2)
  entry(80, 0x829a, 5, 1, 120)
  entry(92, 0x8827, 3, 1, 400, 2)
  entry(104, 0xa405, 3, 1, 24, 2)
  put(120, 1, 4); put(124, 125, 4)
  if (gps) {
    put(GPS_IFD, 2, 2)
    ascii(GPS_IFD + 2 + 8, 'N') // inline value of entry 1
    entry(GPS_IFD + 2, 0x0001, 2, 2, 0)
    ascii(GPS_IFD + 2 + 8, 'N')
    entry(GPS_IFD + 14, 0x0002, 5, 3, GPS_VALUES)
    for (let i = 0; i < 3; i++) { put(GPS_VALUES + i * 8, 25 + i, 4); put(GPS_VALUES + i * 8 + 4, 1, 4) }
  }

  const payload = new Uint8Array(6 + TIFF_LEN)
  payload.set([0x45, 0x78, 0x69, 0x66, 0, 0])
  payload.set(new Uint8Array(tiff.buffer), 6)
  const out = new Uint8Array(2 + 4 + payload.length + 4 + 2)
  const dv = new DataView(out.buffer)
  dv.setUint16(0, 0xffd8)
  dv.setUint16(2, 0xffe1)
  dv.setUint16(4, payload.length + 2)
  out.set(payload, 6)
  const tail = 6 + payload.length
  dv.setUint16(tail, 0xffda)
  dv.setUint16(tail + 2, 2)
  dv.setUint16(tail + 4, 0xffd9)
  return out
}

describe('parseExifBytes', () => {
  it('reads the tags the app uses', () => {
    const info = parseExifBytes(buildJpeg({ gps: true }))
    expect(info).toMatchObject({ hasExif: true, hasGps: true, make: 'Google', model: 'Pixel 10', iso: 400, focalLength35: 24 })
    expect(info.exposureTime).toBeCloseTo(1 / 125, 6)
  })

  it('reports no GPS when the pointer is empty', () => {
    expect(parseExifBytes(buildJpeg({ gps: false })).hasGps).toBe(false)
  })

  it('never throws on garbage or truncated input', () => {
    expect(parseExifBytes(new Uint8Array([1, 2, 3]))).toEqual({ hasExif: false, hasGps: false })
    expect(parseExifBytes(new Uint8Array(0))).toEqual({ hasExif: false, hasGps: false })
    const jpeg = buildJpeg({ gps: true })
    expect(() => parseExifBytes(jpeg.slice(0, 40))).not.toThrow()
  })
})

describe('stripGps', () => {
  it('zeroes the GPS block, keeps everything else, and preserves length', () => {
    const before = buildJpeg({ gps: true })
    const after = stripGps(before)
    expect(after.length).toBe(before.length)
    const info = parseExifBytes(after)
    expect(info.hasGps).toBe(false)
    expect(info).toMatchObject({ make: 'Google', iso: 400, focalLength35: 24 })
    const tiffStart = 6 + 6
    const gpsRegion = after.slice(tiffStart + GPS_IFD, tiffStart + TIFF_LEN)
    expect(gpsRegion.every((b) => b === 0)).toBe(true)
  })

  it('does not modify its input and is a no-op copy without GPS', () => {
    const input = buildJpeg({ gps: true })
    const snapshot = input.slice()
    stripGps(input)
    expect(input).toEqual(snapshot)
    const clean = buildJpeg({ gps: false })
    expect(stripGps(clean)).toEqual(clean)
  })

  it('leaves non-JPEG bytes alone', () => {
    const junk = new Uint8Array([9, 9, 9, 9])
    expect(stripGps(junk)).toEqual(junk)
  })
})

describe('detectLens', () => {
  it('uses 35mm-equivalent focal length first', () => {
    expect(detectLens({ hasExif: true, hasGps: false, focalLength35: 14 })).toBe('ultrawide')
    expect(detectLens({ hasExif: true, hasGps: false, focalLength35: 24 })).toBe('main')
    expect(detectLens({ hasExif: true, hasGps: false, focalLength35: 120 })).toBe('tele')
  })

  it('falls back to the physical focal length (in-app photos carry no 35mm tag)', () => {
    expect(detectLens({ hasExif: true, hasGps: false, focalLength: 4.53 })).toBe('main')
    expect(detectLens({ hasExif: true, hasGps: false, focalLength: 14.2 })).toBe('tele')
    expect(detectLens({ hasExif: true, hasGps: false, focalLength: 1.854 })).toBe('ultrawide')
  })

  it('reads the millimetres out of a lens model string', () => {
    expect(detectLens({ hasExif: true, hasGps: false, lensModel: 'Pixel 10 back camera 1.854mm f/2.2' })).toBe('ultrawide')
  })

  it('treats a 5x request that fell back to the main sensor as main, and empty EXIF as unknown', () => {
    expect(detectLens({ hasExif: true, hasGps: false, focalLength: 4.53, focalLength35: 24 })).toBe('main')
    expect(detectLens({ hasExif: false, hasGps: false })).toBe('unknown')
  })

  it('reports the selfie camera from the facing mode', () => {
    expect(detectLens({ hasExif: false, hasGps: false }, 'user')).toBe('front')
  })
})
