// In-memory implementation of the Db interface for tests (no IndexedDB in node).
import { SCHEMA, type Db, type DbOp, type StoreName } from '../db'

export function createMemoryDb(): Db {
  const stores: Record<StoreName, Map<IDBValidKey, unknown>> = {
    photoMeta: new Map(), photoBlob: new Map(), attempts: new Map(), kv: new Map(),
  }

  function keyOf(store: StoreName, value: unknown, key?: IDBValidKey): IDBValidKey {
    const path = SCHEMA[store]
    if (path === null) {
      if (key === undefined) throw new Error('key-required')
      return key
    }
    const k = (value as Record<string, unknown>)[path]
    if (typeof k !== 'string' && typeof k !== 'number') throw new Error('key-missing')
    return k
  }

  function apply(op: DbOp): void {
    const m = stores[op.store]
    if (op.type === 'put') m.set(keyOf(op.store, op.value, op.key), op.value)
    else if (op.type === 'delete') m.delete(op.key)
    else m.clear()
  }

  const sortedKeys = (s: StoreName) => [...stores[s].keys()].sort() as IDBValidKey[]

  return {
    async get<T>(s: StoreName, k: IDBValidKey) { return stores[s].get(k) as T | undefined },
    async put(s, v, k) { apply({ type: 'put', store: s, value: v, key: k }) },
    async delete(s, k) { apply({ type: 'delete', store: s, key: k }) },
    async getAll<T>(s: StoreName) { return sortedKeys(s).map((k) => stores[s].get(k) as T) },
    async getAllKeys(s) { return sortedKeys(s) },
    async clear(s) { stores[s].clear() },
    async batch(ops) {
      // Validate first so a bad op leaves nothing half-applied.
      for (const op of ops) if (op.type === 'put') keyOf(op.store, op.value, op.key)
      for (const op of ops) apply(op)
    },
  }
}
