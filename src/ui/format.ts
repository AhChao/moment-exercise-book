const UNITS = ['B', 'KB', 'MB', 'GB', 'TB']

/** Human byte size: "0 B", "1.5 KB", "12 MB". One decimal below 10, none above; never "1024 KB". */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  let value = bytes
  let i = 0
  while (value >= 1024 && i < UNITS.length - 1) {
    value /= 1024
    i++
  }
  if (i === 0) return `${Math.round(value)} B`
  // rounding can land on 1024 of the smaller unit: promote it
  if (Math.round(value) >= 1024 && i < UNITS.length - 1) {
    value /= 1024
    i++
  }
  const text = value < 10 ? String(Number(value.toFixed(1))) : String(Math.round(value))
  return `${text} ${UNITS[i]}`
}
