import { reactive, readonly } from 'vue'

export type ToastLevel = 'info' | 'success' | 'warning' | 'error'

export interface ToastItem {
  id: number
  message: string
  level: ToastLevel
}

const DEFAULT_DURATION = 3200

const state = reactive<{ toasts: ToastItem[] }>({ toasts: [] })
let seed = 0

/**
 * Toast controller, callable from any module (components, stores, plain code). Mount <ToastStack />
 * once at the app root.
 *
 *   toast('Saved')                       // info
 *   toast.success('Done')
 *   toast.error('Failed', { duration: 6000 })
 *   toast('Sticky', 'warning', { duration: 0 })   // 0 stays until tapped
 */
export function toast(message: string, level: ToastLevel = 'info', opts: { duration?: number } = {}): number {
  const { duration = DEFAULT_DURATION } = opts
  const id = ++seed
  state.toasts.push({ id, message, level })
  if (duration > 0) setTimeout(() => dismissToast(id), duration)
  return id
}

type Shortcut = (message: string, opts?: { duration?: number }) => number
toast.info = ((message, opts) => toast(message, 'info', opts)) as Shortcut
toast.success = ((message, opts) => toast(message, 'success', opts)) as Shortcut
toast.warning = ((message, opts) => toast(message, 'warning', opts)) as Shortcut
toast.error = ((message, opts) => toast(message, 'error', opts)) as Shortcut

export function dismissToast(id: number): void {
  const i = state.toasts.findIndex((t) => t.id === id)
  if (i !== -1) state.toasts.splice(i, 1)
}

/** Reactive read-only list consumed by ToastStack.vue. */
export function useToasts() {
  return readonly(state)
}
