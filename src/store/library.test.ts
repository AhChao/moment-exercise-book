import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createLibrary, type Library } from './library'
import { createRepository, type Repository } from './repository'
import { ID_A, attempt } from './testing/fixtures'
import { createMemoryDb } from './testing/memoryDb'
import type { NewPhoto } from './types'

let repo: Repository
let putAttempt: ReturnType<typeof vi.fn>
let clock = 1000
let counter = 0
let created: string[]
let revoked: string[]

function make(): Library {
  return createLibrary({
    repo,
    makeThumb: async () => new Blob(['thumb']),
    now: () => ++clock,
    newId: () => `00000000-0000-4000-8000-${String(++counter).padStart(12, '0')}`,
    createUrl: () => { const u = `blob:${created.length}`; created.push(u); return u },
    revokeUrl: (u) => { revoked.push(u) },
  })
}

const input = (): NewPhoto => ({
  blob: new Blob(['original-bytes']), source: 'import', exif: { hasExif: false, hasGps: false },
  applied: {}, lens: 'main', width: 30, height: 40,
})

beforeEach(() => {
  clock = 1000
  counter = 0
  created = []
  revoked = []
  const real = createRepository(createMemoryDb())
  putAttempt = vi.fn(real.putAttempt)
  repo = { ...real, putAttempt }
})
afterEach(() => vi.useRealTimers())

describe('photos', () => {
  it('lists newest first and stores original plus thumb', async () => {
    const lib = make()
    await lib.load()
    const a = await lib.addPhoto(input())
    const b = await lib.addPhoto(input())
    expect(lib.loaded.value).toBe(true)
    expect(lib.photos.value.map((p) => p.id)).toEqual([b.id, a.id])
    expect(a.bytes).toBe('original-bytes'.length)
    expect(await (await lib.getPhotoBlob(a.id)).text()).toBe('original-bytes')
    const fresh = make()
    await fresh.load()
    expect(fresh.photos.value.map((p) => p.id)).toEqual([b.id, a.id])
  })

  it('caches object urls per id and kind and revokes them on removal', async () => {
    const lib = make()
    await lib.load()
    const p = await lib.addPhoto(input())
    const [u1, u2] = await Promise.all([lib.photoUrl(p.id, 'full'), lib.photoUrl(p.id, 'full')])
    expect(u1).toBe(u2)
    const thumb = await lib.photoUrl(p.id, 'thumb')
    expect(thumb).not.toBe(u1)
    expect(created).toHaveLength(2)
    await lib.removePhoto(p.id)
    expect(revoked.sort()).toEqual([u1, thumb].sort())
    await expect(lib.photoUrl(p.id, 'full')).rejects.toThrow('photo-not-found')
  })

  it('persists a develop change', async () => {
    const lib = make()
    await lib.load()
    const p = await lib.addPhoto(input())
    await lib.setDevelop(p.id, { shadows: 10, highlights: 0, exposure: 0, warmth: -5 })
    const fresh = make()
    await fresh.load()
    expect(fresh.photos.value[0].develop).toEqual({ shadows: 10, highlights: 0, exposure: 0, warmth: -5 })
  })
})

