// Live adjustment of one photo: decode once, redraw per slider input (one draw per frame),
// persist to the library after 300 ms without changes.
import { onBeforeUnmount, ref, shallowRef, watch, nextTick } from 'vue'
import type { Ref } from 'vue'
import { drawDevelopedPreview } from '@/develop/render'
import { useLibrary } from '@/store'
import { NO_DEVELOP } from '@/types'
import type { DevelopSpec, PhotoMeta } from '@/types'

const PERSIST_IDLE_MS = 300

export function useDevelop(meta: Ref<PhotoMeta | undefined>, canvas: Ref<HTMLCanvasElement | null>) {
  const library = useLibrary()
  const dev = ref<DevelopSpec>({ ...NO_DEVELOP })
  const bitmap = shallowRef<ImageBitmap | null>(null)
  const failed = ref(false)
  let raf = 0
  let timer: ReturnType<typeof setTimeout> | undefined
  let dirtyId: string | null = null
  let loadedId = ''

  function draw(): void {
    raf = 0
    if (canvas.value && bitmap.value) drawDevelopedPreview(canvas.value, bitmap.value, dev.value)
  }
  function requestDraw(): void {
    if (!raf) raf = requestAnimationFrame(draw)
  }

  function flush(): void {
    clearTimeout(timer)
    timer = undefined
    if (dirtyId) {
      const id = dirtyId
      dirtyId = null
      void library.setDevelop(id, { ...dev.value })
    }
  }
  function schedulePersist(): void {
    dirtyId = meta.value?.id ?? null
    clearTimeout(timer)
    timer = setTimeout(flush, PERSIST_IDLE_MS)
  }

  async function load(id: string, saved: DevelopSpec): Promise<void> {
    flush()
    bitmap.value?.close()
    bitmap.value = null
    failed.value = false
    dev.value = { ...saved }
    try {
      const bmp = await createImageBitmap(await library.getPhotoBlob(id))
      if (meta.value?.id !== id) {
        bmp.close()
        return
      }
      bitmap.value = bmp
      await nextTick()
      requestDraw()
    } catch {
      if (meta.value?.id === id) failed.value = true
    }
  }

  watch(
    () => meta.value?.id,
    (id) => {
      if (id && id !== loadedId && meta.value) {
        loadedId = id
        void load(id, meta.value.develop)
      }
    },
    { immediate: true },
  )

  function set(key: keyof DevelopSpec, value: number): void {
    dev.value = { ...dev.value, [key]: value }
    requestDraw()
    schedulePersist()
  }
  function replace(next: DevelopSpec): void {
    dev.value = { ...next }
    requestDraw()
    schedulePersist()
  }

  onBeforeUnmount(() => {
    cancelAnimationFrame(raf)
    flush()
    bitmap.value?.close()
    bitmap.value = null
  })

  /** Forget unsaved slider changes (used right before the photo is deleted). */
  function discardPending(): void {
    clearTimeout(timer)
    timer = undefined
    dirtyId = null
  }

  return { dev, failed, set, reset: (k: keyof DevelopSpec) => set(k, 0), replace, flush, discardPending }
}
