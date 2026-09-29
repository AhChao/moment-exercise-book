import { readonly, ref } from 'vue'

// The browser fires beforeinstallprompt once, early. main.ts calls initInstall() before mount so the
// event is captured even when the settings screen has not been opened yet.
interface InstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const canInstall = ref(false)
let deferred: InstallPromptEvent | null = null
let started = false

export function initInstall(): void {
  if (started || typeof window === 'undefined') return
  started = true
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e as InstallPromptEvent
    canInstall.value = true
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    canInstall.value = false
  })
}

/** Shows the browser's install prompt. Resolves true when the learner accepted. */
async function install(): Promise<boolean> {
  const event = deferred
  if (!event) return false
  deferred = null
  canInstall.value = false
  await event.prompt()
  const choice = await event.userChoice
  return choice.outcome === 'accepted'
}

export function useInstall() {
  initInstall()
  return { canInstall: readonly(canInstall), install }
}
