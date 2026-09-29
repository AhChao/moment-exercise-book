// Tiny promise wrapper over IndexedDB. Everything in the store goes through the `Db` interface,
// so tests can swap in the in-memory implementation (src/store/testing/memoryDb.ts).

export type StoreName = 'photoMeta' | 'photoBlob' | 'attempts' | 'kv'

export const DB_NAME = 'meb'
export const DB_VERSION = 1

/** keyPath per store; null = out-of-line keys (caller passes the key). */
export const SCHEMA: Record<StoreName, string | null> = {
  photoMeta: 'id',
  photoBlob: 'id',
  attempts: 'exerciseId',
  kv: null,
}

export type DbOp =
  | { type: 'put'; store: StoreName; value: unknown; key?: IDBValidKey }
  | { type: 'delete'; store: StoreName; key: IDBValidKey }
  | { type: 'clear'; store: StoreName }

export interface Db {
  get<T>(store: StoreName, key: IDBValidKey): Promise<T | undefined>
  put(store: StoreName, value: unknown, key?: IDBValidKey): Promise<void>
  delete(store: StoreName, key: IDBValidKey): Promise<void>
  getAll<T>(store: StoreName): Promise<T[]>
  getAllKeys(store: StoreName): Promise<IDBValidKey[]>
  clear(store: StoreName): Promise<void>
  /** Applies all operations in one transaction: all or nothing. */
  batch(ops: DbOp[]): Promise<void>
}

function run<T>(
  idb: IDBDatabase,
  stores: StoreName[],
  mode: IDBTransactionMode,
  work: (t: IDBTransaction) => IDBRequest<T> | undefined,
): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const t = idb.transaction(stores, mode)
    let req: IDBRequest<T> | undefined
    try {
      req = work(t)
    } catch (e) {
      try { t.abort() } catch { /* already finished */ }
      reject(e)
      return
    }
    // Resolve on transaction completion, not request success: that is when the write is durable.
    t.oncomplete = () => resolve(req?.result)
    t.onerror = () => reject(t.error ?? req?.error)
    t.onabort = () => reject(t.error ?? new Error('transaction-aborted'))
  })
}

function wrap(idb: IDBDatabase): Db {
  return {
    get: <T>(store: StoreName, key: IDBValidKey) =>
      run<T>(idb, [store], 'readonly', (t) => t.objectStore(store).get(key) as IDBRequest<T>),
    async put(store, value, key) {
      await run(idb, [store], 'readwrite', (t) => t.objectStore(store).put(value, key))
    },
    async delete(store, key) {
      await run(idb, [store], 'readwrite', (t) => t.objectStore(store).delete(key))
    },
    async getAll<T>(store: StoreName) {
      return ((await run<T[]>(idb, [store], 'readonly', (t) => t.objectStore(store).getAll() as IDBRequest<T[]>)) ?? [])
    },
    async getAllKeys(store) {
      return (await run(idb, [store], 'readonly', (t) => t.objectStore(store).getAllKeys())) ?? []
    },
    async clear(store) {
      await run(idb, [store], 'readwrite', (t) => t.objectStore(store).clear())
    },
    async batch(ops) {
      if (ops.length === 0) return
      const stores = [...new Set(ops.map((o) => o.store))]
      await run(idb, stores, 'readwrite', (t) => {
        for (const op of ops) {
          const os = t.objectStore(op.store)
          if (op.type === 'put') os.put(op.value, op.key)
          else if (op.type === 'delete') os.delete(op.key)
          else os.clear()
        }
        return undefined
      })
    },
  }
}

export function openDb(factory?: IDBFactory): Promise<Db> {
  const idbFactory = factory ?? globalThis.indexedDB
  return new Promise((resolve, reject) => {
    if (!idbFactory) {
      reject(new Error('indexeddb-unavailable'))
      return
    }
    const req = idbFactory.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const idb = req.result
      for (const [name, keyPath] of Object.entries(SCHEMA)) {
        if (!idb.objectStoreNames.contains(name)) {
          idb.createObjectStore(name, keyPath ? { keyPath } : undefined)
        }
      }
    }
    req.onsuccess = () => resolve(wrap(req.result))
    req.onerror = () => reject(req.error)
    req.onblocked = () => reject(new Error('indexeddb-blocked'))
  })
}

/** A Db that opens on first use; lets modules hold a Db synchronously. */
export function lazyDb(open: () => Promise<Db>): Db {
  let pending: Promise<Db> | null = null
  const db = () => (pending ??= open())
  return {
    get: async (s, k) => (await db()).get(s, k),
    put: async (s, v, k) => (await db()).put(s, v, k),
    delete: async (s, k) => (await db()).delete(s, k),
    getAll: async (s) => (await db()).getAll(s),
    getAllKeys: async (s) => (await db()).getAllKeys(s),
    clear: async (s) => (await db()).clear(s),
    batch: async (ops) => (await db()).batch(ops),
  } as Db
}
