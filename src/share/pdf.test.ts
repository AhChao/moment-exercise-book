import { describe, expect, it } from 'vitest'
import { buildPdf } from './pdf'
import type { RenderedPage } from './types'

const latin1 = (b: Uint8Array): string => {
  let s = ''
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i] as number)
  return s
}

// Bytes 0..255 twice, so the stream holds every byte value, including CR, LF and ASCII text lookalikes.
const jpegBytes = (seed: number): Uint8Array => {
  const b = new Uint8Array(520)
  for (let i = 0; i < b.length; i++) b[i] = (i + seed) & 0xff
  b.set([0xff, 0xd8], 0)
  b.set([0xff, 0xd9], b.length - 2)
  return b
}

const pages: RenderedPage[] = [
  { jpeg: jpegBytes(1), width: 600, height: 800 },
  { jpeg: jpegBytes(7), width: 601, height: 1201 },
]
const meta = { title: '快門速度 練習', createdIso: '2026-09-29T08:00:00.000Z' }
const pdf = buildPdf(pages, meta)
const text = latin1(pdf)

describe('buildPdf', () => {
  it('has the PDF header and end marker', () => {
    expect(text.startsWith('%PDF-1.4\n')).toBe(true)
    expect(text.endsWith('%%EOF\n')).toBe(true)
  })

  it('is deterministic', () => {
    expect(latin1(buildPdf(pages, meta))).toBe(text)
  })

  it('has 3 + 3 objects per page and a matching xref', () => {
    const objects = 3 + 3 * pages.length
    expect(text.match(/^\d+ 0 obj$/gm)).toHaveLength(objects)
    expect(text).toContain(`/Size ${objects + 1}`)
    const xrefAt = Number(/startxref\n(\d+)\n%%EOF/.exec(text)?.[1])
    expect(text.slice(xrefAt, xrefAt + 5)).toBe('xref\n')
    const lines = text.slice(xrefAt).split('\n')
    expect(lines[1]).toBe(`0 ${objects + 1}`)
    expect(lines[2]).toBe('0000000000 65535 f ')
    for (let n = 1; n <= objects; n++) {
      const entry = lines[2 + n] as string
      expect(entry).toMatch(/^\d{10} 00000 n $/)
      const off = Number(entry.slice(0, 10))
      expect(text.slice(off, off + `${n} 0 obj\n`.length)).toBe(`${n} 0 obj\n`)
    }
  })

  it('writes one page object per image with the size in points (pixels / 2)', () => {
    expect(text).toContain('/Count 2')
    expect(text.match(/\/Type \/Page /g)).toHaveLength(2)
    expect(text).toContain('/MediaBox [0 0 300 400]')
    expect(text).toContain('/MediaBox [0 0 300.5 600.5]')
    expect(text).toContain('300 0 0 400 0 0 cm')
  })

  it('stores the title as UTF-16BE hex and the creation date', () => {
    const hex = [...meta.title].map((c) => c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')).join('')
    expect(text).toContain(`/Title <FEFF${hex}>`)
    expect(text).toContain('/CreationDate (D:20260929080000Z)')
  })

  it('embeds each JPEG intact with the exact /Length', () => {
    for (const p of pages) {
      const head = `/Width ${p.width} /Height ${p.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpeg.length} >>\nstream\n`
      const at = text.indexOf(head)
      expect(at).toBeGreaterThan(0)
      const start = at + head.length
      expect(Array.from(pdf.slice(start, start + p.jpeg.length))).toEqual(Array.from(p.jpeg))
      expect(text.slice(start + p.jpeg.length, start + p.jpeg.length + 10)).toBe('\nendstream')
    }
  })

  it('writes a content stream whose /Length matches', () => {
    const m = /<< \/Length (\d+) >>\nstream\n/.exec(text)
    expect(m).not.toBeNull()
    const start = (m?.index ?? 0) + (m?.[0].length ?? 0)
    const len = Number(m?.[1])
    expect(text.slice(start + len, start + len + 10)).toBe('endstream\n')
    expect(text.slice(start, start + len)).toMatch(/\/Im0 Do\nQ\n$/)
  })

  it('handles an empty page list', () => {
    const empty = latin1(buildPdf([], meta))
    expect(empty).toContain('/Count 0')
    expect(empty).toContain('/Size 4')
  })
})
