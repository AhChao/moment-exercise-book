// Pure exposure arithmetic. Exposure is linear in ISO and in shutter time (aperture is fixed),
// so one stop is exactly a doubling of either. Used to turn "N stops brighter/darker than a
// properly exposed picture" into concrete ISO / shutter numbers once the scene has been metered.

export interface ValueRange {
  min: number
  max: number
}

export type ExposureClamp = 'iso-min' | 'iso-max' | 'shutter-min' | 'shutter-max'

export interface ExposureInput {
  /** prescribed shutter time in seconds, null = free */
  shutterSec: number | null
  /** prescribed ISO, null = free */
  iso: number | null
  /** requested brightness relative to a properly exposed picture */
  stops: number
  /** metered ISO that exposes properly at the prescribed shutter */
  baseIso?: number
  /** metered shutter time that exposes properly at the prescribed ISO */
  baseShutterSec?: number
  isoRange: ValueRange
  shutterRange: ValueRange
}

export interface ExposureOutput {
  iso: number | null
  shutterSec: number | null
  /** stops actually delivered relative to proper exposure (after range limits) */
  achievedStops: number
  clamped: ExposureClamp | null
}

export const scaleByStops = (value: number, stops: number): number => value * 2 ** stops

const clampTo = (v: number, r: ValueRange): number => Math.min(r.max, Math.max(r.min, v))

/** True when the shot prescribes exactly one of shutter / ISO, i.e. metering is meaningful. */
export const usesStops = (shutterSec: number | null, iso: number | null): boolean =>
  (shutterSec === null) !== (iso === null)

export function resolveExposure(input: ExposureInput): ExposureOutput {
  const { shutterSec, iso, stops } = input
  if (shutterSec !== null && iso === null && input.baseIso !== undefined && input.baseIso > 0) {
    const wanted = scaleByStops(input.baseIso, stops)
    const final = clampTo(wanted, input.isoRange)
    const clamped: ExposureClamp | null = final > wanted ? 'iso-min' : final < wanted ? 'iso-max' : null
    return { iso: final, shutterSec, achievedStops: Math.log2(final / input.baseIso), clamped }
  }
  if (iso !== null && shutterSec === null && input.baseShutterSec !== undefined && input.baseShutterSec > 0) {
    const wanted = scaleByStops(input.baseShutterSec, stops)
    const final = clampTo(wanted, input.shutterRange)
    const clamped: ExposureClamp | null = final > wanted ? 'shutter-min' : final < wanted ? 'shutter-max' : null
    return { iso, shutterSec: final, achievedStops: Math.log2(final / input.baseShutterSec), clamped }
  }
  return { iso, shutterSec, achievedStops: 0, clamped: null }
}
