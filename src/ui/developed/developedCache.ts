// Pure key + bounded-cache logic for developed (adjusted) image URLs. No DOM.
import type { DevelopSpec } from '@/types'

export type DevelopedKind = 'thumb' | 'full'

export const MAX_EDGE: Record<DevelopedKind, number> = { thumb: 480, full: 2048 }

export const developedKey = (id: string, develop: DevelopSpec, kind: DevelopedKind): string =>
  `${id}:${JSON.stringify(develop)}:${kind}`

interface Entry<V> { value: V; refs: number }

/**
 * Insertion/recency ordered cache. Entries that a view still shows (refs > 0) are never evicted,
 * so an object URL is only revoked once nothing displays it.
 */
export class DevelopedCache<V> {
  private map = new Map<string, Entry<V>>()

  constructor(
    private readonly max: number,
    private readonly onEvict: (value: V) => void,
  ) {}

  get size(): number {
    return this.map.size
  }

  has(key: string): boolean {
    return this.map.has(key)
  }

  /** Stores a value, optionally already held by the caller (so trimming cannot drop it), then trims. */
  put(key: string, value: V, held = false): void {
    const old = this.map.get(key)
    const refs = (old?.refs ?? 0) + (held ? 1 : 0)
    if (old) {
      if (old.value !== value) this.onEvict(old.value)
      this.map.delete(key)
    }
    this.map.set(key, { value, refs })
    this.trim()
  }

  /** Marks the entry as shown and most recently used. */
  acquire(key: string): V | undefined {
    const e = this.map.get(key)
    if (!e) return undefined
    this.map.delete(key)
    e.refs += 1
    this.map.set(key, e)
    return e.value
  }

  release(key: string): void {
    const e = this.map.get(key)
    if (e && e.refs > 0) e.refs -= 1
    this.trim()
  }

  private trim(): void {
    if (this.map.size <= this.max) return
    for (const [key, e] of this.map) {
      if (this.map.size <= this.max) break
      if (e.refs > 0) continue
      this.map.delete(key)
      this.onEvict(e.value)
    }
  }
}
