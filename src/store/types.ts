// Contract of the local library (implemented in src/store/). UI depends on this file only.
import type { Ref } from 'vue'
import type { AppliedSettings, Attempt, DevelopSpec, ExifInfo, Lens, PhotoMeta } from '@/types'

export interface NewPhoto {
  blob: Blob
  source: 'camera' | 'import'
  exif: ExifInfo
  applied: AppliedSettings
  lens: Lens
  /** displayed size after orientation */
  width: number
  height: number
}

export interface StorageInfo {
  usage: number
  quota: number
  persisted: boolean
}

export interface LibraryApi {
  /** true once IndexedDB has been read into memory */
  loaded: Ref<boolean>
  /** newest first */
  photos: Ref<PhotoMeta[]>
  /** keyed by exercise id */
  attempts: Ref<Record<string, Attempt>>

  /** Stores the original bytes untouched, plus a 480 px-edge JPEG thumbnail. */
  addPhoto(input: NewPhoto): Promise<PhotoMeta>
  /** Object URL, cached per id and kind. Callers never revoke; the library does on remove. */
  photoUrl(id: string, kind: 'full' | 'thumb'): Promise<string>
  getPhotoBlob(id: string): Promise<Blob>
  setDevelop(id: string, develop: DevelopSpec): Promise<void>
  /** Removes the photo and clears it from every attempt slot that referenced it. */
  removePhoto(id: string): Promise<void>

  /** Creates the attempt on first use. slotCount = exercise.shots.length. */
  assignSlot(exerciseId: string, slotIndex: number, slotCount: number, photoId: string | null): Promise<void>
  saveNotes(
    exerciseId: string,
    slotCount: number,
    reflectCount: number,
    patch: { observeNotes?: string; reflectNotes?: string[] },
  ): Promise<void>
  markCompleted(exerciseId: string, slotCount: number, reflectCount: number, done: boolean): Promise<void>

  storageInfo(): Promise<StorageInfo>
  /** Asks the browser not to evict the data. Returns whether it was granted. */
  requestPersist(): Promise<boolean>
}

/** Implemented in src/store/index.ts: module-level singleton. */
export type UseLibrary = () => LibraryApi

export interface BackupSummary {
  photos: number
  attempts: number
  bytes: number
}

export type ImportMode = 'merge' | 'replace'
