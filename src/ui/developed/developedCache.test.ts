import { describe, expect, it } from 'vitest'
import { NO_DEVELOP } from '@/types'
import { DevelopedCache, developedKey } from './developedCache'

describe('developedKey', () => {
  it('changes with the develop values and the kind', () => {
    const a = developedKey('p1', NO_DEVELOP, 'thumb')
    expect(developedKey('p1', { ...NO_DEVELOP, exposure: 10 }, 'thumb')).not.toBe(a)
    expect(developedKey('p1', NO_DEVELOP, 'full')).not.toBe(a)
    expect(developedKey('p2', NO_DEVELOP, 'thumb')).not.toBe(a)
    expect(developedKey('p1', { ...NO_DEVELOP }, 'thumb')).toBe(a)
  })
})

describe('DevelopedCache', () => {
  it('evicts the oldest unheld entries beyond the bound and reports them', () => {
    const evicted: string[] = []
    const c = new DevelopedCache<string>(2, (v) => evicted.push(v))
    c.put('a', 'A')
    c.put('b', 'B')
    c.put('c', 'C')
    expect(evicted).toEqual(['A'])
    expect(c.has('a')).toBe(false)
    expect(c.size).toBe(2)
  })
  it('never evicts an entry that is still shown', () => {
    const evicted: string[] = []
    const c = new DevelopedCache<string>(1, (v) => evicted.push(v))
    c.put('a', 'A')
    expect(c.acquire('a')).toBe('A')
    c.put('b', 'B')
    expect(evicted).toEqual(['B']) // the unheld newcomer goes, the shown one stays
    expect(c.has('a')).toBe(true)
    c.put('c', 'C', true)
    expect(c.size).toBe(2) // both held: bound is soft
    c.release('a')
    expect(evicted).toEqual(['B', 'A'])
    expect(c.has('a')).toBe(false)
  })
  it('acquire refreshes recency', () => {
    const evicted: string[] = []
    const c = new DevelopedCache<string>(2, (v) => evicted.push(v))
    c.put('a', 'A')
    c.put('b', 'B')
    c.acquire('a')
    c.release('a')
    c.put('c', 'C')
    expect(evicted).toEqual(['B'])
  })
  it('revokes the replaced value when a key is re-put with a new one', () => {
    const evicted: string[] = []
    const c = new DevelopedCache<string>(5, (v) => evicted.push(v))
    c.put('a', 'A1')
    c.put('a', 'A2')
    expect(evicted).toEqual(['A1'])
  })
})
