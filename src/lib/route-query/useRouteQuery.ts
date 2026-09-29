// Two-way bind a piece of view state to a URL query param, so it survives reload, is shareable, and
// stays consistent with back/forward. A writable computed backed by the route: reading reflects the
// URL, writing does router.replace (no history entry per toggle).
//
//   const lens = useRouteQuery('lens', '')                          // '' omits the param
//   const tags = useRouteQuery('tags', [] as string[], { type: 'array' })
//
// omitDefault (default true) drops the param when the value equals the default. Set it false when
// "absent" must be distinguishable from the default.
import { computed, type WritableComputedRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { parseQueryValue, serializeQueryValue, type QueryOptions, type QueryValue } from './query-codec'

/** Widen a literal default ('' or 1) to its primitive type so the ref is assignable. */
type Widen<T> = T extends string ? string : T extends number ? number : T extends boolean ? boolean : T

export function useRouteQuery<T extends QueryValue>(
  key: string,
  defaultValue: T,
  opts: QueryOptions = {},
): WritableComputedRef<Widen<T>> {
  const route = useRoute()
  const router = useRouter()

  function set(val: Widen<T>) {
    const next = serializeQueryValue(val as QueryValue, defaultValue, opts)
    const cur = route.query[key]
    if (next === cur || (next === undefined && cur === undefined)) return // no redundant navigation
    const query = { ...route.query }
    if (next === undefined) delete query[key]
    else query[key] = next
    router.replace({ query }).catch(() => {
      /* duplicated or aborted navigation is fine */
    })
  }

  return computed<Widen<T>>({
    get: () => parseQueryValue(route.query[key], defaultValue, opts) as Widen<T>,
    set,
  })
}
