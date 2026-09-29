import { describe, expect, it } from 'vitest'
import { formatShutter } from '@/judge/format'
import {
  ISO_STOPS, SHUTTER_STOPS, evStops, nearestStopIndex, snapEv, snapToStop, snapZoom, stepStop, stopsWithin, zoomPresets,
} from './stops'

describe('stop lists', () => {
  it('shutter stops run 1/4000 s to 1 s ascending', () => {
    expect(SHUTTER_STOPS[0]).toBeCloseTo(1 / 4000, 8)
    expect(SHUTTER_STOPS[SHUTTER_STOPS.length - 1]).toBe(1)
    for (let i = 1; i < SHUTTER_STOPS.length; i++) expect(SHUTTER_STOPS[i]!).toBeGreaterThan(SHUTTER_STOPS[i - 1]!)
  })

  it('neighbouring shutter stops are a fraction of a stop apart (0.15 - 0.6 stops)', () => {
    for (let i = 1; i < SHUTTER_STOPS.length; i++) {
      const gap = Math.log2(SHUTTER_STOPS[i]! / SHUTTER_STOPS[i - 1]!)
      expect(gap).toBeGreaterThan(0.15)
      expect(gap).toBeLessThan(0.6)
    }
  })

  it('the stops display as conventional values', () => {
    expect(SHUTTER_STOPS.map(formatShutter)).toEqual(expect.arrayContaining(['1/4000', '1/125', '1/30', '1/4', '0.5 s', '1 s']))
  })

  it('ISO stops run 50 to 6400 in 1/3 stops', () => {
    expect(ISO_STOPS[0]).toBe(50)
    expect(ISO_STOPS[ISO_STOPS.length - 1]).toBe(6400)
    expect(ISO_STOPS).toContain(100)
    expect(ISO_STOPS).toContain(1600)
    for (let i = 1; i < ISO_STOPS.length; i++) {
      const gap = Math.log2(ISO_STOPS[i]! / ISO_STOPS[i - 1]!)
      expect(gap).toBeGreaterThan(0.28)
      expect(gap).toBeLessThan(0.4)
    }
  })
})

describe('snapping', () => {
  it('snaps to the nearest stop on a log scale', () => {
    expect(snapToStop(ISO_STOPS, 110)).toBe(100)
    expect(snapToStop(ISO_STOPS, 1500)).toBe(1600)
    expect(snapToStop(ISO_STOPS, 5)).toBe(50)
    expect(snapToStop(ISO_STOPS, 99999)).toBe(6400)
    expect(snapToStop(SHUTTER_STOPS, 0.008)).toBeCloseTo(1 / 125, 8)
  })

  it('steps along the list and stops at the ends', () => {
    expect(stepStop(ISO_STOPS, 100, 1)).toBe(125)
    expect(stepStop(ISO_STOPS, 100, -1)).toBe(80)
    expect(stepStop(ISO_STOPS, 50, -3)).toBe(50)
    expect(stepStop(ISO_STOPS, 6400, 5)).toBe(6400)
    expect(nearestStopIndex([], 1)).toBe(0)
  })

  it('limits the list to the phone range', () => {
    expect(stopsWithin(ISO_STOPS, { min: 100, max: 800 })).toEqual([100, 125, 160, 200, 250, 320, 400, 500, 640, 800])
    expect(stopsWithin(ISO_STOPS)).toHaveLength(ISO_STOPS.length)
    expect(stopsWithin(ISO_STOPS, { min: 1e6, max: 2e6 })).toHaveLength(ISO_STOPS.length)
  })

  it('snaps exposure compensation to thirds inside the range', () => {
    expect(snapEv(0.4, { min: -4, max: 4 })).toBe(0.33)
    expect(snapEv(-1.1, { min: -4, max: 4 })).toBe(-1)
    expect(snapEv(9, { min: -4, max: 4 })).toBe(4)
  })

  it('lists 1/3 EV stops across the range', () => {
    const stops = evStops({ min: -1, max: 1 })
    expect(stops).toHaveLength(7)
    expect(stops[0]).toBe(-1)
    expect(stops).toContain(0)
    expect(stops[stops.length - 1]).toBe(1)
    expect(evStops({ min: -4, max: 4 })).toHaveLength(25)
  })

  it('rounds zoom to the step and clamps', () => {
    expect(snapZoom(2.04, { min: 1, max: 20, step: 0.1 })).toBe(2)
    expect(snapZoom(0.2, { min: 1, max: 20, step: 0.1 })).toBe(1)
    expect(snapZoom(30, { min: 1, max: 20 })).toBe(20)
  })

  it('offers only reachable zoom presets', () => {
    expect(zoomPresets({ min: 1, max: 20 })).toEqual([1, 2, 5])
    expect(zoomPresets({ min: 1, max: 3 })).toEqual([1, 2])
    expect(zoomPresets()).toEqual([])
  })
})
