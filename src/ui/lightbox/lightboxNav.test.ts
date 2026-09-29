import { describe, expect, it } from 'vitest'
import { keepIndex, startIndex, stepIndex } from './lightboxNav'

const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]

describe('lightboxNav', () => {
  it('finds the start item and falls back to the first', () => {
    expect(startIndex(items, 'b')).toBe(1)
    expect(startIndex(items, 'zzz')).toBe(0)
  })
  it('stops at both ends', () => {
    expect(stepIndex(0, -1, 3)).toBe(0)
    expect(stepIndex(2, 1, 3)).toBe(2)
    expect(stepIndex(1, 1, 3)).toBe(2)
    expect(stepIndex(0, 1, 0)).toBe(0)
  })
  it('follows the current id when the list changes, else clamps', () => {
    expect(keepIndex([{ id: 'c' }, { id: 'b' }], 'b', 1)).toBe(1)
    expect(keepIndex([{ id: 'x' }], 'b', 2)).toBe(0)
    expect(keepIndex([], undefined, 0)).toBe(0)
  })
})
