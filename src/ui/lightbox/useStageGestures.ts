// Pointer gestures on the lightbox stage: drag-pan, two-finger pinch, double-tap, wheel, swipe.
// Swiping only reports a direction when the view is fit; a zoomed drag always pans.
import { onBeforeUnmount, onMounted } from 'vue'
import type { LightboxView } from './useLightboxView'
import {
  panBy, pinchStep, shouldSwitchOnSwipe, swipeDirection, toStagePoint, toggleZoomAt, wheelFactor, zoomAt,
  type PinchStart, type Point, type ViewTransform,
} from './viewTransform'

const TAP_MOVE = 10
const TAP_TIME = 300
const DOUBLE_TAP_TIME = 350
const DOUBLE_TAP_DIST = 40

export function useStageGestures(view: LightboxView, onSwipe: (dir: 1 | -1) => void) {
  const pointers = new Map<number, Point>()
  let pinch: PinchStart | null = null
  let multi = false // a second finger touched during this gesture: no tap, no swipe
  let base: { p: Point; t: ViewTransform } | null = null
  let start: { p: Point; time: number } | null = null
  let vx = 0
  let last: { x: number; time: number } | null = null
  let lastTap: { p: Point; time: number } | null = null

  const pointOf = (e: { clientX: number; clientY: number }): Point => {
    const el = view.stageEl.value
    return el ? toStagePoint(e.clientX, e.clientY, el.getBoundingClientRect()) : { x: 0, y: 0 }
  }
  const firstTwo = (): [Point, Point] => {
    const [a, b] = [...pointers.values()]
    return [a as Point, b as Point]
  }

  function onPointerDown(e: PointerEvent): void {
    view.stageEl.value?.setPointerCapture(e.pointerId)
    const p = pointOf(e)
    pointers.set(e.pointerId, p)
    if (pointers.size === 1) {
      multi = false
      start = { p, time: e.timeStamp }
      base = { p, t: view.shown.value }
      last = { x: p.x, time: e.timeStamp }
      vx = 0
    } else if (pointers.size === 2) {
      multi = true
      const [a, b] = firstTwo()
      pinch = { a, b, transform: view.shown.value }
    }
  }

  function onPointerMove(e: PointerEvent): void {
    if (!pointers.has(e.pointerId)) return
    const p = pointOf(e)
    pointers.set(e.pointerId, p)
    if (pinch && pointers.size >= 2) {
      const [a, b] = firstTwo()
      view.set(pinchStep(pinch, a, b, view.bounds.value))
      return
    }
    if (pointers.size !== 1 || !base) return
    if (last && e.timeStamp > last.time) vx = (p.x - last.x) / (e.timeStamp - last.time)
    last = { x: p.x, time: e.timeStamp }
    view.set(panBy(base.t, p.x - base.p.x, p.y - base.p.y, view.bounds.value))
  }

  function finish(e: PointerEvent, cancelled: boolean): void {
    if (!pointers.has(e.pointerId)) return
    const p = pointOf(e)
    pointers.delete(e.pointerId)
    view.stageEl.value?.releasePointerCapture?.(e.pointerId)
    if (pointers.size > 0) {
      // Pinch ended with one finger left: continue panning from where it is, never as a tap or swipe.
      pinch = null
      const rest = [...pointers.values()][0] as Point
      base = { p: rest, t: view.shown.value }
      return
    }
    pinch = null
    const s = start
    start = null
    if (cancelled || multi || !s) {
      multi = false
      return
    }
    const dx = p.x - s.p.x
    const dy = p.y - s.p.y
    const elapsed = e.timeStamp - s.time
    if (Math.hypot(dx, dy) < TAP_MOVE && elapsed < TAP_TIME) {
      if (lastTap && e.timeStamp - lastTap.time < DOUBLE_TAP_TIME && Math.hypot(p.x - lastTap.p.x, p.y - lastTap.p.y) < DOUBLE_TAP_DIST) {
        view.set(toggleZoomAt(view.shown.value, p, view.bounds.value))
        lastTap = null
      } else {
        lastTap = { p, time: e.timeStamp }
      }
      return
    }
    if (shouldSwitchOnSwipe(view.shown.value.scale, dx, dy, vx)) onSwipe(swipeDirection(dx))
  }

  function onWheel(e: WheelEvent): void {
    e.preventDefault()
    view.set(zoomAt(view.shown.value, pointOf(e), wheelFactor(e.deltaY, e.ctrlKey, e.deltaMode), view.bounds.value))
  }

  onMounted(() => view.stageEl.value?.addEventListener('wheel', onWheel, { passive: false }))
  onBeforeUnmount(() => view.stageEl.value?.removeEventListener('wheel', onWheel))

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: (e: PointerEvent) => finish(e, false),
    onPointerCancel: (e: PointerEvent) => finish(e, true),
  }
}
