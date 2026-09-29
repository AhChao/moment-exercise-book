import { describe, expect, it } from 'vitest'
import { photoFileName } from './download'

describe('photoFileName', () => {
  it('formats the local capture time', () => {
    const t = new Date(2026, 8, 5, 7, 3, 9).getTime()
    expect(photoFileName(t)).toBe('moment-20260905-070309.jpg')
  })
})
