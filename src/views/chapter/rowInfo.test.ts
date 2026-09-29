import { describe, expect, it } from 'vitest'
import type { Attempt } from '@/types'
import { assignedPhotos, visibleNeeds } from './rowInfo'

describe('visibleNeeds', () => {
  it('keeps only ultrawide, tele and night, in fixed order', () => {
    expect(visibleNeeds(['night', 'manualWB', 'tele', 'develop', 'ultrawide'])).toEqual(['ultrawide', 'tele', 'night'])
  })
  it('returns nothing for unrelated needs', () => {
    expect(visibleNeeds(['person', 'manualExposure'])).toEqual([])
  })
})

describe('assignedPhotos', () => {
  const attempt = (slots: (string | null)[]): Attempt => ({
    exerciseId: 'x',
    slots,
    observeNotes: '',
    reflectNotes: [],
    updatedAt: 0,
    completedAt: null,
  })
  it('drops empty frames but keeps the frame index', () => {
    expect(assignedPhotos(attempt([null, 'p2', null, 'p4']))).toEqual([
      { photoId: 'p2', slot: 1 },
      { photoId: 'p4', slot: 3 },
    ])
  })
  it('handles a missing attempt', () => {
    expect(assignedPhotos(undefined)).toEqual([])
  })
})
