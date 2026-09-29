/** Shutter time for display: "1/125", "0.5 s", "1 s", "2 s". */
export function formatShutter(sec: number): string {
  if (!Number.isFinite(sec) || sec <= 0) return ''
  if (sec >= 1) return `${Number(sec.toFixed(1))} s`
  if (sec > 0.4) return `${Number(sec.toFixed(1))} s`
  return `1/${Math.round(1 / sec)}`
}

/** ISO for display: "ISO 200". */
export function formatIso(iso: number): string {
  return `ISO ${Math.round(iso)}`
}
