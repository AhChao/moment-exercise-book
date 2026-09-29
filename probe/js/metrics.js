// Cheap image statistics so a test can say "the photo really got brighter /
// sharper / warmer" instead of trusting the settings readback alone.
// sharp = variance of a Laplacian over the centre crop: only meaningful when
// compared between shots of the same scene.

export async function analyze(blob) {
  const bmp = await createImageBitmap(blob)
  const W = 1024
  const H = Math.round((bmp.height * W) / bmp.width)
  const canvas = new OffscreenCanvas(W, H)
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(bmp, 0, 0, W, H)
  const src = { w: bmp.width, h: bmp.height }
  bmp.close()
  const { data } = ctx.getImageData(0, 0, W, H)

  const luma = new Float32Array(W * H)
  let r = 0, g = 0, b = 0
  for (let i = 0, p = 0; i < luma.length; i++, p += 4) {
    r += data[p]; g += data[p + 1]; b += data[p + 2]
    luma[i] = 0.2126 * data[p] + 0.7152 * data[p + 1] + 0.0722 * data[p + 2]
  }
  const n = luma.length

  const x0 = Math.floor(W * 0.3), x1 = Math.floor(W * 0.7)
  const y0 = Math.floor(H * 0.3), y1 = Math.floor(H * 0.7)
  let sum = 0, sum2 = 0, m = 0
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = y * W + x
      const lap = 4 * luma[i] - luma[i - 1] - luma[i + 1] - luma[i - W] - luma[i + W]
      sum += lap; sum2 += lap * lap; m++
    }
  }
  const round = (v, d = 2) => Math.round(v * 10 ** d) / 10 ** d
  return {
    pixels: src,
    luma: round(luma.reduce((a, v) => a + v, 0) / n),
    rgb: [round(r / n), round(g / n), round(b / n)],
    redOverBlue: round(r / b, 3),
    sharp: round(sum2 / m - (sum / m) ** 2),
  }
}
