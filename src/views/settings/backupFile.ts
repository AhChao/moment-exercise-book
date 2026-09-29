import { settings } from '@/copy/settings'

/** moment-exercise-book-YYYYMMDD.zip, using the local calendar date. */
export function backupFileName(date: Date): string {
  const y = String(date.getFullYear()).padStart(4, '0')
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `moment-exercise-book-${y}${m}${d}.zip`
}

/** Learner-facing message for a failed backup import; internal error codes never reach the screen. */
export function importErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message === 'invalid-backup') return settings.backup.invalidFile
  return settings.backup.importFailed
}

/** Hands a blob to the browser as a file download. */
export function saveBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
