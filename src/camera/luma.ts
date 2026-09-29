// Browser glue: mean brightness of the current preview frame (0..255).
export function sampleLuma(video: HTMLVideoElement): number {
  const size = 48
  const canvas = new OffscreenCanvas(size, size)
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx || video.videoWidth === 0) return Number.NaN
  ctx.drawImage(video, 0, 0, size, size)
  const { data } = ctx.getImageData(0, 0, size, size)
  let sum = 0
  for (let i = 0; i < data.length; i += 4) sum += 0.2126 * data[i]! + 0.7152 * data[i + 1]! + 0.0722 * data[i + 2]!
  return sum / (data.length / 4)
}
