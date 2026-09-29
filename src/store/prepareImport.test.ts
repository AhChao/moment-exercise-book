import { describe, expect, it } from 'vitest'
import { parseExifBytes } from '@/lib/exif'
import { prepareImport, sniffImage } from './prepareImport'
import { buildJpeg } from './testing/jpeg'

describe('prepareImport', () => {
  it('erases GPS, keeps the other tags and detects the lens', () => {
    const input = buildJpeg({ gps: true })
    expect(parseExifBytes(input).hasGps).toBe(true)
    const out = prepareImport(input)
    expect(out.kind).toBe('jpeg')
    expect(out.exif).toMatchObject({ hasExif: true, hasGps: false, model: 'Pixel 10', iso: 400 })
    expect(parseExifBytes(out.cleanBytes).hasGps).toBe(false)
    expect(out.lens).toBe('main')
  })

  it('detects an ultrawide and a tele photo from the 35 mm tag', () => {
    expect(prepareImport(buildJpeg({ gps: false, focal35: 14 })).lens).toBe('ultrawide')
    expect(prepareImport(buildJpeg({ gps: false, focal35: 120 })).lens).toBe('tele')
  })

  it('does not modify the input bytes', () => {
    const input = buildJpeg({ gps: true })
    const snapshot = input.slice()
    prepareImport(input)
    expect(input).toEqual(snapshot)
  })

  it('accepts PNG and WebP without EXIF', () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0])
    const webp = new Uint8Array([...'RIFF'].map((c) => c.charCodeAt(0)).concat([0, 0, 0, 0], [...'WEBP'].map((c) => c.charCodeAt(0))))
    for (const bytes of [png, webp]) {
      const out = prepareImport(bytes)
      expect(out.exif).toEqual({ hasExif: false, hasGps: false })
      expect(out.lens).toBe('unknown')
      expect(out.cleanBytes).toEqual(bytes)
    }
  })

  it('rejects non-image bytes', () => {
    expect(() => prepareImport(new TextEncoder().encode('hello world, not a picture'))).toThrow('not-an-image')
    expect(() => prepareImport(new Uint8Array(0))).toThrow('not-an-image')
    expect(sniffImage(new Uint8Array([0xff, 0xd8]))).toBeNull()
  })
})
