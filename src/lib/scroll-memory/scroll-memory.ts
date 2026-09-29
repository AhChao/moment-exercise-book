// Per-route scroll restoration core, framework-free with all I/O injected so it runs (and is tested)
// without a browser. Copied from the collection's use-scroll-memory util.
export interface ScrollMemoryDeps {
  scrollY: () => number
  scrollHeight: () => number
  innerHeight: () => number
  scrollTo: (x: number, y: number) => void
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  raf: (fn: () => void) => void
  now: () => number
  settleMs?: number
  storeKey?: string
}

export interface ScrollMemory {
  save: (path: string) => void
  restore: (path: string) => void
}

export function createScrollMemory(deps: ScrollMemoryDeps): ScrollMemory {
  const { scrollY, scrollHeight, innerHeight, scrollTo, getItem, setItem, raf, now, settleMs = 1500, storeKey = 'view:scroll' } = deps

  const read = (): Record<string, number> => {
    try {
      return JSON.parse(getItem(storeKey) || '{}') as Record<string, number>
    } catch {
      return {}
    }
  }
  const write = (m: Record<string, number>) => setItem(storeKey, JSON.stringify(m))

  const save = (path: string) => {
    const m = read()
    m[path] = scrollY()
    write(m)
  }

  let restoreId = 0 // a newer navigation cancels an in-flight restore
  const restore = (path: string) => {
    const id = ++restoreId
    const target = read()[path] || 0
    const start = now()
    const tick = () => {
      if (id !== restoreId) return // superseded by a newer restore
      const max = Math.max(0, scrollHeight() - innerHeight())
      // Wait until the page is tall enough (async content arrived) or the settle window ends.
      if (target <= max || now() - start > settleMs) {
        scrollTo(0, Math.min(target, max))
        return
      }
      raf(tick)
    }
    raf(tick)
  }

  return { save, restore }
}
