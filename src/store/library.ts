// Reactive library facade over a Repository. `createLibrary` takes injected deps so it runs in node tests.
import { ref, toRaw } from 'vue'
import { NO_DEVELOP, type Attempt, type DevelopSpec, type PhotoMeta } from '@/types'
import { clearPhotoFromSlots, fitAttempt, padTo } from './attemptOps'
import type { Repository } from './repository'
import { makeThumbnail } from './thumbnail'
import type { LibraryApi, NewPhoto, StorageInfo } from './types'

export const NOTES_DEBOUNCE_MS = 400

export interface LibraryDeps {
  repo: Repository
  makeThumb?: (blob: Blob) => Promise<Blob>
  now?: () => number
  newId?: () => string
  createUrl?: (blob: Blob) => string
  revokeUrl?: (url: string) => void
  debounceMs?: number
}

export interface Library extends LibraryApi {
  load(): Promise<void>
  /** Re-read everything from the repository (after a backup import). */
  reload(): Promise<void>
  /** Persist debounced writes now. */
  flush(): Promise<void>
}

const newestFirst = (a: PhotoMeta, b: PhotoMeta) => b.createdAt - a.createdAt

export function createLibrary(deps: LibraryDeps): Library {
  const { repo } = deps
  const makeThumb = deps.makeThumb ?? makeThumbnail
  const now = deps.now ?? Date.now
  const newId = deps.newId ?? (() => crypto.randomUUID())
  const createUrl = deps.createUrl ?? ((b: Blob) => URL.createObjectURL(b))
  const revokeUrl = deps.revokeUrl ?? ((u: string) => URL.revokeObjectURL(u))
  const debounceMs = deps.debounceMs ?? NOTES_DEBOUNCE_MS

  const loaded = ref(false)
  const photos = ref<PhotoMeta[]>([])
  const attempts = ref<Record<string, Attempt>>({})

  // All writes run one after another so a late debounced write cannot overtake a newer one.
  let chain: Promise<unknown> = Promise.resolve()
  const enqueue = <T>(fn: () => Promise<T>): Promise<T> => {
    const p = chain.then(fn)
    chain = p.catch(() => undefined)
    return p
  }

  const urls = new Map<string, string>()
  const urlLoads = new Map<string, Promise<string>>()
  const timers = new Map<string, ReturnType<typeof setTimeout>>()

  // Values read back from a ref are reactive proxies, which IndexedDB cannot clone: unwrap before persisting.
  const rawAttempt = (id: string): Attempt => toRaw(attempts.value[id]!)

  function setAttempt(a: Attempt): void {
    attempts.value = { ...attempts.value, [a.exerciseId]: a }
  }

  function persistAttempt(id: string): Promise<void> {
    const t = timers.get(id)
    if (t !== undefined) {
      clearTimeout(t)
      timers.delete(id)
    }
    return enqueue(() => repo.putAttempt(rawAttempt(id)))
  }

  function forgetUrls(id: string): void {
    for (const kind of ['full', 'thumb'] as const) {
      const key = `${id}:${kind}`
      const u = urls.get(key)
      if (u) revokeUrl(u)
      urls.delete(key)
      urlLoads.delete(key)
    }
  }

  function forgetAllUrls(): void {
    for (const u of urls.values()) revokeUrl(u)
    urls.clear()
    urlLoads.clear()
  }

  async function mutateAttempt(id: string, slotCount: number, change: (a: Attempt) => Attempt): Promise<void> {
    const t = now()
    setAttempt({ ...change(fitAttempt(attempts.value[id], id, slotCount, t)), updatedAt: t })
    await persistAttempt(id)
  }

  async function load(): Promise<void> {
    const [p, a] = await Promise.all([repo.listPhotos(), repo.listAttempts()])
    photos.value = p.sort(newestFirst)
    attempts.value = Object.fromEntries(a.map((x) => [x.exerciseId, x]))
    loaded.value = true
  }

  async function flush(): Promise<void> {
    for (const id of [...timers.keys()]) void persistAttempt(id).catch((e) => console.error(e))
    await chain
  }

  return {
    loaded,
    photos,
    attempts,
    load,
    flush,
    async reload() {
      await flush()
      forgetAllUrls()
      await load()
    },

    async addPhoto(input: NewPhoto) {
      const thumb = await makeThumb(input.blob)
      const meta: PhotoMeta = {
        id: newId(),
        createdAt: now(),
        source: input.source,
        width: input.width,
        height: input.height,
        bytes: input.blob.size,
        exif: input.exif,
        applied: input.applied,
        lens: input.lens,
        develop: { ...NO_DEVELOP },
      }
      await enqueue(() => repo.putPhoto(meta, { original: input.blob, thumb }))
      forgetUrls(meta.id)
      photos.value = [meta, ...photos.value].sort(newestFirst)
      return meta
    },

    photoUrl(id, kind) {
      const key = `${id}:${kind}`
      const cached = urls.get(key)
      if (cached) return Promise.resolve(cached)
      let pending = urlLoads.get(key)
      if (!pending) {
        pending = repo.getBlobs(id).then((blobs) => {
          if (!blobs) throw new Error('photo-not-found')
          // The photo may have been removed while the blobs were loading.
          if (urlLoads.get(key) !== pending) throw new Error('photo-not-found')
          const url = createUrl(kind === 'full' ? blobs.original : blobs.thumb)
          urls.set(key, url)
          return url
        })
        urlLoads.set(key, pending)
        pending.catch(() => urlLoads.delete(key))
      }
      return pending
    },

    async getPhotoBlob(id) {
      const blobs = await repo.getBlobs(id)
      if (!blobs) throw new Error('photo-not-found')
      return blobs.original
    },

    async setDevelop(id: string, develop: DevelopSpec) {
      const cur = photos.value.find((p) => p.id === id)
      if (!cur) throw new Error('photo-not-found')
      const next: PhotoMeta = { ...toRaw(cur), develop: { ...develop } }
      await enqueue(() => repo.putPhotoMeta(next))
      photos.value = photos.value.map((p) => (p.id === id ? next : p))
    },

    async removePhoto(id) {
      forgetUrls(id)
      await enqueue(() => repo.deletePhoto(id))
      photos.value = photos.value.filter((p) => p.id !== id)
      const t = now()
      for (const a of Object.values(attempts.value)) {
        const cleared = clearPhotoFromSlots(toRaw(a), id)
        if (!cleared) continue
        setAttempt({ ...cleared, updatedAt: t })
        await persistAttempt(a.exerciseId)
      }
    },

    assignSlot: (exerciseId, slotIndex, slotCount, photoId) =>
      mutateAttempt(exerciseId, slotCount, (a) => {
        if (slotIndex < 0 || slotIndex >= slotCount) throw new Error('slot-out-of-range')
        const slots = [...a.slots]
        slots[slotIndex] = photoId
        return { ...a, slots }
      }),

    async saveNotes(exerciseId, slotCount, reflectCount, patch) {
      const t = now()
      const cur = fitAttempt(attempts.value[exerciseId], exerciseId, slotCount, t)
      const next: Attempt = {
        ...cur,
        observeNotes: patch.observeNotes ?? cur.observeNotes,
        reflectNotes: padTo(patch.reflectNotes ?? cur.reflectNotes, reflectCount, ''),
        updatedAt: t,
      }
      if (patch.predictNotes) next.predictNotes = [...patch.predictNotes]
      setAttempt(next)
      // Memory is current; the disk write waits for the typing to pause.
      const old = timers.get(exerciseId)
      if (old !== undefined) clearTimeout(old)
      timers.set(exerciseId, setTimeout(() => {
        timers.delete(exerciseId)
        void persistAttempt(exerciseId).catch((e) => console.error(e))
      }, debounceMs))
    },

    markCompleted: (exerciseId, slotCount, reflectCount, done) =>
      mutateAttempt(exerciseId, slotCount, (a) => ({
        ...a,
        reflectNotes: padTo(a.reflectNotes, reflectCount, ''),
        completedAt: done ? now() : null,
      })),

    async storageInfo(): Promise<StorageInfo> {
      const s = typeof navigator !== 'undefined' ? navigator.storage : undefined
      let usage = 0
      let quota = 0
      let persisted = false
      try {
        const est = await s?.estimate?.()
        usage = est?.usage ?? 0
        quota = est?.quota ?? 0
      } catch { /* keep zeros */ }
      try {
        persisted = (await s?.persisted?.()) ?? false
      } catch { /* keep false */ }
      return { usage, quota, persisted }
    },

    async requestPersist() {
      const s = typeof navigator !== 'undefined' ? navigator.storage : undefined
      if (!s?.persist) return false
      try {
        return await s.persist()
      } catch {
        return false
      }
    },
  }
}
