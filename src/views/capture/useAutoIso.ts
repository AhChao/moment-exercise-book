// Meters the live preview to pick a starting ISO for shots that fix only the shutter.
import { ref } from 'vue'
import type { Ref } from 'vue'
import { sampleLuma } from '@/camera/luma'
import { solveIso } from '@/camera/meter'
import type { CameraSession } from '@/camera/types'
import type { Shot } from '@/types'
import { EMPTY_SPEC } from './buildSpec'
import { needsMetering } from './metering'
import { ISO_STOPS, snapToStop } from './stops'

const SETTLE_MS = 700

export function useAutoIso(
  video: Ref<HTMLVideoElement | null>,
  session: Ref<CameraSession | null>,
  shot: Ref<Shot | undefined>,
  setIso: (iso: number) => void,
) {
  const metering = ref(false)

  async function run(): Promise<void> {
    const s = session.value
    const v = video.value
    const target = shot.value?.capture
    if (!s || !v || !target || metering.value || !needsMetering(target, s.capabilities)) return
    const isoRange = s.capabilities.iso
    if (!isoRange) return
    metering.value = true
    try {
      const result = await solveIso(
        async (iso) => {
          await s.preview({ ...EMPTY_SPEC, shutterSec: target.shutterSec, iso })
          await new Promise((r) => setTimeout(r, SETTLE_MS))
          const luma = sampleLuma(v)
          if (Number.isNaN(luma)) throw new Error('no-frame')
          return luma
        },
        { minIso: isoRange.min, maxIso: isoRange.max },
      )
      if (session.value === s) setIso(snapToStop(ISO_STOPS, result.iso))
    } catch {
      // Metering is a convenience: without it the learner sets ISO by hand.
    } finally {
      metering.value = false
    }
  }

  return { metering, run }
}
