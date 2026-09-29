import { describe, expect, it } from 'vitest'
import { canShootInApp } from './support'

describe('canShootInApp', () => {
  it('needs both a camera stream and still capture', () => {
    expect(canShootInApp({ hasImageCapture: true, hasGetUserMedia: true })).toBe(true)
    expect(canShootInApp({ hasImageCapture: false, hasGetUserMedia: true })).toBe(false)
    expect(canShootInApp({ hasImageCapture: true, hasGetUserMedia: false })).toBe(false)
  })
})
