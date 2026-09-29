import { NO_DEVELOP, type Attempt, type PhotoMeta } from '@/types'

export const ID_A = '11111111-1111-4111-8111-111111111111'
export const ID_B = '22222222-2222-4222-8222-222222222222'
export const ID_C = '33333333-3333-4333-8333-333333333333'

export function photoMeta(id: string, over: Partial<PhotoMeta> = {}): PhotoMeta {
  return {
    id, createdAt: 1000, source: 'import', width: 30, height: 40, bytes: 10,
    exif: { hasExif: true, hasGps: false }, applied: {}, lens: 'main', develop: { ...NO_DEVELOP }, ...over,
  }
}

export function attempt(exerciseId: string, over: Partial<Attempt> = {}): Attempt {
  return { exerciseId, slots: [null, null], observeNotes: '', reflectNotes: [], updatedAt: 1, completedAt: null, ...over }
}

export const blobText = (b: Blob) => b.text()
