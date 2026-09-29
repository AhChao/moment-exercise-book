import { describe, expect, it } from 'vitest'
import { ASSUMED_CAPS, CAPS_KEY, readCachedCaps, writeCachedCaps } from './capsCache'

function fakeStore(initial: Record<string, string> = {}) {
  const data = { ...initial }
  return {
    getItem: (k: string) => data[k] ?? null,
    setItem: (k: string, v: string) => {
      data[k] = v
    },
    data,
  }
}

describe('capsCache', () => {
  it('falls back to the assumed capabilities when nothing is cached', () => {
    expect(readCachedCaps(fakeStore())).toBe(ASSUMED_CAPS)
    expect(readCachedCaps(null)).toBe(ASSUMED_CAPS)
  })

  it('round-trips capabilities', () => {
    const s = fakeStore()
    const caps = { ...ASSUMED_CAPS, canManualWB: false }
    writeCachedCaps(caps, s)
    expect(readCachedCaps(s)).toEqual(caps)
  })

  it('ignores corrupt values', () => {
    expect(readCachedCaps(fakeStore({ [CAPS_KEY]: '{oops' }))).toBe(ASSUMED_CAPS)
    expect(readCachedCaps(fakeStore({ [CAPS_KEY]: '{"a":1}' }))).toBe(ASSUMED_CAPS)
  })
})
