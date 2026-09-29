/** Used share of the quota as a whole percent, 0..100. Unknown or zero quota reads as 0. */
export function usagePercent(usage: number, quota: number): number {
  if (!(quota > 0) || !(usage > 0)) return 0
  const pct = (usage / quota) * 100
  // a non-empty library never rounds down to an invisible bar
  return Math.min(100, Math.max(1, Math.round(pct)))
}
