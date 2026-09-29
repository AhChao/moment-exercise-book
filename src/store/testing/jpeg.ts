// Test helper: a tiny JPEG-shaped byte string with EXIF (and optionally a GPS block).
// Same layout technique as src/lib/exif.test.ts.
const GPS_IFD = 128
const GPS_VALUES = 158
const TIFF_LEN = 182

export function buildJpeg({ gps, focal35 = 24 }: { gps: boolean; focal35?: number }): Uint8Array {
  const tiff = new DataView(new ArrayBuffer(TIFF_LEN))
  const put = (o: number, v: number, size: 1 | 2 | 4) =>
    size === 1 ? tiff.setUint8(o, v) : size === 2 ? tiff.setUint16(o, v, true) : tiff.setUint32(o, v, true)
  const ascii = (o: number, s: string) => { for (let i = 0; i < s.length; i++) tiff.setUint8(o + i, s.charCodeAt(i)) }
  const entry = (o: number, tag: number, type: number, count: number, value: number, valueSize: 2 | 4 = 4) => {
    put(o, tag, 2); put(o + 2, type, 2); put(o + 4, count, 4); put(o + 8, value, valueSize)
  }
  ascii(0, 'II'); put(2, 0x2a, 2); put(4, 8, 4)
  put(8, 4, 2)
  entry(10, 0x010f, 2, 7, 62)
  entry(22, 0x0110, 2, 9, 69)
  entry(34, 0x8769, 4, 1, 78)
  entry(46, 0x8825, 4, 1, gps ? GPS_IFD : 0)
  ascii(62, 'Google'); ascii(69, 'Pixel 10')
  put(78, 3, 2)
  entry(80, 0x829a, 5, 1, 120)
  entry(92, 0x8827, 3, 1, 400, 2)
  entry(104, 0xa405, 3, 1, focal35, 2)
  put(120, 1, 4); put(124, 125, 4)
  if (gps) {
    put(GPS_IFD, 2, 2)
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
