/**
 * Photo adjustment on RGBA bytes, in place. All sliders are -100..100, 0 = no change.
 *
 * Per pixel, with r, g, b in 0..255 and L the integer luma (54r + 183g + 19b) >> 8 of the INPUT pixel:
 *   t          = L / 255
 *   gain       = 2^(exposure / 100 * 1.5)                      multiplicative
 *   shadowOff  = 255 * 0.5 * (shadows / 100)    * (1 - t)^2    additive, weight (1 - luma)^2
 *   highOff    = 255 * 0.5 * (highlights / 100) * t^2          additive, weight luma^2
 *   c'         = (c * gain + shadowOff + highOff) for each channel
 *   warmth w   = warmth / 100 * 0.2:  r' = r' * (1 + w),  b' = b' * (1 - w),  g untouched
 *   result     = clamp(round(c'), 0, 255)
 *
 * Sign convention: positive shadows lifts dark tones, negative deepens them. Positive highlights
 * brightens bright areas, negative recovers (darkens) them. Positive warmth = warmer.
 *
 * Weights come from the input luma, never from the partly developed value, so each slider's
 * contribution is independent and shadows / highlights / exposure are monotonic at every pixel.
 * Alpha is never touched. An all-zero spec returns before reading the array.
 */
import type { DevelopSpec } from '@/types'
import { isIdentity } from './identity'

const SHADOW_STRENGTH = 0.5
const HIGHLIGHT_STRENGTH = 0.5
const WARMTH_STRENGTH = 0.2

export function applyDevelop(data: Uint8ClampedArray, dev: DevelopSpec): void {
  if (isIdentity(dev)) return

  const gain = Math.pow(2, (dev.exposure / 100) * 1.5)
  const s = (dev.shadows / 100) * SHADOW_STRENGTH * 255
  const h = (dev.highlights / 100) * HIGHLIGHT_STRENGTH * 255

  // Offset per integer luma, so the pixel loop does no pow / division.
  const offset = new Float64Array(256)
  for (let l = 0; l < 256; l++) {
    const t = l / 255
    offset[l] = s * (1 - t) * (1 - t) + h * t * t
  }

  const w = (dev.warmth / 100) * WARMTH_STRENGTH
  const rMul = 1 + w
  const bMul = 1 - w

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const off = offset[(54 * r + 183 * g + 19 * b) >> 8]
    // Uint8ClampedArray assignment rounds and clamps to 0..255.
    data[i] = (r * gain + off) * rMul
    data[i + 1] = g * gain + off
    data[i + 2] = (b * gain + off) * bMul
  }
}
