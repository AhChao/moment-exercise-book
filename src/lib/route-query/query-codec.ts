// Pure URL-query value codec, no framework. Copied from the collection's use-route-query util.
export type QueryType = 'string' | 'number' | 'boolean' | 'array'
export type QueryValue = string | number | boolean | string[]

export interface QueryOptions {
  type?: QueryType
  /** Drop the param when the value equals the default (clean URLs). Default true. */
  omitDefault?: boolean
}

const clone = <T>(v: T): T => (Array.isArray(v) ? ([...v] as unknown as T) : v)

export function parseQueryValue<T extends QueryValue>(raw: unknown, def: T, opts: QueryOptions = {}): T {
  const { type = 'string' } = opts
  if (raw == null) return clone(def)
  // A repeated param arrives as an array; scalar types read the first entry.
  const first = Array.isArray(raw) && type !== 'array' ? raw[0] : raw
  if (first == null) return clone(def)
  if (type === 'number') {
    const n = Number(first)
    return (Number.isNaN(n) ? clone(def) : n) as T
  }
  if (type === 'boolean') return (first === 'true' || first === '1') as T
  if (type === 'array') {
    const parts = Array.isArray(first) ? first.map(String) : String(first).split(',')
    return parts.map((s) => s.trim()).filter(Boolean) as T
  }
  return String(first) as T
}

export function serializeQueryValue(val: QueryValue | null | undefined, def: QueryValue, opts: QueryOptions = {}): string | undefined {
  const { type = 'string', omitDefault = true } = opts
  if (val == null) return undefined
  if (type === 'array') {
    const list = val as string[]
    return list.length ? list.join(',') : undefined
  }
  if (type === 'boolean') return val ? 'true' : omitDefault ? undefined : 'false'
  const s = String(val)
  if (s === '') return undefined
  if (omitDefault && s === String(def)) return undefined
  return s
}
