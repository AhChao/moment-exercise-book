import { describe, expect, it } from 'vitest'
import { solveIso, solveShutter } from './meter'

// Scene model: mean luma grows with log2(ISO), clipped to 0..255.
const scene = (isoAt115: number) => async (iso: number) =>
  Math.min(255, Math.max(0, 115 + 40 * Math.log2(iso / isoAt115)))

describe('solveIso', () => {
  it('finds the ISO for a scene that needs a high sensitivity', async () => {
    const r = await solveIso(scene(1600), { minIso: 30, maxIso: 7518 })
    expect(r.converged).toBe(true)
    expect(r.iso).toBeGreaterThan(1200)
    expect(r.iso).toBeLessThan(2100)
  })

  it('finds the ISO for a bright scene', async () => {
    const r = await solveIso(scene(60), { minIso: 30, maxIso: 7518 })
    expect(r.converged).toBe(true)
    expect(r.iso).toBeGreaterThan(45)
    expect(r.iso).toBeLessThan(85)
  })

  it('stops at the range limit when the scene is too dark for any ISO', async () => {
    const r = await solveIso(async () => 4, { minIso: 30, maxIso: 7518 })
    expect(r.converged).toBe(false)
    expect(r.iso).toBeGreaterThan(5000)
    expect(r.steps).toBeLessThanOrEqual(8)
  })

  it('stops at the low limit when the scene is too bright', async () => {
    const r = await solveIso(async () => 250, { minIso: 30, maxIso: 7518 })
    expect(r.converged).toBe(false)
    expect(r.iso).toBeLessThan(80)
  })

  it('never measures outside the range and never exceeds the step budget', async () => {
    const seen: number[] = []
    await solveIso(async (iso) => { seen.push(iso); return 10 }, { minIso: 100, maxIso: 800, maxSteps: 5 })
    expect(seen.length).toBeLessThanOrEqual(5)
    expect(seen.every((i) => i >= 100 && i <= 800)).toBe(true)
  })
})

// Scene model: mean luma grows with log2(shutter time).
const shutterScene = (secAt115: number) => async (sec: number) =>
  Math.min(255, Math.max(0, 115 + 40 * Math.log2(sec / secAt115)))
const RANGE = { minSec: 1 / 17000, maxSec: 16 }

describe('solveShutter', () => {
  it('finds a fast shutter for a bright scene', async () => {
    const r = await solveShutter(shutterScene(1 / 1000), RANGE)
    expect(r.converged).toBe(true)
    expect(r.shutterSec).toBeGreaterThan(1 / 1400)
    expect(r.shutterSec).toBeLessThan(1 / 700)
  })

  it('finds a slow shutter for a dim scene', async () => {
    const r = await solveShutter(shutterScene(0.5), RANGE)
    expect(r.converged).toBe(true)
    expect(r.shutterSec).toBeGreaterThan(0.35)
    expect(r.shutterSec).toBeLessThan(0.7)
  })

  it('stops at the slow limit when the scene is too dark', async () => {
    const r = await solveShutter(async () => 4, RANGE)
    expect(r.converged).toBe(false)
    expect(r.shutterSec).toBeGreaterThan(4)
  })

  it('stops at the fast limit when the scene is too bright', async () => {
    const r = await solveShutter(async () => 250, RANGE)
    expect(r.converged).toBe(false)
    expect(r.shutterSec).toBeLessThan(1 / 8000)
  })

  it('never measures outside the range', async () => {
    const seen: number[] = []
    await solveShutter(async (s) => { seen.push(s); return 10 }, { minSec: 0.01, maxSec: 0.1, maxSteps: 5 })
    expect(seen.length).toBeLessThanOrEqual(5)
    expect(seen.every((s) => s >= 0.01 - 1e-9 && s <= 0.1 + 1e-9)).toBe(true)
  })
})
