import { describe, expect, it } from 'vitest'
import { createRepository } from './repository'
import { attempt, blobText, ID_A, ID_B, photoMeta } from './testing/fixtures'
import { createMemoryDb } from './testing/memoryDb'

const blobs = (o: string, t: string) => ({ original: new Blob([o]), thumb: new Blob([t]) })

describe('repository', () => {
  it('stores meta and blobs together and reads them back', async () => {
    const repo = createRepository(createMemoryDb())
    await repo.putPhoto(photoMeta(ID_A), blobs('orig', 'thumb'))
    expect(await repo.listPhotos()).toEqual([photoMeta(ID_A)])
    const got = await repo.getBlobs(ID_A)
    expect(await blobText(got!.original)).toBe('orig')
    expect(await blobText(got!.thumb)).toBe('thumb')
    expect(await repo.getBlobs(ID_B)).toBeUndefined()
  })

  it('updates meta without touching blobs', async () => {
    const repo = createRepository(createMemoryDb())
    await repo.putPhoto(photoMeta(ID_A), blobs('orig', 'thumb'))
    await repo.putPhotoMeta(photoMeta(ID_A, { width: 99 }))
    expect((await repo.listPhotos())[0].width).toBe(99)
    expect(await blobText((await repo.getBlobs(ID_A))!.original)).toBe('orig')
  })

  it('deletes meta and blobs', async () => {
    const repo = createRepository(createMemoryDb())
    await repo.putPhoto(photoMeta(ID_A), blobs('o', 't'))
    await repo.putPhoto(photoMeta(ID_B), blobs('o', 't'))
    await repo.deletePhoto(ID_A)
    expect((await repo.listPhotos()).map((p) => p.id)).toEqual([ID_B])
    expect(await repo.getBlobs(ID_A)).toBeUndefined()
  })

  it('puts attempts singly and in bulk, keyed by exercise id', async () => {
    const repo = createRepository(createMemoryDb())
    await repo.putAttempt(attempt('e1'))
    await repo.putAttempts([attempt('e1', { observeNotes: 'x' }), attempt('e2')])
    const all = await repo.listAttempts()
    expect(all.map((a) => a.exerciseId)).toEqual(['e1', 'e2'])
    expect(all[0].observeNotes).toBe('x')
  })

  it('clearAll empties photos and attempts but keeps kv', async () => {
    const db = createMemoryDb()
    const repo = createRepository(db)
    await db.put('kv', { v: 1 }, 'setting')
    await repo.putPhoto(photoMeta(ID_A), blobs('o', 't'))
    await repo.putAttempt(attempt('e1'))
    await repo.clearAll()
    expect(await repo.listPhotos()).toEqual([])
    expect(await repo.listAttempts()).toEqual([])
    expect(await repo.getBlobs(ID_A)).toBeUndefined()
    expect(await db.get('kv', 'setting')).toEqual({ v: 1 })
  })
})
