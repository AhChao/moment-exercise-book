// Minimal PDF 1.4 writer: one JPEG per page, page size = image pixels / 2 in points.
// Deterministic (no random ids, no clock); no dependencies.
import type { BuildPdf, RenderedPage } from './types'

const PX_PER_POINT = 2

const enc = (s: string): Uint8Array => {
  const out = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0xff
  return out
}

/** UTF-16BE text string with byte-order mark, as a PDF hex string. */
function hexText(s: string): string {
  let hex = 'FEFF'
  for (let i = 0; i < s.length; i++) hex += s.charCodeAt(i).toString(16).toUpperCase().padStart(4, '0')
  return `<${hex}>`
}

function pdfDate(iso: string): string | null {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const p = (n: number, len = 2): string => String(n).padStart(len, '0')
  return `D:${p(d.getUTCFullYear(), 4)}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}Z`
}

const num = (n: number): string => String(Number(n.toFixed(2)))

export const buildPdf: BuildPdf = (pages: RenderedPage[], meta) => {
  const chunks: Uint8Array[] = []
  const offsets: number[] = [] // offsets[k] = byte offset of object k + 1
  let pos = 0
  const write = (b: Uint8Array): void => {
    chunks.push(b)
    pos += b.length
  }
  const beginObj = (n: number): void => {
    offsets[n - 1] = pos
    write(enc(`${n} 0 obj\n`))
  }
  const endObj = (): void => write(enc('endobj\n'))

  // Header with a binary comment so transfer tools treat the file as binary.
  write(enc('%PDF-1.4\n'))
  write(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]))

  const firstPageObj = 4
  const pageObj = (k: number): number => firstPageObj + 3 * k

  beginObj(1)
  write(enc('<< /Type /Catalog /Pages 2 0 R >>\n'))
  endObj()

  beginObj(2)
  const kids = pages.map((_, k) => `${pageObj(k)} 0 R`).join(' ')
  write(enc(`<< /Type /Pages /Count ${pages.length} /Kids [${kids}] >>\n`))
  endObj()

  beginObj(3)
  const date = pdfDate(meta.createdIso)
  write(enc(`<< /Title ${hexText(meta.title)} /Producer (Moment Exercise Book)${date ? ` /CreationDate (${date})` : ''} >>\n`))
  endObj()

  pages.forEach((page, k) => {
    const pw = num(page.width / PX_PER_POINT)
    const ph = num(page.height / PX_PER_POINT)
    const content = enc(`q\n${pw} 0 0 ${ph} 0 0 cm\n/Im0 Do\nQ\n`)

    beginObj(pageObj(k))
    write(enc(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pw} ${ph}] ` +
      `/Resources << /XObject << /Im0 ${pageObj(k) + 2} 0 R >> >> /Contents ${pageObj(k) + 1} 0 R >>\n`,
    ))
    endObj()

    beginObj(pageObj(k) + 1)
    write(enc(`<< /Length ${content.length} >>\nstream\n`))
    write(content)
    write(enc('endstream\n'))
    endObj()

    beginObj(pageObj(k) + 2)
    write(enc(
      `<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} ` +
      `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.jpeg.length} >>\nstream\n`,
    ))
    write(page.jpeg)
    write(enc('\nendstream\n'))
    endObj()
  })

  const count = offsets.length + 1
  const xrefPos = pos
  let xref = `xref\n0 ${count}\n0000000000 65535 f \n`
  for (const off of offsets) xref += `${String(off).padStart(10, '0')} 00000 n \n`
  xref += `trailer\n<< /Size ${count} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`
  write(enc(xref))

  const out = new Uint8Array(pos)
  let at = 0
  for (const c of chunks) {
    out.set(c, at)
    at += c.length
  }
  return out
}
