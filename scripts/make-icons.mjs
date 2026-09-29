// Draws the PWA icons (film strip + lens ring) into public/. Re-run after changing the palette.
// No dependencies: rasterises with 3x supersampling and writes PNG by hand.
import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')
const PAPER = [0xef, 0xe4, 0xcb], INK = [0x3a, 0x2d, 0x26], FILM = [0x2b, 0x21, 0x1b], RED = [0xb4, 0x53, 0x3c], LIGHT = [0xf8, 0xf1, 0xde]

const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0 })
const crc = (b) => { let c = 0xffffffff; for (const x of b) c = crcTable[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0 }
const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]) }

// shape(x, y) in 0..1 space -> colour or null
function scene(safe) {
  const s = safe // scale of the artwork inside the canvas (maskable icons need a safe zone)
  const cx = 0.5, cy = 0.5
  return (x, y) => {
    const u = (x - cx) / s + cx, v = (y - cy) / s + cy
    if (u < 0 || u > 1 || v < 0 || v > 1) return null
    // film bars with perforations
    if (v < 0.16 || v > 0.84) {
      const dx = ((u * 8) % 1) - 0.5, dy = (v < 0.5 ? v : v - 0.84) / 0.16 - 0.5
      return Math.abs(dx) < 0.3 && Math.abs(dy) < 0.24 ? PAPER : FILM
    }
    const d = Math.hypot(u - 0.5, v - 0.5)
    if (d < 0.11) return LIGHT
    if (d < 0.2) return RED
    if (d < 0.27) return INK
    if (d < 0.31) return LIGHT
    return PAPER
  }
}

function png(size, safe, name) {
  const f = scene(safe), SS = 3
  const raw = Buffer.alloc((size * 3 + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0
      for (let j = 0; j < SS; j++) for (let i = 0; i < SS; i++) {
        const c = f((x + (i + 0.5) / SS) / size, (y + (j + 0.5) / SS) / size) ?? PAPER
        r += c[0]; g += c[1]; b += c[2]
      }
      const o = y * (size * 3 + 1) + 1 + x * 3
      raw[o] = r / (SS * SS); raw[o + 1] = g / (SS * SS); raw[o + 2] = b / (SS * SS)
    }
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 2
  writeFileSync(join(out, name), Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]))
}

png(192, 1, 'icon-192.png')
png(512, 1, 'icon-512.png')
png(512, 0.78, 'icon-maskable-512.png')
