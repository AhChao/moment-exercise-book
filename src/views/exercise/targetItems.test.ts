import { describe, expect, it } from 'vitest'
import type { CaptureSpec } from '@/types'
import { formatEv, formatFocus, formatKelvin, formatZoom, targetItems } from './targetItems'

const none: CaptureSpec = { shutterSec: null, iso: null, ev: null, wbKelvin: null, zoom: null, focusMeters: null }

describe('targetItems', () => {
  it('lists only prescribed values by default', () => {
    const items = targetItems({ ...none, shutterSec: 0.008, iso: 100, zoom: 1 })
    expect(items.map((i) => i.text)).toEqual(['快門 1/125', 'ISO 100', '倍率 1×'])
    expect(items.every((i) => !i.auto)).toBe(true)
  })

  it('returns nothing for a fully free shot', () => {
    expect(targetItems(none)).toEqual([])
  })

  it('adds automatic entries when asked, skipping compensation while exposure is set', () => {
    const items = targetItems({ ...none, iso: 200 }, true)
    expect(items.find((i) => i.key === 'iso')?.text).toBe('ISO 200')
    expect(items.find((i) => i.key === 'shutter')?.auto).toBe(true)
    expect(items.some((i) => i.key === 'ev')).toBe(false)
  })

  it('shows compensation when neither shutter nor ISO is set', () => {
    expect(targetItems({ ...none, ev: -1 }).map((i) => i.text)).toEqual(['曝光補償 -1 EV'])
  })

  it('formats numbers', () => {
    expect(formatEv(1)).toBe('+1 EV')
    expect(formatEv(0)).toBe('0 EV')
    expect(formatKelvin(4500)).toBe('4500K')
    expect(formatZoom(5)).toBe('5×')
    expect(formatZoom(0.5)).toBe('0.5×')
    expect(formatFocus(0.3)).toBe('0.3 m')
    expect(formatFocus(2)).toBe('2 m')
  })
})
