// Module-level singleton. The only entry point the UI and backup code use.
import { lazyDb, openDb } from './db'
import { createLibrary, type Library } from './library'
import { createRepository, type Repository } from './repository'
import type { LibraryApi } from './types'

let repo: Repository | null = null
let library: Library | null = null

export function getRepository(): Repository {
  return (repo ??= createRepository(lazyDb(() => openDb())))
}

function getLibrary(): Library {
  if (library) return library
  const lib = createLibrary({ repo: getRepository() })
  library = lib
  lib.load().catch((e) => console.error(e))
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') void lib.flush()
    })
    window.addEventListener('pagehide', () => void lib.flush())
  }
  return lib
}

export function useLibrary(): LibraryApi {
  return getLibrary()
}

/** Re-read the library from disk; call after a backup import changed the stored data. */
export function reloadLibrary(): Promise<void> {
  return getLibrary().reload()
}

/** Persist pending debounced writes (used before export). */
export function flushLibrary(): Promise<void> {
  return library ? library.flush() : Promise.resolve()
}

export type { LibraryApi, NewPhoto, StorageInfo, BackupSummary, ImportMode } from './types'
