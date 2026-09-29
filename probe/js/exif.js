// Minimal JPEG/EXIF reader for the probe. Returns the tags we care about plus a
// structural summary (which APP markers exist, which IFD0 tags exist) so we can
// tell "EXIF stripped" apart from "EXIF present but tag missing".

const TAGS = {
  0x010f: 'Make', 0x0110: 'Model', 0x0112: 'Orientation', 0x0131: 'Software',
  0x829a: 'ExposureTime', 0x829d: 'FNumber', 0x8822: 'ExposureProgram', 0x8827: 'ISO',
  0x9003: 'DateTimeOriginal', 0x9201: 'ShutterSpeedValue', 0x9204: 'ExposureBias',
  0x9207: 'MeteringMode', 0x9209: 'Flash', 0x920a: 'FocalLength',
  0xa402: 'ExposureMode', 0xa403: 'WhiteBalance', 0xa405: 'FocalLengthIn35mm',
  0xa434: 'LensModel', 0xa002: 'PixelXDimension', 0xa003: 'PixelYDimension',
}
const TYPE_SIZE = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 }

function readIfd(view, tiff, offset, little, out, names, wanted) {
  const count = view.getUint16(tiff + offset, little)
  const subIfds = {}
  for (let i = 0; i < count; i++) {
    const e = tiff + offset + 2 + i * 12
    const tag = view.getUint16(e, little)
    const type = view.getUint16(e + 2, little)
    const n = view.getUint32(e + 4, little)
    names.push(tag)
    if (tag === 0x8769 || tag === 0x8825) { subIfds[tag] = view.getUint32(e + 8, little); continue }
    if (!wanted(tag) || !TYPE_SIZE[type]) continue
    const bytes = TYPE_SIZE[type] * n
    const at = bytes > 4 ? tiff + view.getUint32(e + 8, little) : e + 8
    const val = []
    for (let k = 0; k < Math.min(n, type === 2 ? n : 4); k++) {
      const p = at + k * TYPE_SIZE[type]
      if (type === 3) val.push(view.getUint16(p, little))
      else if (type === 4) val.push(view.getUint32(p, little))
      else if (type === 9) val.push(view.getInt32(p, little))
      else if (type === 5) val.push(view.getUint32(p, little) / (view.getUint32(p + 4, little) || 1))
      else if (type === 10) val.push(view.getInt32(p, little) / (view.getInt32(p + 4, little) || 1))
      else if (type === 1 || type === 7) val.push(view.getUint8(p))
    }
    if (type === 2) {
      let s = ''
      for (let k = 0; k < n; k++) { const c = view.getUint8(at + k); if (!c) break; s += String.fromCharCode(c) }
      out[TAGS[tag]] = s
    } else {
      out[TAGS[tag]] = val.length === 1 ? val[0] : val
    }
  }
  return subIfds
}

export async function parseExif(blob) {
  const buf = await blob.arrayBuffer()
  const view = new DataView(buf)
  const result = { bytes: buf.byteLength, isJpeg: false, markers: [], hasExif: false, tags: {}, ifd0Tags: [], gps: false }
  if (view.getUint16(0) !== 0xffd8) return result
  result.isJpeg = true
  let p = 2
  while (p + 4 < view.byteLength) {
    if (view.getUint8(p) !== 0xff) break
    const marker = view.getUint8(p + 1)
    if (marker === 0xda) break
    const len = view.getUint16(p + 2)
    let id = ''
    for (let k = 0; k < 6 && p + 4 + k < view.byteLength; k++) id += String.fromCharCode(view.getUint8(p + 4 + k))
    result.markers.push(`FF${marker.toString(16).toUpperCase()}:${id.replace(/[^\x20-\x7e]/g, '.').trim()}:${len}`)
    if (marker === 0xe1 && id.startsWith('Exif')) {
      try {
        const tiff = p + 10
        const little = view.getUint16(tiff) === 0x4949
        const ifd0 = view.getUint32(tiff + 4, little)
        const subs = readIfd(view, tiff, ifd0, little, result.tags, result.ifd0Tags, (t) => !!TAGS[t])
        result.hasExif = true
        if (subs[0x8769]) readIfd(view, tiff, subs[0x8769], little, result.tags, [], (t) => !!TAGS[t])
        result.gps = !!subs[0x8825]
      } catch (err) {
        result.parseError = String(err)
      }
    }
    p += 2 + len
  }
  return result
}

export async function imageSize(blob) {
  try {
    const bmp = await createImageBitmap(blob)
    const s = { width: bmp.width, height: bmp.height }
    bmp.close()
    return s
  } catch (err) {
    return { error: String(err) }
  }
}
