import { strToU8, zipSync, type Zippable } from 'fflate'
import { flushLibrary, getRepository } from '@/store'
import type { Repository } from '@/store/repository'
import { buildManifest, photoPath } from './manifest'

export interface ExportOptions {
  onProgress?: (done: number, total: number) => void
}

export async function exportBackup(opts: ExportOptions = {}, repo?: Repository): Promise<Blob> {
  if (!repo) await flushLibrary()
  const r = repo ?? getRepository()
  const [photos, attempts] = await Promise.all([r.listPhotos(), r.listAttempts()])
  const files: Zippable = {}
  opts.onProgress?.(0, photos.length)
  let done = 0
  for (const meta of photos) {
    const blobs = await r.getBlobs(meta.id)
    if (!blobs) throw new Error('photo-not-found')
    // level 0: JPEGs do not compress, so store-only keeps export fast.
    files[photoPath(meta.id)] = [new Uint8Array(await blobs.original.arrayBuffer()), { level: 0 }]
    opts.onProgress?.(++done, photos.length)
  }
  const manifest = buildManifest(photos, attempts, Date.now())
  files['manifest.json'] = [strToU8(JSON.stringify(manifest)), { level: 6 }]
  return new Blob([zipSync(files) as BlobPart], { type: 'application/zip' })
}
