// Pure math for the lightbox view. No DOM.
// Points are stage-centred: (0, 0) is the middle of the stage, x right, y down, in stage pixels.
// A transform maps content point c (stage-centred, before transform) to screen: c * scale + (x, y).

export interface Point { x: number; y: number }
export interface Size { w: number; h: number }
export interface ViewTransform { scale: number; x: number; y: number }
/** stage: the fixed box; fit: the image box inside it at scale 1 (object-fit: contain). */
export interface Bounds { stage: Size; fit: Size }

export const MIN_SCALE = 1
export const MAX_SCALE = 8
export const DOUBLE_TAP_SCALE = 2.5
export const IDENTITY: Readonly<ViewTransform> = Object.freeze({ scale: 1, x: 0, y: 0 })

const EPS = 1e-6
const SWIPE_DISTANCE = 64
const SWIPE_FLICK_DISTANCE = 24
const SWIPE_FLICK_VELOCITY = 0.5 // px per ms
const SWIPE_AXIS_RATIO = 1.5

export const isFit = (t: ViewTransform): boolean => t.scale <= MIN_SCALE + EPS

export const clampScale = (s: number): number => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s))

/** Contained size of an image with the given natural size inside the stage. */
export function fitSize(natural: Size, stage: Size): Size {
  if (natural.w <= 0 || natural.h <= 0 || stage.w <= 0 || stage.h <= 0) return { w: stage.w, h: stage.h }
  const k = Math.min(stage.w / natural.w, stage.h / natural.h)
  return { w: natural.w * k, h: natural.h * k }
}

/** How far the content may be shifted before an image edge would enter the stage. */
export function maxPan(bounds: Bounds, scale: number): Point {
  return {
    x: Math.max(0, (bounds.fit.w * scale - bounds.stage.w) / 2),
    y: Math.max(0, (bounds.fit.h * scale - bounds.stage.h) / 2),
  }
}

/** Keeps the image edges outside the stage edges. Returns the same object when nothing changes. */
export function clampPan(t: ViewTransform, bounds: Bounds): ViewTransform {
  const m = maxPan(bounds, t.scale)
  const x = Math.max(-m.x, Math.min(m.x, t.x)) + 0
  const y = Math.max(-m.y, Math.min(m.y, t.y)) + 0
  return x === t.x && y === t.y ? t : { scale: t.scale, x, y }
}

const finish = (t: ViewTransform, bounds?: Bounds): ViewTransform => (bounds ? clampPan(t, bounds) : t)

/** Changes scale by `factor` while the content under `point` stays under `point`. */
export function zoomAt(t: ViewTransform, point: Point, factor: number, bounds?: Bounds): ViewTransform {
  const scale = clampScale(t.scale * factor)
  if (scale === t.scale) return t
  const qx = (point.x - t.x) / t.scale
  const qy = (point.y - t.y) / t.scale
  return finish({ scale, x: point.x - qx * scale, y: point.y - qy * scale }, bounds)
}

export function panBy(t: ViewTransform, dx: number, dy: number, bounds?: Bounds): ViewTransform {
  return finish({ scale: t.scale, x: t.x + dx, y: t.y + dy }, bounds)
}

export interface PinchStart { a: Point; b: Point; transform: ViewTransform }

const dist = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y)
const mid = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })

/** Scale follows the finger distance; the content point under the start midpoint follows the midpoint. */
export function pinchStep(start: PinchStart, a: Point, b: Point, bounds?: Bounds): ViewTransform {
  const d0 = dist(start.a, start.b)
  if (d0 < EPS) return start.transform
  const t0 = start.transform
  const scale = clampScale((t0.scale * dist(a, b)) / d0)
  const m0 = mid(start.a, start.b)
  const m1 = mid(a, b)
  const qx = (m0.x - t0.x) / t0.scale
  const qy = (m0.y - t0.y) / t0.scale
  return finish({ scale, x: m1.x - qx * scale, y: m1.y - qy * scale }, bounds)
}

/** Fit -> DOUBLE_TAP_SCALE centred on the tap; any zoomed state -> fit. */
export function toggleZoomAt(t: ViewTransform, point: Point, bounds?: Bounds): ViewTransform {
  if (!isFit(t)) return IDENTITY
  return zoomAt(t, point, DOUBLE_TAP_SCALE, bounds)
}

/** Only a fitted view may switch photos by swiping; zoomed drags pan instead. */
export function shouldSwitchOnSwipe(scale: number, dx: number, dy: number, velocity: number): boolean {
  if (scale > MIN_SCALE + EPS) return false
  const ax = Math.abs(dx)
  if (ax < Math.abs(dy) * SWIPE_AXIS_RATIO) return false
  return ax >= SWIPE_DISTANCE || (ax >= SWIPE_FLICK_DISTANCE && Math.abs(velocity) >= SWIPE_FLICK_VELOCITY)
}

/** Dragging left (negative dx) shows the next photo. */
export const swipeDirection = (dx: number): 1 | -1 => (dx < 0 ? 1 : -1)

/** Multiplicative zoom factor for a wheel event; ctrl (trackpad pinch) is more sensitive. */
export function wheelFactor(deltaY: number, ctrl: boolean, deltaMode = 0): number {
  const px = deltaMode === 1 ? deltaY * 16 : deltaY
  return Math.exp(-px * (ctrl ? 0.01 : 0.0015))
}

/** Switching photos via buttons or keys leaves the shared transform untouched (same object). */
export const keepOnSwitch = (t: ViewTransform): ViewTransform => t

/** Client coordinates to stage-centred coordinates. */
export function toStagePoint(clientX: number, clientY: number, rect: { left: number; top: number; width: number; height: number }): Point {
  return { x: clientX - rect.left - rect.width / 2, y: clientY - rect.top - rect.height / 2 }
}
