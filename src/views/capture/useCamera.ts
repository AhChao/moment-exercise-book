// Camera lifetime for the capture screen: open on mount, close on unmount and while the page is hidden.
import { onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import type { Ref } from 'vue'
import { UNAVAILABLE } from '@/camera/capabilities'
import { openCamera } from '@/camera/session'
import { CameraError } from '@/camera/types'
import type { CameraErrorCode, CameraSession } from '@/camera/types'
import { writeCachedCaps } from '../exercise/capsCache'

export type CameraStatus = 'opening' | 'ready' | 'error'

export function useCamera(video: Ref<HTMLVideoElement | null>, onReady: (session: CameraSession) => void) {
  const session = shallowRef<CameraSession | null>(null)
  const status = ref<CameraStatus>('opening')
  const errorCode = ref<CameraErrorCode>('failed')
  let generation = 0
  let alive = true

  function close(): void {
    generation++
    session.value?.close()
    session.value = null
  }

  async function open(): Promise<void> {
    close()
    const mine = generation
    status.value = 'opening'
    try {
      const s = await openCamera()
      if (mine !== generation || !alive) {
        s.close()
        return
      }
      session.value = s
      writeCachedCaps(s.capabilities)
      if (video.value) await s.attach(video.value)
      if (mine !== generation) return
      status.value = 'ready'
      onReady(s)
    } catch (e) {
      if (mine !== generation) return
      close()
      errorCode.value = e instanceof CameraError ? e.code : 'failed'
      // A camera that cannot be used here also changes how the exercise page plans its frames.
      if (errorCode.value !== 'failed') writeCachedCaps(UNAVAILABLE)
      status.value = 'error'
    }
  }

  function onVisibility(): void {
    if (document.hidden) {
      close()
      if (status.value === 'ready') status.value = 'opening'
    } else if (alive && status.value !== 'error') void open()
  }

  onMounted(() => {
    document.addEventListener('visibilitychange', onVisibility)
    void open()
  })
  onBeforeUnmount(() => {
    alive = false
    document.removeEventListener('visibilitychange', onVisibility)
    close()
  })

  return { session, status, errorCode, reopen: open }
}
