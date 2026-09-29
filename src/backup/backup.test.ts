import { strToU8, zipSync } from 'fflate'
import { describe, expect, it, vi } from 'vitest'
import { parseExifBytes } from '@/lib/exif'
import { createRepository, type Repository } from '@/store/repository'
import { ID_A, ID_B, ID_C, attempt, photoMeta } from '@/store/testing/fixtures'
import { buildJpeg } from '@/store/testing/jpeg'
import { createMemoryDb } from '@/store/testing/memoryDb'
import { exportBackup } from './exportBackup'
import { importBackup } from './importBackup'
import { buildManifest, photoPath } from './manifest'

const makeThumb = async () => new Blob(['thumb'])
const fresh = () => createRepository(createMemoryDb())

async function seed(repo: Repository, id: string, jpeg = buildJpeg({ gps: false }), createdAt = 1000) {
  await repo.putPhoto(photoMeta(id, { createdAt, bytes: jpeg.length }), {
    original: new Blob([jpeg as BlobPart]), thumb: new Blob(['t']),
  })
}

const asFile = (bytes: Uint8Array | Blob) => new File([bytes as BlobPart], 'backup.zip')

async function exportFile(repo: Repository) {
  return asFile(await exportBackup({}, repo))
}

describe('round trip', () => {
  it('exports and imports into a fresh database, reporting progress', async () => {
    const src = fresh()
    await seed(src, ID_A)
    await seed(src, ID_B)
    await src.putAttempt(attempt('e1', { slots: [ID_A, ID_B], observeNotes: 'hi', updatedAt: 50 }))
    const progress = vi.fn()
    const file = asFile(await exportBackup({ onProgress: progress }, src))
    expect(progress.mock.calls[0]).toEqual([0, 2])
    expect(progress.mock.calls.at(-1)).toEqual([2, 2])

    const dst = fresh()
    const summary = await importBackup(file, 'merge', { repo: dst, makeThumb })
    expect(summary).toMatchObject({ photos: 2, attempts: 1 })
    expect((await dst.listPhotos()).map((p) => p.id).sort()).toEqual([ID_A, ID_B])
    expect((await dst.listAttempts())[0]).toMatchObject({ slots: [ID_A, ID_B], observeNotes: 'hi', updatedAt: 50 })
    const blobs = await dst.getBlobs(ID_A)
    expect(await blobs!.thumb.text()).toBe('thumb')
    expect(new Uint8Array(await blobs!.original.arrayBuffer())).toEqual(buildJpeg({ gps: false }))
  })
})

describe('merge and replace', () => {
  it('merge keeps existing photo ids and adds missing ones', async () => {
    const src = fresh()
    await seed(src, ID_A, buildJpeg({ gps: false, focal35: 14 }))
    await seed(src, ID_B)
    const file = await exportFile(src)

    const dst = fresh()
    await seed(dst, ID_A, buildJpeg({ gps: false, focal35: 24 }))
    await seed(dst, ID_C)
    const summary = await importBackup(file, 'merge', { repo: dst, makeThumb })
    expect(summary.photos).toBe(1)
    expect((await dst.listPhotos()).map((p) => p.id).sort()).toEqual([ID_A, ID_B, ID_C])
    const kept = new Uint8Array(await (await dst.getBlobs(ID_A))!.original.arrayBuffer())
    expect(parseExifBytes(kept).focalLength35).toBe(24)
  })

  it('merge resolves an attempt conflict by newer updatedAt', async () => {
    const src = fresh()
    await src.putAttempts([attempt('newer', { observeNotes: 'backup', updatedAt: 200 }), attempt('older', { observeNotes: 'backup', updatedAt: 100 })])
    const file = await exportFile(src)
    const dst = fresh()
    await dst.putAttempts([attempt('newer', { observeNotes: 'local', updatedAt: 100 }), attempt('older', { observeNotes: 'local', updatedAt: 200 })])
    await importBackup(file, 'merge', { repo: dst, makeThumb })
    const byId = Object.fromEntries((await dst.listAttempts()).map((a) => [a.exerciseId, a.observeNotes]))
    expect(byId).toEqual({ newer: 'backup', older: 'local' })
  })

  it('replace clears local data first', async () => {
    const src = fresh()
    await seed(src, ID_A)
    await src.putAttempt(attempt('e1', { slots: [ID_A, null] }))
    const file = await exportFile(src)
    const dst = fresh()
    await seed(dst, ID_C)
    await dst.putAttempt(attempt('local'))
    await importBackup(file, 'replace', { repo: dst, makeThumb })
    expect((await dst.listPhotos()).map((p) => p.id)).toEqual([ID_A])
    expect((await dst.listAttempts()).map((a) => a.exerciseId)).toEqual(['e1'])
    expect(await dst.getBlobs(ID_C)).toBeUndefined()
  })

  it('a failing thumbnail leaves a replace untouched', async () => {
    const src = fresh()
    await seed(src, ID_A)
    const file = await exportFile(src)
    const dst = fresh()
    await seed(dst, ID_C)
    await expect(importBackup(file, 'replace', { repo: dst, makeThumb: async () => { throw new Error('decode') } })).rejects.toThrow('decode')
    expect((await dst.listPhotos()).map((p) => p.id)).toEqual([ID_C])
  })

  it('drops slot references to photos that are not in the library', async () => {
    const src = fresh()
    await src.putAttempt(attempt('e1', { slots: [ID_A, null] }))
    const dst = fresh()
    await importBackup(await exportFile(src), 'merge', { repo: dst, makeThumb })
    expect((await dst.listAttempts())[0].slots).toEqual([null, null])
  })
})

