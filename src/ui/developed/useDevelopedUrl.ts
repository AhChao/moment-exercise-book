// URL of a photo as the learner adjusted it. Identity adjustments use the library's own URL
// (the library owns and revokes those). Rendered URLs are created here, cached in a bounded
// module cache, and revoked here once evicted and no longer shown.
import { getCurrentScope, onScopeDispose, ref, toValue, watch, type MaybeRefOrGetter, type Ref } from 'vue'
import { renderDeveloped } from '@/develop/render'
import { isIdentity } from '@/develop/identity'
import { useLibrary } from '@/store'
import { DevelopedCache, MAX_EDGE, developedKey, type DevelopedKind } from './developedCache'

const cache = new DevelopedCache<string>(60, (url) => URL.revokeObjectURL(url))

// Renders run one at a time so a page of adjusted thumbnails does not decode everything at once.
let queue: Promise<unknown> = Promise.resolve()
function enqueue<T>(job: () => Promise<T>): Promise<T> {
  const run = queue.then(job, job)
  queue = run.catch(() => undefined)
  return run
}

export function useDevelopedUrl(
  photoId: MaybeRefOrGetter<string>,
  kind: DevelopedKind,
  enabled: MaybeRefOrGetter<boolean> = true,
): Ref<string> {
  const library = useLibrary()
  const url = ref('')
  let held: string | null = null
  let lastId = ''
  let token = 0

  function drop(): void {
    if (held) cache.release(held)
    held = null
  }

  async function run(): Promise<void> {
    const mine = ++token
    const id = toValue(photoId)
    if (id !== lastId) {
      lastId = id
      url.value = ''
    }
    if (!toValue(enabled) || !id) return
    const meta = library.photos.value.find((p) => p.id === id)
    try {
      if (!meta || isIdentity(meta.develop)) {
        const plain = await library.photoUrl(id, kind)
        if (mine !== token) return
        drop()
        url.value = plain
        return
      }
      const key = developedKey(id, meta.develop, kind)
      let next = cache.acquire(key)
      if (next === undefined) {
        const develop = meta.develop
        // Another view may have rendered the same key while this job waited in the queue.
        const made = await enqueue(async () => {
          const hit = cache.acquire(key)
          if (hit !== undefined) return { url: hit, acquired: true }
          const blob = await library.getPhotoBlob(id)
          return { url: URL.createObjectURL(await renderDeveloped(blob, develop, { maxEdge: MAX_EDGE[kind] })), acquired: false }
        })
        if (made.acquired) {
          next = made.url
        } else if (mine !== token) {
          cache.put(key, made.url) // superseded: keep for reuse, not held
          return
        } else {
          cache.put(key, made.url, true)
          next = made.url
        }
      }
      if (mine !== token) {
        cache.release(key)
        return
      }
      drop()
      held = key
      url.value = next ?? ''
    } catch {
      if (mine === token) {
        drop()
        url.value = ''
      }
    }
  }

  const developOf = (): string => {
    const m = library.photos.value.find((p) => p.id === toValue(photoId))
    return m ? JSON.stringify(m.develop) : ''
  }

  watch([() => toValue(photoId), () => toValue(enabled), developOf], () => void run(), { immediate: true })
  if (getCurrentScope()) {
    onScopeDispose(() => {
      token++
      drop()
    })
  }
  return url
}
