// Reactive holder of the one shared view transform. The transform belongs to the lightbox,
// not to a photo: switching photos never touches it, so a zoomed point stays where it is.
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import {
  IDENTITY, clampPan, fitSize, zoomAt, type Bounds, type Size, type ViewTransform,
} from './viewTransform'

const BUTTON_ZOOM_FACTOR = 1.6

export function useLightboxView() {
  const stageEl = ref<HTMLElement | null>(null)
  const stageSize = ref<Size>({ w: 0, h: 0 })
  const natural = ref<Size | null>(null)
  const transform = shallowRef<ViewTransform>(IDENTITY)

  const bounds = computed<Bounds>(() => ({
    stage: stageSize.value,
    fit: natural.value ? fitSize(natural.value, stageSize.value) : stageSize.value,
  }))
  /** The stored transform re-clamped for the photo on screen; the stored object itself is never rewritten by a switch. */
  const shown = computed(() => clampPan(transform.value, bounds.value))
  const style = computed(() => ({
    transform: `translate(${shown.value.x}px, ${shown.value.y}px) scale(${shown.value.scale})`,
  }))
  const zoomed = computed(() => shown.value.scale > 1)

  function set(t: ViewTransform): void {
    transform.value = clampPan(t, bounds.value)
  }
  const zoomBy = (factor: number): void => set(zoomAt(shown.value, { x: 0, y: 0 }, factor, bounds.value))
  const zoomIn = (): void => zoomBy(BUTTON_ZOOM_FACTOR)
  const zoomOut = (): void => zoomBy(1 / BUTTON_ZOOM_FACTOR)
  const reset = (): void => {
    transform.value = IDENTITY
  }

  let observer: ResizeObserver | null = null
  function measure(): void {
    const el = stageEl.value
    if (el) stageSize.value = { w: el.clientWidth, h: el.clientHeight }
  }
  onMounted(() => {
    measure()
    if (typeof ResizeObserver !== 'undefined' && stageEl.value) {
      observer = new ResizeObserver(measure)
      observer.observe(stageEl.value)
    }
  })
  onBeforeUnmount(() => observer?.disconnect())

  return { stageEl, natural, bounds, shown, style, zoomed, set, zoomIn, zoomOut, reset }
}

export type LightboxView = ReturnType<typeof useLightboxView>
