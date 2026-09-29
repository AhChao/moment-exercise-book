// Shots that fix the shutter but leave ISO open ("ISO compensates") start from a metered ISO,
// so the first photo is neither black nor blown out.
import type { Capabilities } from '@/camera/types'
import type { CaptureSpec } from '@/types'

export function needsMetering(shot: CaptureSpec, caps: Capabilities): boolean {
  return shot.shutterSec !== null && shot.iso === null && caps.canManualExposure && !!caps.iso
}
