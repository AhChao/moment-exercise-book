import { describe, expect, it } from 'vitest'
import { normalizeCapabilities } from '@/camera/capabilities'
import { PIXEL10_RAW } from '@/camera/pixel10.fixture'
import { UNAVAILABLE } from '@/camera/capabilities'
import { EMPTY_SPEC } from './buildSpec'
import { needsMetering } from './metering'

const caps = normalizeCapabilities(PIXEL10_RAW)

describe('needsMetering', () => {
  it('is true only for a fixed shutter with open ISO on a phone with manual exposure', () => {
    expect(needsMetering({ ...EMPTY_SPEC, shutterSec: 1 / 30 }, caps)).toBe(true)
    expect(needsMetering({ ...EMPTY_SPEC, shutterSec: 1 / 30, iso: 100 }, caps)).toBe(false)
    expect(needsMetering({ ...EMPTY_SPEC, iso: 100 }, caps)).toBe(false)
    expect(needsMetering(EMPTY_SPEC, caps)).toBe(false)
    expect(needsMetering({ ...EMPTY_SPEC, shutterSec: 1 / 30 }, UNAVAILABLE)).toBe(false)
  })
})
