// Meters the live preview for shots that fix only one of shutter / ISO. The free one is set so the
// picture lands `shot.exposureStops` stops away from a properly exposed picture of the scene.
import { computed, ref } from 'vue'
import type { Ref } from 'vue'
import { resolveExposure } from '@/camera/exposureMath'
import type { ExposureClamp } from '@/camera/exposureMath'
import { sampleLuma } from '@/camera/luma'
import { solveIso, solveShutter } from '@/camera/meter'
import type { CameraSession } from '@/camera/types'
import type { ExposureNoteKey } from '@/copy/capture'
import type { Shot } from '@/types'
import { EMPTY_SPEC } from './buildSpec'
import { needsMetering } from './metering'
import { ISO_STOPS, SHUTTER_STOPS, snapToStop } from './stops'

const SETTLE_MS = 700
/** Shortfalls below this many stops are not worth telling the learner about. */
const NOTE_THRESHOLD_STOPS = 0.34

const NOTE_OF: Record<ExposureClamp, ExposureNoteKey> = {
  'iso-min': 'isoMin',
  'iso-max': 'isoMax',
  'shutter-min': 'shutterMin',
  'shutter-max': 'shutterMax',
}

export function useAutoExposure(
  video: Ref<HTMLVideoElement | null>,
  session: Ref<CameraSession | null>,
  shot: Ref<Shot | undefined>,
  set: (key: 'iso' | 'shutter', value: number) => void,
) {
  const metering = ref(false)
  const note = ref<ExposureNoteKey | null>(null)
  /** True for shots that use exposure metering on this phone (drives the fresh-reading button). */
  const active = computed(() => {
    const s = session.value
    const target = shot.value?.capture
    return !!s && !!target && needsMetering(target, s.capabilities)
  })

  async function run(): Promise<void> {
    const s = session.value
    const v = video.value
    const current = shot.value
    const target = current?.capture
    if (!s || !v || !current || !target || metering.value || !needsMetering(target, s.capabilities)) return
    const isoRange = s.capabilities.iso
    const shutterRange = s.capabilities.shutterSec
    if (!isoRange || !shutterRange) return
    metering.value = true
    note.value = null
    const frame = async (shutterSec: number | null, iso: number | null): Promise<number> => {
      await s.preview({ ...EMPTY_SPEC, shutterSec, iso })
      await new Promise((r) => setTimeout(r, SETTLE_MS))
      const luma = sampleLuma(v)
      if (Number.isNaN(luma)) throw new Error('no-frame')
      return luma
    }
    try {
      const stops = current.exposureStops ?? 0
      const fixedShutter = target.shutterSec
      const fixedIso = target.iso
      const base =
        fixedShutter !== null
          ? await solveIso((iso) => frame(fixedShutter, iso), { minIso: isoRange.min, maxIso: isoRange.max })
          : await solveShutter((sec) => frame(sec, fixedIso), { minSec: shutterRange.min, maxSec: shutterRange.max })
      if (session.value !== s) return
      const out = resolveExposure({
        shutterSec: fixedShutter,
        iso: fixedIso,
        stops,
        baseIso: 'iso' in base ? base.iso : undefined,
        baseShutterSec: 'shutterSec' in base ? base.shutterSec : undefined,
        isoRange,
        shutterRange,
      })
      if (fixedShutter !== null && out.iso !== null) set('iso', snapToStop(ISO_STOPS, out.iso))
      if (fixedIso !== null && out.shutterSec !== null) set('shutter', snapToStop(SHUTTER_STOPS, out.shutterSec))
      if (out.clamped && Math.abs(out.achievedStops - stops) >= NOTE_THRESHOLD_STOPS) note.value = NOTE_OF[out.clamped]
    } catch {
      // Metering is a convenience: without it the learner sets the value by hand.
    } finally {
      metering.value = false
    }
  }

  return { metering, note, active, run }
}
