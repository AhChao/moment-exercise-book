// Restore scroll position across reload and back/forward, per route path. Call once near the app
// root (App.vue setup). Saves the leaving page's scroll and the live scroll (throttled) into
// sessionStorage, and on entry restores it once the (async-loaded) content is tall enough.
import { onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { createScrollMemory, type ScrollMemory } from './scroll-memory'

export function useScrollMemory({ settleMs = 1500, storeKey = 'view:scroll' } = {}): ScrollMemory {
  const router = useRouter()
  const path = () => router.currentRoute.value.path

  const mem = createScrollMemory({
    scrollY: () => window.scrollY,
    scrollHeight: () => document.documentElement.scrollHeight,
    innerHeight: () => window.innerHeight,
    scrollTo: (x, y) => window.scrollTo(x, y),
    getItem: (k) => {
      try {
        return sessionStorage.getItem(k)
      } catch {
        return null
      }
    },
    setItem: (k, v) => {
      try {
        sessionStorage.setItem(k, v)
      } catch {
        /* quota or private mode */
      }
    },
    raf: (fn) => requestAnimationFrame(fn),
    now: () => performance.now(),
    settleMs,
    storeKey,
  })

  let timer: ReturnType<typeof setTimeout> | undefined
  const onScroll = () => {
    clearTimeout(timer)
    timer = setTimeout(() => mem.save(path()), 150)
  }
  const onUnload = () => mem.save(path())
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('beforeunload', onUnload) // hard reload

  const offBefore = router.beforeEach((_to, from) => {
    if (from?.path) mem.save(from.path)
    return true
  })
  const offAfter = router.afterEach((to) => mem.restore(to.path))

  // Own the restore so the browser does not fight it with stale (pre-async) layout.
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
  mem.restore(path()) // initial hard-reload landing

  onBeforeUnmount(() => {
    clearTimeout(timer)
    window.removeEventListener('scroll', onScroll)
    window.removeEventListener('beforeunload', onUnload)
    offBefore()
    offAfter()
  })

  return mem
}
