// Each test is async and returns a plain JSON-able object. Tests never throw:
// failures are reported as { error } so one bad API doesn't hide the rest.
import { parseExif, imageSize } from './exif.js'

const safe = async (fn) => {
  try { return await fn() } catch (err) { return { error: `${err.name}: ${err.message}` } }
}
const plain = (o) => JSON.parse(JSON.stringify(o ?? null))

export const env = () => safe(async () => {
  const uad = navigator.userAgentData
  const high = uad ? await uad.getHighEntropyValues(['model', 'platformVersion', 'fullVersionList']) : null
  return {
    isSecureContext: window.isSecureContext,
    userAgent: navigator.userAgent,
    uaData: plain(high),
    screen: { w: screen.width, h: screen.height, dpr: devicePixelRatio },
    displayModeStandalone: matchMedia('(display-mode: standalone)').matches,
    serviceWorker: 'serviceWorker' in navigator,
    imageCaptureDefined: typeof ImageCapture !== 'undefined',
    supportedConstraints: plain(navigator.mediaDevices?.getSupportedConstraints?.()),
  }
})

export const storage = () => safe(async () => {
  const before = { persisted: await navigator.storage.persisted(), estimate: plain(await navigator.storage.estimate()) }
  const persistGranted = await navigator.storage.persist()
  const size = 10 * 1024 * 1024
  const blob = new Blob([new Uint8Array(size)], { type: 'image/jpeg' })
  const db = await new Promise((res, rej) => {
    const r = indexedDB.open('probe', 1)
    r.onupgradeneeded = () => r.result.createObjectStore('b')
    r.onsuccess = () => res(r.result)
    r.onerror = () => rej(r.error)
  })
  await new Promise((res, rej) => { const t = db.transaction('b', 'readwrite'); t.objectStore('b').put(blob, 'k'); t.oncomplete = res; t.onerror = () => rej(t.error) })
  const back = await new Promise((res, rej) => { const g = db.transaction('b').objectStore('b').get('k'); g.onsuccess = () => res(g.result); g.onerror = () => rej(g.error) })
  db.close()
  return { before, persistGranted, persistedAfter: await navigator.storage.persisted(), idbBlobRoundTrip: { wrote: blob.size, read: back?.size, type: back?.type, expected: size } }
})

const CONTINUOUS_KEYS = ['zoom', 'exposureCompensation', 'iso', 'exposureTime', 'focusDistance', 'colorTemperature', 'brightness', 'contrast', 'saturation', 'sharpness']
const MODE_KEYS = { exposureMode: 'manual', focusMode: 'manual', whiteBalanceMode: 'manual' }

// Ask for a value, then read getSettings() back: "in capabilities" is not the
// same as "the setting actually moved".
async function tryApply(track, constraint) {
  const key = Object.keys(constraint)[0]
  const before = track.getSettings()[key]
  try {
    await track.applyConstraints({ advanced: [constraint] })
    return { asked: constraint[key], before, after: track.getSettings()[key], moved: track.getSettings()[key] !== before }
  } catch (err) {
    return { asked: constraint[key], before, error: `${err.name}: ${err.message}` }
  }
}

async function probeTrack(track) {
  const caps = track.getCapabilities?.() ?? {}
  const apply = {}
  for (const k of CONTINUOUS_KEYS) {
    const c = caps[k]
    if (c && typeof c === 'object' && 'min' in c) {
      const mid = c.min + (c.max - c.min) * 0.5
      apply[k] = await tryApply(track, { [k]: mid })
    } else apply[k] = c === undefined ? 'absent' : c
  }
  for (const [k, v] of Object.entries(MODE_KEYS)) {
    apply[k] = caps[k] ? { modes: caps[k], ...(caps[k].includes(v) ? await tryApply(track, { [k]: v }) : {}) } : 'absent'
  }
  apply.torch = caps.torch ? await tryApply(track, { torch: true }) : 'absent'
  if (caps.torch) await tryApply(track, { torch: false })
  return { label: track.label, capabilities: plain(caps), settings: plain(track.getSettings()), apply }
}

export const webCamera = (videoEl) => safe(async () => {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: 'environment' }, width: { ideal: 4032 }, height: { ideal: 3024 } },
    audio: false,
  })
  videoEl.srcObject = stream
  await videoEl.play().catch(() => {})
  const track = stream.getVideoTracks()[0]
  const result = { track: await probeTrack(track) }

  if (typeof ImageCapture !== 'undefined') {
    const ic = new ImageCapture(track)
    result.photoCapabilities = await safe(async () => plain(await ic.getPhotoCapabilities()))
    result.photoSettings = await safe(async () => plain(await ic.getPhotoSettings()))
    result.takePhotoDefault = await safe(async () => {
      const blob = await ic.takePhoto()
      return { type: blob.type, exif: await parseExif(blob), size: await imageSize(blob) }
    })
    result.takePhotoMaxRes = await safe(async () => {
      const pc = await ic.getPhotoCapabilities()
      const blob = await ic.takePhoto({ imageWidth: pc.imageWidth?.max, imageHeight: pc.imageHeight?.max })
      return { asked: [pc.imageWidth?.max, pc.imageHeight?.max], type: blob.type, exif: await parseExif(blob), size: await imageSize(blob) }
    })
    // Does a manual ISO / shutter set on the track survive into the JPEG's EXIF?
    const caps = track.getCapabilities?.() ?? {}
    if (caps.iso && caps.exposureTime && caps.exposureMode?.includes('manual')) {
      result.manualRoundTrip = await safe(async () => {
        const iso = Math.max(caps.iso.min, 100)
        const exposureTime = Math.min(Math.max(caps.exposureTime.min, 100), caps.exposureTime.max)
        await track.applyConstraints({ advanced: [{ exposureMode: 'manual', iso, exposureTime }] })
        const blob = await ic.takePhoto()
        const exif = await parseExif(blob)
        return { asked: { iso, exposureTimeUnits: exposureTime }, settingsAfter: plain(track.getSettings()), exifISO: exif.tags.ISO, exifExposureTime: exif.tags.ExposureTime, hasExif: exif.hasExif }
      })
    } else {
      result.manualRoundTrip = 'skipped: iso/exposureTime/manual exposureMode not all in capabilities'
    }
  }
  stream.getTracks().forEach((t) => t.stop())
  videoEl.srcObject = null
  return result
})

export const lenses = () => safe(async () => {
  const devices = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput')
  const out = []
  for (const d of devices) {
    out.push(await safe(async () => {
      const s = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: d.deviceId } } })
      const t = s.getVideoTracks()[0]
      const r = { label: d.label, facingMode: t.getSettings().facingMode, zoom: t.getCapabilities?.().zoom, size: [t.getSettings().width, t.getSettings().height] }
      s.getTracks().forEach((x) => x.stop())
      return r
    }))
  }
  return { count: devices.length, devices: out }
})

// Result of the <input type=file>. Compact on purpose: the report is pasted by hand.
export async function inspectFile(file) {
  const exif = await parseExif(file)
  const { width, height } = await imageSize(file)
  return {
    name: file.name, kb: Math.round(file.size / 1024), px: [width, height],
    modified: new Date(file.lastModified).toISOString(),
    hasExif: exif.hasExif, gps: exif.gps, tags: exif.tags,
    extraMarkers: exif.markers.filter((m) => /MPF|http|JP/.test(m)).length,
  }
}
