// Hands the finished file to the learner: the system share sheet when it can take files, else a download.
export type DeliverResult = 'shared' | 'downloaded' | 'cancelled'

function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export async function deliverFile(blob: Blob, filename: string): Promise<DeliverResult> {
  const file = new File([blob], filename, { type: blob.type })
  const canShare = typeof navigator !== 'undefined' && typeof navigator.canShare === 'function' && typeof navigator.share === 'function'
  if (canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename })
      return 'shared'
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled'
      // Any other share failure falls through to a plain download.
    }
  }
  download(blob, filename)
  return 'downloaded'
}