describe('hostile or wrong archives', () => {
  const manifest = (photos = [photoMeta(ID_A)]) => strToU8(JSON.stringify(buildManifest(photos, [], 1)))

  it('strips GPS from imported photos', async () => {
    const withGps = buildJpeg({ gps: true })
    const zip = zipSync({ 'manifest.json': manifest([photoMeta(ID_A, { exif: { hasExif: true, hasGps: true } })]), [photoPath(ID_A)]: withGps })
    const dst = fresh()
    await importBackup(asFile(zip), 'merge', { repo: dst, makeThumb })
    const stored = new Uint8Array(await (await dst.getBlobs(ID_A))!.original.arrayBuffer())
    expect(parseExifBytes(stored).hasGps).toBe(false)
    expect((await dst.listPhotos())[0].exif.hasGps).toBe(false)
  })

  it('ignores entries with other names and entries not in the manifest', async () => {
    const jpeg = buildJpeg({ gps: false })
    const zip = zipSync({
      'manifest.json': manifest(),
      [photoPath(ID_A)]: jpeg,
      [photoPath(ID_B)]: jpeg,
      'photos/../../evil.jpg': jpeg,
      '../evil.jpg': jpeg,
      'photos/sub/x.jpg': jpeg,
      'notes.txt': strToU8('x'),
    })
    const dst = fresh()
    const summary = await importBackup(asFile(zip), 'merge', { repo: dst, makeThumb })
    expect(summary.photos).toBe(1)
    expect((await dst.listPhotos()).map((p) => p.id)).toEqual([ID_A])
    expect(await dst.getBlobs(ID_B)).toBeUndefined()
  })

  it('rejects a manifest entry whose file is missing', async () => {
    const zip = zipSync({ 'manifest.json': manifest() })
    await expect(importBackup(asFile(zip), 'merge', { repo: fresh(), makeThumb })).rejects.toThrow('invalid-backup')
  })

  it('rejects the wrong app, a missing manifest and non-zip input', async () => {
    const wrong = zipSync({ 'manifest.json': strToU8(JSON.stringify({ ...buildManifest([], [], 1), app: 'other' })) })
    await expect(importBackup(asFile(wrong), 'merge', { repo: fresh(), makeThumb })).rejects.toThrow('invalid-backup')
    await expect(importBackup(asFile(zipSync({ 'a.txt': strToU8('x') })), 'merge', { repo: fresh(), makeThumb })).rejects.toThrow('invalid-backup')
    await expect(importBackup(asFile(strToU8('not a zip')), 'replace', { repo: fresh(), makeThumb })).rejects.toThrow('invalid-backup')
  })

  it('rejects invalid json in the manifest without touching a replace target', async () => {
    const dst = fresh()
    await seed(dst, ID_C)
    const zip = zipSync({ 'manifest.json': strToU8('{oops') })
    await expect(importBackup(asFile(zip), 'replace', { repo: dst, makeThumb })).rejects.toThrow('invalid-backup')
    expect((await dst.listPhotos()).map((p) => p.id)).toEqual([ID_C])
  })
})
