// TextMeasurer backed by one shared OffscreenCanvas 2D context, with a small memo cache.
import type { TextMeasurer } from './types'

const MAX_ENTRIES = 4000

export function createMeasurer(): TextMeasurer {
  const ctx = new OffscreenCanvas(1, 1).getContext('2d')
  const cache = new Map<string, number>()
  return {
    width(text: string, font: string): number {
      if (!ctx || !text) return 0
      const key = `${font}\u0000${text}`
      const hit = cache.get(key)
      if (hit !== undefined) return hit
      ctx.font = font
      const w = ctx.measureText(text).width
      if (cache.size >= MAX_ENTRIES) cache.clear()
      cache.set(key, w)
      return w
    },
  }
}
