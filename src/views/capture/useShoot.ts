// Shutter flow: capture with phases, hold the result for review, then keep it in a frame or drop it.
import { computed, onBeforeUnmount, ref, shallowRef } from 'vue'
import type { Ref } from 'vue'
import type { CameraSession, CapturePhase, CaptureResult } from '@/camera/types'
import { useLibrary } from '@/store'
import type { NewPhoto } from '@/store/types'
import type { CaptureSpec, Exercise } from '@/types'
import { toast } from '@/ui/useToast'
import { captureCopy } from '@/copy/capture'
import { prepareCapture } from './prepareCapture'

export interface Pending {
  result: CaptureResult
  photo: NewPhoto
  url: string
}

export function useShoot(session: Ref<CameraSession | null>, spec: Ref<CaptureSpec>) {
  const library = useLibrary()
  const phase = ref<'idle' | CapturePhase>('idle')
  const pending = shallowRef<Pending | null>(null)
  const saving = ref(false)
  const busy = computed(() => phase.value !== 'idle' || saving.value)

  function drop(): void {
    // This URL was made here (the photo is not in the library yet), so revoking it is ours to do.
    if (pending.value) URL.revokeObjectURL(pending.value.url)
    pending.value = null
  }
  onBeforeUnmount(drop)

  async function shoot(): Promise<void> {
    const s = session.value
    if (!s || busy.value) return
    phase.value = 'preparing'
    try {
      const result = await s.capture(spec.value, (p) => {
        phase.value = p
      })
      const photo = await prepareCapture(result)
      pending.value = { result, photo, url: URL.createObjectURL(photo.blob) }
    } catch {
      toast.error(captureCopy.captureFailed)
    } finally {
      phase.value = 'idle'
    }
  }

  /** Stores the photo and puts it in the frame. Resolves true on success. */
  async function keep(exercise: Exercise, slotIndex: number): Promise<boolean> {
    const p = pending.value
    if (!p || saving.value) return false
    saving.value = true
    try {
      const meta = await library.addPhoto(p.photo)
      await library.assignSlot(exercise.id, slotIndex, exercise.shots.length, meta.id)
      toast.success(captureCopy.savedToast)
      drop()
      return true
    } catch {
      toast.error(captureCopy.saveFailed)
      return false
    } finally {
      saving.value = false
    }
  }

  return { phase, pending, saving, busy, shoot, keep, drop }
}
