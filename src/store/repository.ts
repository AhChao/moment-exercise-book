// Non-reactive persistence on top of Db. Pure with respect to the injected Db.
import type { Attempt, PhotoMeta } from '@/types'
import type { Db } from './db'

export interface PhotoBlobs {
  original: Blob
  thumb: Blob
}

export interface Repository {
  listPhotos(): Promise<PhotoMeta[]>
  listAttempts(): Promise<Attempt[]>
  /** Meta and blobs in one transaction. */
  putPhoto(meta: PhotoMeta, blobs: PhotoBlobs): Promise<void>
  putPhotoMeta(meta: PhotoMeta): Promise<void>
  getBlobs(id: string): Promise<PhotoBlobs | undefined>
  deletePhoto(id: string): Promise<void>
  putAttempt(attempt: Attempt): Promise<void>
  putAttempts(attempts: Attempt[]): Promise<void>
  /** Photos and attempts; the kv settings store is kept. */
  clearAll(): Promise<void>
}

export function createRepository(db: Db): Repository {
  return {
    listPhotos: () => db.getAll<PhotoMeta>('photoMeta'),
    listAttempts: () => db.getAll<Attempt>('attempts'),
    putPhoto: (meta, blobs) =>
      db.batch([
        { type: 'put', store: 'photoBlob', value: { id: meta.id, original: blobs.original, thumb: blobs.thumb } },
        { type: 'put', store: 'photoMeta', value: meta },
      ]),
    putPhotoMeta: (meta) => db.put('photoMeta', meta),
    async getBlobs(id) {
      const row = await db.get<PhotoBlobs & { id: string }>('photoBlob', id)
      return row ? { original: row.original, thumb: row.thumb } : undefined
    },
    deletePhoto: (id) =>
      db.batch([
        { type: 'delete', store: 'photoMeta', key: id },
        { type: 'delete', store: 'photoBlob', key: id },
      ]),
    putAttempt: (attempt) => db.put('attempts', attempt),
    putAttempts: (attempts) => db.batch(attempts.map((value) => ({ type: 'put' as const, store: 'attempts' as const, value }))),
    clearAll: () =>
      db.batch([
        { type: 'clear', store: 'photoMeta' },
        { type: 'clear', store: 'photoBlob' },
        { type: 'clear', store: 'attempts' },
      ]),
  }
}
