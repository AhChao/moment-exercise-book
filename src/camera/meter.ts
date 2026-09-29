// Finds the ISO (at a fixed shutter) or the shutter time (at a fixed ISO) that makes the live
// preview reach a target brightness. Needed by exercises that prescribe one of the two and leave
// the other to the learner, and by "N stops brighter/darker than proper" shots.
// The preview tracks the photo's brightness within about 1.5 luma (measured), so metering the
// preview is metering the shot. Brightness rises monotonically with ISO and with shutter time,
// so a log-domain bisection converges in a handful of steps; `measure` is injected so this stays
// pure and testable.

interface BaseOptions {
  /** mean luma 0..255 to aim for; mid-grey after tone mapping sits around 110-125 */
  targetLuma?: number
  /** accept a result this close to the target */
  tolerance?: number
  maxSteps?: number
}

export interface MeterOptions extends BaseOptions {
  minIso: number
  maxIso: number
  /** first ISO to try */
  startIso?: number
}

export interface ShutterMeterOptions extends BaseOptions {
  minSec: number
  maxSec: number
  /** first shutter time to try, seconds */
  startSec?: number
}

export interface MeterResult {
  iso: number
  luma: number
  converged: boolean
  steps: number
}

export interface ShutterMeterResult {
  shutterSec: number
  luma: number
  converged: boolean
  steps: number
}

interface CoreResult {
  value: number
  luma: number
  converged: boolean
  steps: number
}

interface CoreOptions extends BaseOptions {
  min: number
  max: number
  start: number
  round: (v: number) => number
}

/** Shared bisection: brightness must rise with the metered value. */
async function solveLog(measure: (value: number) => Promise<number>, opts: CoreOptions): Promise<CoreResult> {
  const target = opts.targetLuma ?? 115
  const tol = opts.tolerance ?? 12
  const maxSteps = opts.maxSteps ?? 8
  let lo = Math.log(opts.min)
  let hi = Math.log(opts.max)
  let next = Math.log(Math.min(opts.max, Math.max(opts.min, opts.start)))
  let best: CoreResult = { value: opts.round(Math.exp(next)), luma: Number.NaN, converged: false, steps: 0 }
  let bestErr = Infinity

  for (let step = 1; step <= maxSteps; step++) {
    const value = opts.round(Math.exp(next))
    const luma = await measure(value)
    const err = Math.abs(luma - target)
    // On a tie (brightness clipped at an end of the range) keep the value closest to the goal's side.
    const tie = Math.abs(err - bestErr) <= 0.5 && (luma < target ? value > best.value : value < best.value)
    if (err < bestErr - 0.5 || tie) {
      bestErr = err
      best = { value, luma, converged: err <= tol, steps: step }
    }
    if (err <= tol) return { ...best, steps: step }
    if (luma < target) lo = Math.max(lo, next)
    else hi = Math.min(hi, next)
    // The brightness is clipped at both ends: if the bracket collapsed, no value can do better.
    if (hi - lo < 0.02) break
    next = (lo + hi) / 2
  }
  return { ...best, steps: maxSteps }
}

export async function solveIso(
  measure: (iso: number) => Promise<number>,
  opts: MeterOptions,
): Promise<MeterResult> {
  const r = await solveLog(measure, {
    ...opts,
    min: opts.minIso,
    max: opts.maxIso,
    start: opts.startIso ?? 400,
    round: Math.round,
  })
  return { iso: r.value, luma: r.luma, converged: r.converged, steps: r.steps }
}

export async function solveShutter(
  measure: (shutterSec: number) => Promise<number>,
  opts: ShutterMeterOptions,
): Promise<ShutterMeterResult> {
  const r = await solveLog(measure, {
    ...opts,
    min: opts.minSec,
    max: opts.maxSec,
    start: opts.startSec ?? 1 / 60,
    round: (v) => v,
  })
  return { shutterSec: r.value, luma: r.luma, converged: r.converged, steps: r.steps }
}
