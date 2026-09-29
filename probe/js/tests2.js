// v2 camera tests. Every test opens its own stream, resets it to auto, walks
// one axis through several values, and takes a photo at each. That fixes v1's
// leak where earlier manual values contaminated the photos taken afterwards.
import { parseExif } from './exif.js'
import { analyze } from './metrics.js'

export const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const EXIF_KEYS = ['ISO', 'ExposureTime', 'FNumber', 'FocalLength', 'FocalLengthIn35mm', 'ExposureBias', 'WhiteBalance', 'LensModel']

export async function open(video) {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: 'environment' }, width: { ideal: 4000 }, height: { ideal: 3000 } },
    audio: false,
  })
  video.srcObject = stream
  await video.play().catch(() => {})
  const track = stream.getVideoTracks()[0]
  return { stream, track, ic: new ImageCapture(track), caps: track.getCapabilities() }
}

export function close(h, video) {
  h.stream.getTracks().forEach((t) => t.stop())
  video.srcObject = null
}

export async function apply(track, constraint) {
  try {
    await track.applyConstraints({ advanced: [constraint] })
    return null
  } catch (err) {
    return `${err.name}: ${err.message}`
  }
}

export async function reset(h) {
  const { caps, track } = h
  const steps = [
    ['exposureMode', 'continuous'], ['focusMode', 'continuous'], ['whiteBalanceMode', 'continuous'],
    ['zoom', 1], ['exposureCompensation', 0], ['torch', false],
  ]
  for (const [k, v] of steps) if (caps[k] !== undefined) await apply(track, { [k]: v })
  await wait(800)
}

export async function shot(h, opts = {}) {
  await wait(opts.settle ?? 700)
  const settings = {}
  for (const k of opts.keys || []) settings[k] = h.track.getSettings()[k]
  try {
    const blob = await h.ic.takePhoto(opts.photo)
    const exif = await parseExif(blob)
    const tags = {}
    for (const k of EXIF_KEYS) if (exif.tags[k] !== undefined) tags[k] = exif.tags[k]
    const { luma, sharp, redOverBlue } = await analyze(blob)
    return { settings, kb: Math.round(blob.size / 1024), exif: tags, luma, sharp, redOverBlue }
  } catch (err) {
    return { settings, error: `${err.name}: ${err.message}` }
  }
}

// Run `body` against a fresh, reset camera; always release the camera.
export async function withCamera(video, body) {
  let h
  try {
    h = await open(video)
    await reset(h)
    return await body(h)
  } catch (err) {
    return { error: `${err.name}: ${err.message}` }
  } finally {
    if (h) close(h, video)
  }
}

export const quality = (video, say) => withCamera(video, async (h) => {
  const out = { streamSize: [h.track.getSettings().width, h.track.getSettings().height], photoCaps: await h.ic.getPhotoCapabilities().then((c) => JSON.parse(JSON.stringify(c))) }
  say('拍預設解析度')
  out.default = await shot(h)
  say('拍最大解析度')
  out.max = await shot(h, { photo: { imageWidth: out.photoCaps.imageWidth?.max, imageHeight: out.photoCaps.imageHeight?.max } })
  return out
})

// Does zoom switch lenses? FocalLength in EXIF and a jump in sharpness would say so.
export const zoomLens = (video, say) => withCamera(video, async (h) => {
  const out = []
  for (const z of [0.5, 1, 2, 3, 5, 10]) {
    say(`zoom ${z}`)
    await reset(h)
    const error = await apply(h.track, { zoom: z })
    out.push({ asked: z, applyError: error, ...(await shot(h)) })
  }
  return out
})

export const focus = (video, say) => withCamera(video, async (h) => {
  const out = { modeError: await apply(h.track, { focusMode: 'manual' }), shots: [] }
  const { min, max } = h.caps.focusDistance
  for (const d of [min, 0.1, 0.2, 0.5, 1, max]) {
    say(`focusDistance ${d}`)
    const error = await apply(h.track, { focusDistance: d })
    out.shots.push({ asked: d, applyError: error, ...(await shot(h, { settle: 1000 })) })
  }
  return out
})

export const exposureComp = (video, say) => withCamera(video, async (h) => {
  const out = []
  for (const ev of [-2, -1, 0, 1, 2]) {
    say(`EV ${ev}`)
    const error = await apply(h.track, { exposureCompensation: ev })
    out.push({ asked: ev, applyError: error, ...(await shot(h, { settle: 1000 })) })
  }
  return out
})

// exposureTime unit is 100 microseconds: 10 = 1 ms, 100 = 10 ms, 500 = 50 ms.
// v2 showed the photo stuck at the first manual exposureTime when mode and values
// were applied in separate calls, so compare (A) one combined call per value on a
// long-lived stream against (B) a fresh stream per value.
const EXPOSURES = [[100, 10], [100, 100], [100, 500], [400, 100], [1600, 100]]
const EXPOSURE_KEYS = ['iso', 'exposureTime', 'exposureMode']

export const manualExposure = async (video, say) => {
  const out = { A_sameStream: await withCamera(video, async (h) => {
    const shots = []
    for (const [iso, exposureTime] of EXPOSURES) {
      say(`A: ISO ${iso} / ${exposureTime * 0.1} ms`)
      const error = await apply(h.track, { exposureMode: 'manual', iso, exposureTime })
      shots.push({ asked: [iso, exposureTime], applyError: error, ...(await shot(h, { settle: 1500, keys: EXPOSURE_KEYS })) })
    }
    return shots
  }), B_freshStream: [] }
  for (const [iso, exposureTime] of EXPOSURES) {
    say(`B: ISO ${iso} / ${exposureTime * 0.1} ms`)
    out.B_freshStream.push(await withCamera(video, async (h) => {
      const error = await apply(h.track, { exposureMode: 'manual', iso, exposureTime })
      return { asked: [iso, exposureTime], applyError: error, ...(await shot(h, { settle: 1500, keys: EXPOSURE_KEYS })) }
    }))
  }
  return out
}

export const whiteBalance = (video, say) => withCamera(video, async (h) => {
  const shots = []
  for (const t of [2850, 4000, 5000, 7000]) {
    say(`色溫 ${t}`)
    const error = await apply(h.track, { whiteBalanceMode: 'manual', colorTemperature: t })
    shots.push({ asked: t, applyError: error, ...(await shot(h, { settle: 1000, keys: ['whiteBalanceMode', 'colorTemperature'] })) })
  }
  return shots
})
