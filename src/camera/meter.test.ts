import { describe, expect, it } from 'vitest'
import { solveIso } from './meter'

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
