// Focus handling for a mounted dialog: move focus in on mount, keep Tab inside, restore on unmount.
import { nextTick, onBeforeUnmount, onMounted, type Ref } from 'vue'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), ' +
  'select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function useFocusTrap(panel: Ref<HTMLElement | null>) {
  let opener: Element | null = null

  onMounted(async () => {
    opener = document.activeElement
    await nextTick()
    panel.value?.focus({ preventScroll: true })
  })
  onBeforeUnmount(() => {
    if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true })
    opener = null
  })

  /** Call from keydown; wraps Tab at both ends. */
  function trapTab(e: KeyboardEvent): void {
    const el = panel.value
    if (e.key !== 'Tab' || !el) return
    const items = Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((n) => n.getClientRects().length > 0)
    const first = items[0]
    const lastItem = items[items.length - 1]
    if (!first || !lastItem) {
      e.preventDefault()
      el.focus({ preventScroll: true })
      return
    }
    const active = document.activeElement
    if (e.shiftKey && (active === first || active === el)) {
      e.preventDefault()
      lastItem.focus({ preventScroll: true })
    } else if (!e.shiftKey && active === lastItem) {
      e.preventDefault()
      first.focus({ preventScroll: true })
    }
  }

  return { trapTab }
}
