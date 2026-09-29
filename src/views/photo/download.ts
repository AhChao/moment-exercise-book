// Saving a developed photo to the device as a JPEG file.
const pad = (n: number, w = 2): string => String(n).padStart(w, '0')

/** "moment-YYYYMMDD-HHMMSS.jpg" from the capture time (local). */
export function photoFileName(createdAt: number): string {
  const d = new Date(createdAt)
  const date = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`
  const time = `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  return `moment-${date}-${time}.jpg`
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Object URL created here; released once the browser has started the download.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
