import { describe, expect, it } from 'vitest'
import { createScrollMemory } from './scroll-memory'

function setup() {
  const store: Record<string, string> = {}
  const state = { height: 200, y: 0, sy: 0, t: 0 }
  const queue: Array<() => void> = []
  const frame = () => queue.splice(0, queue.length).forEach((fn) => fn())
  const mem = createScrollMemory({
    scrollY: () => state.sy,
    scrollHeight: () => state.height,
    innerHeight: () => 100,
    scrollTo: (_x, ty) => {
      state.y = ty
      state.sy = ty
    },
    getItem: (k) => store[k] ?? null,
    setItem: (k, v) => {
      store[k] = v
    },
    raf: (fn) => queue.push(fn),
    now: () => state.t,
    settleMs: 1000,
  })
  return { mem, state, frame }
}

describe('scroll memory', () => {
  it('waits for the page to grow, then restores the saved offset', () => {
    const { mem, state, frame } = setup()
    state.sy = 150
    mem.save('/a')

    state.height = 120
    state.y = 0
    state.sy = 0
    mem.restore('/a')
    frame()
    expect(state.y).toBe(0)

    state.height = 400
    frame()
    expect(state.y).toBe(150)
  })

  it('a newer navigation cancels an in-flight restore', () => {
    const { mem, state, frame } = setup()
    state.sy = 150
    mem.save('/a')
    state.height = 120
    state.y = 0
    mem.restore('/a')
    mem.restore('/b')
    frame()
    expect(state.y).toBe(0)
  })

  it('gives up waiting after the settle window and scrolls as far as possible', () => {
    const { mem, state, frame } = setup()
    state.sy = 500
    mem.save('/a')
    state.height = 300 // max scroll 200
    state.y = 0
    mem.restore('/a')
    frame()
    expect(state.y).toBe(0)
    state.t = 1500
    frame()
    expect(state.y).toBe(200)
  })

  it('an unknown path restores to the top', () => {
    const { mem, state, frame } = setup()
    state.y = 40
    mem.restore('/never-saved')
    frame()
    expect(state.y).toBe(0)
  })
})
