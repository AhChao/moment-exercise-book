import { describe, expect, it } from 'vitest'
import { formatBytes } from './format'

describe('formatBytes', () => {
  it('handles zero and invalid input', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(-5)).toBe('0 B')
    expect(formatBytes(Number.NaN)).toBe('0 B')
  })

  it('keeps plain bytes under 1 KB', () => {
    expect(formatBytes(1)).toBe('1 B')
    expect(formatBytes(1023)).toBe('1023 B')
  })

  it('uses one decimal below 10 and none above', () => {
    expect(formatBytes(1024)).toBe('1 KB')
    expect(formatBytes(1536)).toBe('1.5 KB')
    expect(formatBytes(10 * 1024)).toBe('10 KB')
    expect(formatBytes(12.4 * 1024 * 1024)).toBe('12 MB')
    expect(formatBytes(3 * 1024 ** 3)).toBe('3 GB')
  })

  it('never prints 1024 of the smaller unit', () => {
    expect(formatBytes(1024 * 1024 - 1)).toBe('1 MB')
  })

  it('caps at TB', () => {
    expect(formatBytes(2048 * 1024 ** 4)).toBe('2048 TB')
  })
})
