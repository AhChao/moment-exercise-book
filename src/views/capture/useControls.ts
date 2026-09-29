// Learner choices for the open controls, the resulting spec, and the debounced live preview.
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { Ref } from 'vue'
import { UNAVAILABLE } from '@/camera/capabilities'
import type { CameraSession } from '@/camera/types'
import type { CaptureSpec, Shot } from '@/types'
import { EMPTY_SPEC, FIELD_OF, buildSpec, isFreeChoice, panelControls } from './buildSpec'
import type { ControlKey } from './buildSpec'

const PREVIEW_DEBOUNCE_MS = 120

export function useControls(shot: Ref<Shot | undefined>, session: Ref<CameraSession | null>) {
  const overrides = ref<Partial<CaptureSpec>>({})
  const caps = computed(() => session.value?.capabilities ?? UNAVAILABLE)
  const shotSpec = computed(() => shot.value?.capture ?? EMPTY_SPEC)
  const spec = computed(() => buildSpec(shotSpec.value, overrides.value, caps.value))
  const controls = computed(() => panelControls(shotSpec.value, caps.value))
  const free = computed(() => isFreeChoice(shotSpec.value))

  function set(key: ControlKey, value: number | null): void {
    overrides.value = { ...overrides.value, [FIELD_OF[key]]: value }
  }

  function pushPreview(): void {
    void session.value?.preview(spec.value).catch(() => {})
  }
  let timer: ReturnType<typeof setTimeout> | undefined
  watch(spec, () => {
    clearTimeout(timer)
    timer = setTimeout(pushPreview, PREVIEW_DEBOUNCE_MS)
  })
  onBeforeUnmount(() => clearTimeout(timer))

  return { overrides, caps, spec, controls, free, set, pushPreview }
}