describe('attempts', () => {
  it('creates the attempt lazily with slotCount slots', async () => {
    const lib = make()
    await lib.load()
    await lib.assignSlot('e1', 1, 3, ID_A)
    const a = lib.attempts.value.e1
    expect(a.slots).toEqual([null, ID_A, null])
    expect(a.observeNotes).toBe('')
    expect(a.completedAt).toBeNull()
    expect(a.updatedAt).toBeGreaterThan(1000)
    expect((await repo.listAttempts())[0].slots).toEqual([null, ID_A, null])
  })

  it('pads or trims slots when the slot count changed', async () => {
    const lib = make()
    await lib.load()
    await lib.assignSlot('e1', 0, 2, ID_A)
    await lib.assignSlot('e1', 3, 4, ID_A)
    expect(lib.attempts.value.e1.slots).toEqual([ID_A, null, null, ID_A])
    await lib.assignSlot('e1', 0, 1, null)
    expect(lib.attempts.value.e1.slots).toEqual([null])
  })

  it('removing a photo clears every slot that used it and persists the change', async () => {
    const lib = make()
    await lib.load()
    const p = await lib.addPhoto(input())
    await lib.assignSlot('e1', 0, 2, p.id)
    await lib.assignSlot('e2', 1, 2, p.id)
    await lib.assignSlot('e3', 0, 2, ID_A)
    const before = lib.attempts.value.e1.updatedAt
    await lib.removePhoto(p.id)
    expect(lib.attempts.value.e1.slots).toEqual([null, null])
    expect(lib.attempts.value.e2.slots).toEqual([null, null])
    expect(lib.attempts.value.e3.slots).toEqual([ID_A, null])
    expect(lib.attempts.value.e1.updatedAt).toBeGreaterThan(before)
    const stored = await repo.listAttempts()
    expect(stored.find((a) => a.exerciseId === 'e2')!.slots).toEqual([null, null])
    expect(lib.photos.value).toEqual([])
  })

  it('marks completion and lazily creates the attempt', async () => {
    const lib = make()
    await lib.load()
    await lib.markCompleted('e1', 2, 2, true)
    expect(lib.attempts.value.e1.completedAt).toBeGreaterThan(1000)
    expect(lib.attempts.value.e1.reflectNotes).toEqual(['', ''])
    await lib.markCompleted('e1', 2, 2, false)
    expect(lib.attempts.value.e1.completedAt).toBeNull()
    expect((await repo.listAttempts())[0].completedAt).toBeNull()
  })

  it('loads stored attempts', async () => {
    await repo.putAttempt(attempt('e9', { observeNotes: 'kept' }))
    const lib = make()
    await lib.load()
    expect(lib.attempts.value.e9.observeNotes).toBe('kept')
  })
})

describe('notes debounce', () => {
  it('updates memory at once and writes once after 400 ms of quiet', async () => {
    vi.useFakeTimers()
    const lib = make()
    await lib.load()
    await lib.saveNotes('e1', 2, 2, { observeNotes: 'a' })
    await lib.saveNotes('e1', 2, 2, { observeNotes: 'ab' })
    await lib.saveNotes('e1', 2, 2, { reflectNotes: ['x', 'y'] })
    expect(lib.attempts.value.e1.observeNotes).toBe('ab')
    expect(lib.attempts.value.e1.reflectNotes).toEqual(['x', 'y'])
    expect(putAttempt).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(399)
    expect(putAttempt).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    await lib.flush()
    expect(putAttempt).toHaveBeenCalledTimes(1)
    expect((await repo.listAttempts())[0]).toMatchObject({ observeNotes: 'ab', reflectNotes: ['x', 'y'] })
  })

  it('keeps separate timers per exercise', async () => {
    vi.useFakeTimers()
    const lib = make()
    await lib.load()
    await lib.saveNotes('e1', 1, 0, { observeNotes: '1' })
    await lib.saveNotes('e2', 1, 0, { observeNotes: '2' })
    await vi.advanceTimersByTimeAsync(400)
    await lib.flush()
    expect(putAttempt).toHaveBeenCalledTimes(2)
  })

  it('flush writes pending notes immediately', async () => {
    vi.useFakeTimers()
    const lib = make()
    await lib.load()
    await lib.saveNotes('e1', 1, 1, { observeNotes: 'draft' })
    await lib.flush()
    expect(putAttempt).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1000)
    expect(putAttempt).toHaveBeenCalledTimes(1)
    expect((await repo.listAttempts())[0].observeNotes).toBe('draft')
  })

  it('an immediate write carries pending notes and cancels the timer', async () => {
    vi.useFakeTimers()
    const lib = make()
    await lib.load()
    await lib.saveNotes('e1', 1, 1, { observeNotes: 'typed' })
    await lib.markCompleted('e1', 1, 1, true)
    expect(putAttempt).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1000)
    expect(putAttempt).toHaveBeenCalledTimes(1)
    expect((await repo.listAttempts())[0]).toMatchObject({ observeNotes: 'typed' })
  })
})

describe('storage', () => {
  it('falls back safely without a storage manager', async () => {
    const lib = make()
    expect(await lib.requestPersist()).toBe(false)
    expect(await lib.storageInfo()).toEqual({ usage: 0, quota: 0, persisted: false })
  })
})
