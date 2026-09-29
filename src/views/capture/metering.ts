// Shots that fix only one of shutter / ISO start from a metered value for the other, so the first
// photo is neither black nor blown out, and "N stops brighter/darker than proper" can be computed.
import { usesStops } from '@/camera/exposureMath'
import type { Capabilities } from '@/camera/types'
import type { CaptureSpec } from '@/types'

export function needsMetering(shot: CaptureSpec, caps: Capabilities): boolean {
  return usesStops(shot.shutterSec, shot.iso) && caps.canManualExposure && !!caps.iso && !!caps.shutterSec
}
