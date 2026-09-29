import { createApp, h, ref } from 'vue'
import ConfirmModal from './ConfirmModal.vue'

// Must cover the leave transition (--ui-dur-base, 200ms) before unmounting.
const LEAVE_MS = 240

export interface ConfirmOptions {
  title: string
  message?: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
  closeOnOverlay?: boolean
}

/**
 * Promise replacement for native confirm(). Resolves true on confirm, false on cancel / Esc /
 * backdrop press. Never rejects.
 *
 * The dialog is teleported to <body>, so it does not live inside `host`. Unmounting during the
 * leave transition can orphan that node, leaving a full-screen overlay that swallows every click.
 * Snapshot the overlays that exist beforehand and remove only the ones this call created
 * (dialogs may legitimately stack).
 */
export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const open = ref(true)
    const host = document.createElement('div')
    document.body.appendChild(host)
    const overlaysBefore = new Set(document.body.querySelectorAll('.mx-modal-overlay'))

    let settled = false
    function settle(confirmed: boolean) {
      if (settled) return
      settled = true
      open.value = false
      setTimeout(() => {
        app.unmount()
        host.remove()
        for (const overlay of document.body.querySelectorAll('.mx-modal-overlay')) {
          if (!overlaysBefore.has(overlay)) overlay.remove()
        }
        resolve(confirmed)
      }, LEAVE_MS)
    }

    const app = createApp({
      render: () =>
        h(ConfirmModal, {
          ...options,
          open: open.value,
          'onUpdate:open': (v: boolean) => {
            open.value = v
          },
          onConfirm: () => settle(true),
          onCancel: () => settle(false),
        }),
    })
    app.mount(host)
  })
}
