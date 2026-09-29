// Picks the ISO that makes the live preview reach a target brightness at a fixed shutter.
// Needed by exercises that prescribe a shutter and leave ISO to the learner ("ISO compensates").
// The preview tracks the photo's brightness within about 1.5 luma (measured), so metering the
// preview is metering the shot. Brightness rises monotonically with ISO, so a log-domain bisection
// converges in a handful of steps; `measure` is injected so this stays pure and testable.

export interface MeterOptions {
  minIso: number
  maxIso: number
  /** mean luma 0..255 to aim for; mid-grey after tone mapping sits around 110-125 */
  targetLuma?: number
  /** accept a result this close to the target */
  tolerance?: number
  maxSteps?: number
  /** first ISO to try */
  startIso?: number
}

export interface MeterResult {
  iso: number
  luma: number
  converged: boolean
  steps: number
}

export async function solveIso(
  measure: (iso: number) => Promise<number>,
  opts: MeterOptions,
): Promise<MeterResult> {
  const target = opts.targetLuma ?? 115
  const tol = opts.tolerance ?? 12
  const maxSteps = opts.maxSteps ?? 8
  let lo = Math.log(opts.minIso)
  let hi = Math.log(opts.maxIso)
  let next = Math.log(Math.min(opts.maxIso, Math.max(opts.minIso, opts.startIso ?? 400)))
  let best: MeterResult = { iso: Math.round(Math.exp(next)), luma: Number.NaN, converged: false, steps: 0 }
  let bestErr = Infinity

  for (let step = 1; step <= maxSteps; step++) {
    const iso = Math.round(Math.exp(next))
    const luma = await measure(iso)
    const err = Math.abs(luma - target)
    // On a tie (brightness clipped at an end of the range) keep the ISO closest to the goal's side.
    const tie = Math.abs(err - bestErr) <= 0.5 && (luma < target ? iso > best.iso : iso < best.iso)
    if (err < bestErr - 0.5 || tie) {
      bestErr = err
      best = { iso, luma, converged: err <= tol, steps: step }
    }
    if (err <= tol) return { ...best, steps: step }
    if (luma < target) lo = Math.max(lo, next)
    else hi = Math.min(hi, next)
    // The brightness is clipped at both ends: if the bracket collapsed, no ISO can do better.
    if (hi - lo < 0.02) break
    next = (lo + hi) / 2
  }
  return { ...best, steps: maxSteps }
}
