// Photographic stop lists and snapping helpers for the capture controls. Pure.

/** Conventional 1/3-stop shutter speeds, 1/4000 s .. 1 s, ascending, in seconds. */
const SHUTTER_DENOMINATORS = [
  4000, 3200, 2500, 2000, 1600, 1250, 1000, 800, 640, 500, 400, 320, 250, 200, 160, 125, 100, 80, 60, 50, 40, 30, 25,
  20, 15, 13, 10, 8, 6, 5, 4, 3,
]
export const SHUTTER_STOPS: readonly number[] = [...SHUTTER_DENOMINATORS.map((d) => 1 / d), 0.5, 0.6, 0.8, 1].sort(
  (a, b) => a - b,
)

/** ISO 50 .. 6400 in 1/3-stop steps. */
export const ISO_STOPS: readonly number[] = [
  50, 64, 80, 100, 125, 160, 200, 250, 320, 400, 500, 640, 800, 1000, 1250, 1600, 2000, 2500, 3200, 4000, 5000, 6400,
]

export const ZOOM_PRESETS: readonly number[] = [1, 2, 5]

export interface Range {
  min: number
  max: number
}

/** Stops the phone can actually do; when it reports no range the list is returned unchanged. */
export function stopsWithin(stops: readonly number[], range?: Range): number[] {
  if (!range) return [...stops]
  // Small tolerance so 1/4000 is kept when the phone's floor is marginally above it.
  const inside = stops.filter((s) => s >= range.min * 0.999 && s <= range.max * 1.001)
  return inside.length ? inside : [...stops]
}

/** Index of the stop closest to `value`, measured in stops (log scale). */
export function nearestStopIndex(stops: readonly number[], value: number): number {
  if (!stops.length || !(value > 0)) return 0
  let best = 0
  let bestDist = Infinity
  stops.forEach((s, i) => {
    const d = Math.abs(Math.log2(s) - Math.log2(value))
    if (d < bestDist) {
      best = i
      bestDist = d
    }
  })
  return best
}

export function snapToStop(stops: readonly number[], value: number): number {
  return stops[nearestStopIndex(stops, value)] ?? value
}

/** Moves `delta` stops from the stop nearest to `value`, staying inside the list. */
export function stepStop(stops: readonly number[], value: number, delta: number): number {
  const i = Math.min(stops.length - 1, Math.max(0, nearestStopIndex(stops, value) + delta))
  return stops[i] ?? value
}

const clamp = (v: number, r: Range): number => Math.min(r.max, Math.max(r.min, v))

/** Exposure compensation snapped to 1/3 EV inside the phone's range. */
export function snapEv(value: number, range: Range): number {
  const snapped = Math.round(value * 3) / 3
  return Number(clamp(snapped, range).toFixed(2))
}

/** Every 1/3 EV inside the range, ascending, always including 0 when it is in range. */
export function evStops(range: Range): number[] {
  const out: number[] = []
  for (let k = Math.ceil(range.min * 3 - 1e-9); k <= Math.floor(range.max * 3 + 1e-9); k++) out.push(Number((k / 3).toFixed(2)))
  return out
}

/** Zoom rounded to the control's step (default 0.1) inside the range. */
export function snapZoom(value: number, range: Range & { step?: number }): number {
  const step = range.step && range.step > 0 ? range.step : 0.1
  const snapped = Math.round(value / step) * step
  return Number(clamp(snapped, range).toFixed(2))
}

/** Preset zoom buttons the phone can reach. */
export function zoomPresets(range?: Range): number[] {
  return range ? ZOOM_PRESETS.filter((z) => z >= range.min && z <= range.max) : []
}
