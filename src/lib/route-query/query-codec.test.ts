import { describe, expect, it } from 'vitest'
import { parseQueryValue, serializeQueryValue } from './query-codec'

describe('parseQueryValue', () => {
  it('returns the default when absent', () => {
    expect(parseQueryValue(undefined, 1, { type: 'number' })).toBe(1)
  })
  it('parses numbers and falls back on NaN', () => {
    expect(parseQueryValue('3', 1, { type: 'number' })).toBe(3)
    expect(parseQueryValue('x', 1, { type: 'number' })).toBe(1)
  })
  it('trims arrays and drops empties', () => {
    expect(parseQueryValue('a, b ,', [] as string[], { type: 'array' })).toEqual(['a', 'b'])
  })
  it('parses booleans', () => {
    expect(parseQueryValue('true', false, { type: 'boolean' })).toBe(true)
    expect(parseQueryValue('1', false, { type: 'boolean' })).toBe(true)
    expect(parseQueryValue('no', false, { type: 'boolean' })).toBe(false)
  })
  it('does not share the default array instance', () => {
    const def: string[] = []
    expect(parseQueryValue(undefined, def, { type: 'array' })).not.toBe(def)
  })
  it('reads the first entry of a repeated scalar param', () => {
    expect(parseQueryValue(['a', 'b'], '')).toBe('a')
  })
})

describe('serializeQueryValue', () => {
  it('omits empty strings', () => {
    expect(serializeQueryValue('', '', {})).toBeUndefined()
  })
  it('omits the default unless told otherwise', () => {
    expect(serializeQueryValue(1, 1, { type: 'number' })).toBeUndefined()
    expect(serializeQueryValue(1, 1, { type: 'number', omitDefault: false })).toBe('1')
  })
  it('keeps explicit values and arrays', () => {
    expect(serializeQueryValue('alice', '', {})).toBe('alice')
    expect(serializeQueryValue(['a', 'b'], [], { type: 'array' })).toBe('a,b')
    expect(serializeQueryValue([], [], { type: 'array' })).toBeUndefined()
  })
})

describe('reload round trip', () => {
  const round = <T extends string | number | string[]>(v: T, def: T, o: Parameters<typeof parseQueryValue>[2]) =>
    parseQueryValue(serializeQueryValue(v, def, o), def, o)
  it('returns what was written', () => {
    expect(round(3, 1, { type: 'number', omitDefault: false })).toBe(3)
    expect(round(['x', 'y'], [] as string[], { type: 'array' })).toEqual(['x', 'y'])
    expect(round('alice', '', {})).toBe('alice')
  })
})
