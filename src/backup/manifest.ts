// Pure: build and strictly validate the backup manifest. Any defect throws Error('invalid-backup').
import type { Attempt, DevelopSpec, PhotoMeta } from '@/types'

export const BACKUP_APP = 'moment-exercise-book'
export const BACKUP_VERSION = 1

export interface Manifest {
  app: typeof BACKUP_APP
  version: typeof BACKUP_VERSION
  exportedAt: number
  photos: PhotoMeta[]
  attempts: Attempt[]
}

/** UUID-like: hex and dashes only, so an id can never contain a path separator or dot. */
const ID_RE = /^[0-9a-f-]{8,64}$/i
const LENSES = ['ultrawide', 'main', 'tele', 'front', 'unknown']

export const photoPath = (id: string) => `photos/${id}.jpg`
export const isPhotoId = (v: unknown): v is string => typeof v === 'string' && ID_RE.test(v)

export function buildManifest(photos: PhotoMeta[], attempts: Attempt[], exportedAt: number): Manifest {
  return { app: BACKUP_APP, version: BACKUP_VERSION, exportedAt, photos, attempts }
}

function bad(): never {
  throw new Error('invalid-backup')
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const isStr = (v: unknown): v is string => typeof v === 'string'

function checkDevelop(v: unknown): DevelopSpec {
  if (!isObj(v)) return bad()
  const { shadows, highlights, exposure, warmth } = v
  if (![shadows, highlights, exposure, warmth].every(isNum)) return bad()
  return { shadows, highlights, exposure, warmth } as DevelopSpec
}

function checkPhoto(v: unknown): PhotoMeta {
  if (!isObj(v) || !isPhotoId(v.id)) return bad()
  if (!isNum(v.createdAt) || !isNum(v.width) || !isNum(v.height) || !isNum(v.bytes)) return bad()
  if (v.source !== 'camera' && v.source !== 'import') return bad()
  if (!isObj(v.exif) || typeof v.exif.hasExif !== 'boolean' || typeof v.exif.hasGps !== 'boolean') return bad()
  if (!isObj(v.applied)) return bad()
  if (!isStr(v.lens) || !LENSES.includes(v.lens)) return bad()
  return { ...v, develop: checkDevelop(v.develop) } as unknown as PhotoMeta
}

function checkAttempt(v: unknown): Attempt {
  if (!isObj(v) || !isStr(v.exerciseId) || v.exerciseId === '' || v.exerciseId.length > 200) return bad()
  if (!Array.isArray(v.slots) || !v.slots.every((s) => s === null || isPhotoId(s))) return bad()
  if (!isStr(v.observeNotes)) return bad()
  if (!Array.isArray(v.reflectNotes) || !v.reflectNotes.every(isStr)) return bad()
  if (!isNum(v.updatedAt)) return bad()
  if (v.completedAt !== null && !isNum(v.completedAt)) return bad()
  return {
    exerciseId: v.exerciseId,
    slots: v.slots as (string | null)[],
    observeNotes: v.observeNotes,
    reflectNotes: v.reflectNotes as string[],
    updatedAt: v.updatedAt,
    completedAt: v.completedAt as number | null,
  }
}

/** Validates parsed JSON and returns a cleaned manifest. */
export function parseManifest(json: unknown): Manifest {
  if (!isObj(json) || json.app !== BACKUP_APP || json.version !== BACKUP_VERSION) return bad()
  if (!isNum(json.exportedAt)) return bad()
  if (!Array.isArray(json.photos) || !Array.isArray(json.attempts)) return bad()
  const photos = json.photos.map(checkPhoto)
  if (new Set(photos.map((p) => p.id)).size !== photos.length) return bad()
  const attempts = json.attempts.map(checkAttempt)
  if (new Set(attempts.map((a) => a.exerciseId)).size !== attempts.length) return bad()
  return { app: BACKUP_APP, version: BACKUP_VERSION, exportedAt: json.exportedAt, photos, attempts }
}

/** Every photo entry must have its file in the archive. */
export function assertFilesPresent(manifest: Manifest, names: Iterable<string>): void {
  const have = new Set(names)
  if (!manifest.photos.every((p) => have.has(photoPath(p.id)))) bad()
}
