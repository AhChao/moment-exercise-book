import type { DevelopSpec } from '@/types'

/** True when every slider is 0, i.e. developing would change nothing. */
export function isIdentity(dev: DevelopSpec | null | undefined): boolean {
  if (!dev) return true
  return dev.shadows === 0 && dev.highlights === 0 && dev.exposure === 0 && dev.warmth === 0
}
