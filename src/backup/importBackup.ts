import { strFromU8, unzipSync } from 'fflate'
import { stripGps } from '@/lib/exif'
import { getRepository, reloadLibrary } from '@/store'
import type { Repository } from '@/store/repository'
import { makeThumbnail } from '@/store/thumbnail'
import type { BackupSummary, ImportMode } from '@/store/types'
import type { Attempt, PhotoMeta } from '@/types'
import { assertFilesPresent, isPhotoId, parseManifest, photoPath } from './manifest'

export interface ImportDeps {
  repo?: Repository
  makeThumb?: (blob: Blob) => Promise<Blob>
}

const ENTRY_RE = /^photos\/([0-9a-f-]{8,64})\.jpg$/i

function readZip(bytes: Uint8Array): Record<string, Uint8Array> {
  try {
    // Only the exact expected names are ever inflated; everything else is dropped by name.
    return unzipSync(bytes, { filter: (f) => f.name === 'manifest.json' || ENTRY_RE.test(f.name) })
  } catch {
    throw new Error('invalid-backup')
  }
}

function readManifest(files: Record<string, Uint8Array>) {
  const raw = files['manifest.json']
  if (!raw) throw new Error('invalid-backup')
  try {
    return parseManifest(JSON.parse(strFromU8(raw)))
  } catch {
    throw new Error('invalid-backup')
  }
}

export async function importBackup(file: File, mode: ImportMode, deps: ImportDeps = {}): Promise<BackupSummary> {
  const repo = deps.repo ?? getRepository()
  const makeThumb = deps.makeThumb ?? makeThumbnail
  const files = readZip(new Uint8Array(await file.arrayBuffer()))
  const manifest = readManifest(files)
  assertFilesPresent(manifest, Object.keys(files))

  const existing = mode === 'merge' ? new Set((await repo.listPhotos()).map((p) => p.id)) : new Set<string>()
  const incoming = manifest.photos.filter((p) => !existing.has(p.id))

  // Phase 1: everything that can fail (decode, thumbnail) happens before any write, so a bad
  // file cannot leave a replace half-done.
  const thumbs = new Map<string, Blob>()
  for (const meta of incoming) {
    const clean = stripGps(files[photoPath(meta.id)])
    thumbs.set(meta.id, await makeThumb(new Blob([clean as BlobPart], { type: 'image/jpeg' })))
  }

  const known = new Set([...existing, ...incoming.map((p) => p.id)])
  const currentAttempts = mode === 'merge' ? new Map((await repo.listAttempts()).map((a) => [a.exerciseId, a])) : new Map<string, Attempt>()
  const winners = manifest.attempts
    .filter((a) => {
      const cur = currentAttempts.get(a.exerciseId)
      return !cur || a.updatedAt > cur.updatedAt
    })
    // Slots may point at photos that are in neither the library nor the backup.
    .map((a) => ({ ...a, slots: a.slots.map((s) => (s !== null && isPhotoId(s) && known.has(s) ? s : null)) }))

  // Phase 2: write.
  if (mode === 'replace') await repo.clearAll()
  let bytes = 0
  for (const meta of incoming) {
    const clean = stripGps(files[photoPath(meta.id)])
    const stored: PhotoMeta = { ...meta, bytes: clean.length, exif: { ...meta.exif, hasGps: false } }
    await repo.putPhoto(stored, {
      original: new Blob([clean as BlobPart], { type: 'image/jpeg' }),
      thumb: thumbs.get(meta.id) as Blob,
    })
    bytes += clean.length
  }
  await repo.putAttempts(winners)

  if (!deps.repo) await reloadLibrary()
  return { photos: incoming.length, attempts: winners.length, bytes }
}
