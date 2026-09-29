// Host-side state for one PhotoLightbox: which items and start photo, plus the photo shown last.
import { ref } from 'vue'
import type { LightboxItem } from './lightboxNav'

export function useLightbox() {
  const state = ref<{ items: LightboxItem[]; startId: string } | null>(null)
  let lastId = ''

  function open(items: LightboxItem[], startId: string): void {
    if (!items.length) return
    lastId = startId
    state.value = { items, startId }
  }
  /** Returns the id that was on screen when it closed. */
  function close(): string {
    state.value = null
    return lastId
  }
  const onChange = (id: string): void => {
    lastId = id
  }

  return { state, open, close, onChange }
}
