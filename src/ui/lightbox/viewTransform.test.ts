import { describe, expect, it } from 'vitest'
import {
  IDENTITY, MAX_SCALE, clampPan, fitSize, isFit, keepOnSwitch, panBy, pinchStep, shouldSwitchOnSwipe,
  swipeDirection, toggleZoomAt, toStagePoint, wheelFactor, zoomAt, type Bounds, type ViewTransform,
} from './viewTransform'

const stage = { w: 400, h: 600 }
const bounds: Bounds = { stage, fit: fitSize({ w: 4000, h: 3000 }, stage) } // landscape: 400 x 300

const screenOf = (t: ViewTransform, c: { x: number; y: number }) => ({ x: c.x * t.scale + t.x, y: c.y * t.scale + t.y })
const contentAt = (t: ViewTransform, p: { x: number; y: number }) => ({ x: (p.x - t.x) / t.scale, y: (p.y - t.y) / t.scale })

describe('fitSize', () => {
  it('contains a landscape image by width and a portrait one by height', () => {
    expect(fitSize({ w: 4000, h: 3000 }, stage)).toEqual({ w: 400, h: 300 })
    expect(fitSize({ w: 300, h: 900 }, stage)).toEqual({ w: 200, h: 600 })
  })
  it('falls back to the stage for an unknown natural size', () => {
    expect(fitSize({ w: 0, h: 0 }, stage)).toEqual(stage)
  })
})

describe('clampPan', () => {
  it('forces zero pan at fit', () => {
    expect(clampPan({ scale: 1, x: 50, y: -40 }, bounds)).toEqual({ scale: 1, x: 0, y: 0 })
  })
  it('keeps image edges outside the stage edges when zoomed', () => {
    // scale 2: width 800 -> may shift 200; height 600 equals stage -> 0
    expect(clampPan({ scale: 2, x: 999, y: 999 }, bounds)).toEqual({ scale: 2, x: 200, y: 0 })
    expect(clampPan({ scale: 2, x: -999, y: -5 }, bounds)).toEqual({ scale: 2, x: -200, y: 0 })
    expect(clampPan({ scale: 4, x: 0, y: 999 }, bounds).y).toBe(300)
  })
  it('returns the same object when already inside', () => {
    const t = { scale: 2, x: 10, y: 0 }
    expect(clampPan(t, bounds)).toBe(t)
  })
  it('stays clamped through panBy, zoomAt and pinchStep', () => {
    const inside = (t: ViewTransform) => {
      const m = { x: Math.max(0, (bounds.fit.w * t.scale - stage.w) / 2), y: Math.max(0, (bounds.fit.h * t.scale - stage.h) / 2) }
      return Math.abs(t.x) <= m.x + 1e-9 && Math.abs(t.y) <= m.y + 1e-9
    }
    let t = zoomAt(IDENTITY, { x: 190, y: 290 }, 3, bounds)
    expect(inside(t)).toBe(true)
    t = panBy(t, 5000, -5000, bounds)
    expect(inside(t)).toBe(true)
    t = pinchStep({ a: { x: -50, y: 0 }, b: { x: 50, y: 0 }, transform: t }, { x: 100, y: 200 }, { x: 300, y: 260 }, bounds)
    expect(inside(t)).toBe(true)
  })
})

describe('zoomAt', () => {
  it('keeps the anchor point stationary', () => {
    const anchor = { x: 80, y: -35 }
    const t0: ViewTransform = { scale: 1.5, x: 20, y: -10 }
    const c = contentAt(t0, anchor)
    const t1 = zoomAt(t0, anchor, 2.2)
    const s = screenOf(t1, c)
    expect(s.x).toBeCloseTo(anchor.x, 9)
    expect(s.y).toBeCloseTo(anchor.y, 9)
    expect(t1.scale).toBeCloseTo(3.3, 9)
  })
  it('caps the scale at the maximum and floors it at fit', () => {
    expect(zoomAt({ scale: 6, x: 0, y: 0 }, { x: 0, y: 0 }, 10).scale).toBe(MAX_SCALE)
    expect(zoomAt({ scale: 2, x: 0, y: 0 }, { x: 0, y: 0 }, 0.1).scale).toBe(1)
  })
  it('returns the same object when the scale cannot change', () => {
    const t = { scale: MAX_SCALE, x: 3, y: 4 }
    expect(zoomAt(t, { x: 1, y: 1 }, 2)).toBe(t)
  })
})

describe('pinchStep', () => {
  it('scales by the finger distance ratio and keeps the midpoint content under the midpoint', () => {
    const t0: ViewTransform = { scale: 2, x: 30, y: -20 }
    const a = { x: -40, y: 10 }
    const b = { x: 60, y: 10 }
    const c = contentAt(t0, { x: 10, y: 10 })
    const a1 = { x: -80, y: 30 }
    const b1 = { x: 120, y: 30 }
    const t1 = pinchStep({ a, b, transform: t0 }, a1, b1)
    expect(t1.scale).toBeCloseTo(4, 9)
    const s = screenOf(t1, c)
    expect(s.x).toBeCloseTo(20, 9)
    expect(s.y).toBeCloseTo(30, 9)
  })
})

describe('toggleZoomAt', () => {
  it('zooms to 2.5x under the tap from fit and returns to fit from any zoom', () => {
    const p = { x: 60, y: 40 }
    const z = toggleZoomAt(IDENTITY, p)
    expect(z.scale).toBe(2.5)
    const s = screenOf(z, contentAt(IDENTITY, p))
    expect(s).toEqual({ x: 60, y: 40 })
    expect(toggleZoomAt(z, p)).toBe(IDENTITY)
    expect(isFit(toggleZoomAt({ scale: 1.2, x: 0, y: 0 }, p))).toBe(true)
  })
})

describe('shouldSwitchOnSwipe', () => {
  it('switches at fit on a long or fast horizontal drag', () => {
    expect(shouldSwitchOnSwipe(1, -90, 10, 0.1)).toBe(true)
    expect(shouldSwitchOnSwipe(1, 30, 2, 0.8)).toBe(true)
  })
  it('never switches while zoomed', () => {
    expect(shouldSwitchOnSwipe(1.01, -300, 0, 2)).toBe(false)
    expect(shouldSwitchOnSwipe(2.5, 300, 0, 2)).toBe(false)
  })
  it('ignores short, slow or vertical drags', () => {
    expect(shouldSwitchOnSwipe(1, -20, 0, 0.1)).toBe(false)
    expect(shouldSwitchOnSwipe(1, 30, 2, 0.1)).toBe(false)
    expect(shouldSwitchOnSwipe(1, -100, 90, 1)).toBe(false)
  })
  it('maps drag direction to next and previous', () => {
    expect(swipeDirection(-50)).toBe(1)
    expect(swipeDirection(50)).toBe(-1)
  })
})

describe('switching photos', () => {
  it('does not alter the transform object', () => {
    const t = Object.freeze({ scale: 3, x: 42, y: -17 })
    const before = { ...t }
    expect(keepOnSwitch(t)).toBe(t)
    expect(t).toEqual(before)
  })
})

describe('helpers', () => {
  it('wheel factor grows when scrolling up and is stronger with ctrl', () => {
    expect(wheelFactor(-100, false)).toBeGreaterThan(1)
    expect(wheelFactor(100, false)).toBeLessThan(1)
    expect(wheelFactor(-10, true)).toBeGreaterThan(wheelFactor(-10, false))
  })
  it('converts client points to stage-centred points', () => {
    expect(toStagePoint(150, 250, { left: 100, top: 100, width: 100, height: 100 })).toEqual({ x: 0, y: 100 })
  })
})
