// v3: the remaining unknowns that block building the app. Each test is one
// question the app design depends on.
import { open, close, apply, reset, shot, wait, withCamera } from './tests2.js'

const KEYS = ['iso', 'exposureTime', 'exposureMode']
const now = () => performance.now()
const ms = (t) => Math.round(now() - t)
const fail = (err) => ({ error: `${err.name}: ${err.message}` })

// Q1: is the shutter honoured across the range the exercises need (1/500 .. 1 s),
// and how long does one fresh-stream shot take? Retries once on platform error.
export const shutterLadder = async (video, say) => {
  const out = []
  for (const sec of [1 / 500, 1 / 125, 1 / 30, 1 / 15, 1 / 4, 1]) {
    const units = Math.max(1, Math.round(sec * 10000))
    say(`快門 ${sec >= 1 ? sec + ' s' : '1/' + Math.round(1 / sec)}`)
    for (let attempt = 1; attempt <= 2; attempt++) {
      const t = now()
      const r = await withCamera(video, async (h) => {
        const error = await apply(h.track, { exposureMode: 'manual', iso: 100, exposureTime: units })
        return { applyError: error, ...(await shot(h, { settle: 1500, keys: KEYS })) }
      })
      out.push({ askedSec: sec, attempt, totalMs: ms(t), ...r })
      if (!r.error) break
    }
  }
  return out
}

// Q2: can we switch values on ONE stream by dropping back to auto in between?
// If yes the app avoids reopening the camera for every shot.
export const toggleStrategy = (video, say) => withCamera(video, async (h) => {
  const shots = []
  for (const [iso, units] of [[100, 100], [400, 100], [100, 500], [1600, 100], [100, 20]]) {
    say(`ISO ${iso} / ${units / 10} ms`)
    const t = now()
    await apply(h.track, { exposureMode: 'continuous' })
    await wait(600)
    const error = await apply(h.track, { exposureMode: 'manual', iso, exposureTime: units })
    shots.push({ asked: [iso, units], applyError: error, ...(await shot(h, { settle: 1500, keys: KEYS })), totalMs: ms(t) })
  }
  return shots
})

// Q3: does the live preview reflect manual exposure (what you see is what you get)?
function previewLuma(video) {
  const c = new OffscreenCanvas(64, 64)
  const ctx = c.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(video, 0, 0, 64, 64)
  const d = ctx.getImageData(0, 0, 64, 64).data
  let sum = 0
  for (let i = 0; i < d.length; i += 4) sum += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]
  return Math.round((sum / (d.length / 4)) * 100) / 100
}

export const previewWysiwyg = async (video, say) => {
  const out = []
  for (const [iso, units] of [[100, 20], [100, 200], [800, 200]]) {
    say(`ISO ${iso} / ${units / 10} ms`)
    out.push(await withCamera(video, async (h) => {
      const error = await apply(h.track, { exposureMode: 'manual', iso, exposureTime: units })
      await wait(1500)
      const preview = previewLuma(video)
      const photo = await shot(h, { settle: 200, keys: KEYS })
      return { asked: [iso, units], applyError: error, previewLuma: preview, photoLuma: photo.luma, exif: photo.exif, error: photo.error }
    }))
  }
  return out
}

// Q4: Kelvin values the exercises use, one fresh stream per shot.
export const whiteBalanceK = async (video, say) => {
  const out = []
  for (const k of [3000, 4500, 6000]) {
    say(`${k}K`)
    out.push(await withCamera(video, async (h) => {
      const error = await apply(h.track, { whiteBalanceMode: 'manual', colorTemperature: k })
      return { asked: k, applyError: error, ...(await shot(h, { settle: 1500, keys: ['whiteBalanceMode', 'colorTemperature'] })) }
    }))
  }
  return out
}

// Q5: can the phone run a shadows adjustment on a full 12 MP photo, and how?
const SHADOWS_FRAG = `precision highp float;
uniform sampler2D t; uniform float s; varying vec2 v;
void main() { vec4 c = texture2D(t, v);
  float l = dot(c.rgb, vec3(.2126, .7152, .0722));
  gl_FragColor = vec4(clamp(c.rgb * (1. + s * pow(1. - l, 2.)), 0., 1.), c.a); }`

async function timeCanvas2d(bmp) {
  const t = now()
  const c = new OffscreenCanvas(bmp.width, bmp.height)
  const ctx = c.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(bmp, 0, 0)
  const img = ctx.getImageData(0, 0, bmp.width, bmp.height)
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    const l = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255
    const g = 1 + 0.5 * (1 - l) * (1 - l)
    d[i] = Math.min(255, d[i] * g); d[i + 1] = Math.min(255, d[i + 1] * g); d[i + 2] = Math.min(255, d[i + 2] * g)
  }
  ctx.putImageData(img, 0, 0)
  const processMs = ms(t)
  const t2 = now()
  const blob = await c.convertToBlob({ type: 'image/jpeg', quality: 0.92 })
  return { processMs, encodeMs: ms(t2), kb: Math.round(blob.size / 1024) }
}

async function timeWebGl(bmp) {
  const t = now()
  const c = new OffscreenCanvas(bmp.width, bmp.height)
  const gl = c.getContext('webgl2') || c.getContext('webgl')
  if (!gl) return { error: 'no webgl' }
  const compile = (type, src) => { const sh = gl.createShader(type); gl.shaderSource(sh, src); gl.compileShader(sh); return sh }
  const prog = gl.createProgram()
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, 'attribute vec2 p; varying vec2 v; void main(){ v = p * .5 + .5; v.y = 1. - v.y; gl_Position = vec4(p, 0., 1.); }'))
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, SHADOWS_FRAG))
  gl.linkProgram(prog)
  gl.useProgram(prog)
  const buf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
  const loc = gl.getAttribLocation(prog, 'p')
  gl.enableVertexAttribArray(loc)
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
  const tex = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, tex)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bmp)
  gl.uniform1f(gl.getUniformLocation(prog, 's'), 0.5)
  gl.viewport(0, 0, bmp.width, bmp.height)
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4))
  const processMs = ms(t)
  const t2 = now()
  const blob = await c.convertToBlob({ type: 'image/jpeg', quality: 0.92 })
  return { maxTexture: gl.getParameter(gl.MAX_TEXTURE_SIZE), webgl2: typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext, processMs, encodeMs: ms(t2), kb: Math.round(blob.size / 1024) }
}

export const develop = (video, say) => withCamera(video, async (h) => {
  say('拍一張')
  const blob = await h.ic.takePhoto()
  const t = now()
  const bmp = await createImageBitmap(blob)
  const out = { px: [bmp.width, bmp.height], decodeMs: ms(t) }
  say('Canvas 2D')
  out.canvas2d = await timeCanvas2d(bmp).catch(fail)
  say('WebGL')
  out.webgl = await timeWebGl(bmp).catch(fail)
  bmp.close()
  return out
})

// Q6: a session's worth of photos in IndexedDB: 30 x ~3 MB, then clean up our own db.
export const idbStress = async () => {
  const name = 'probe-stress'
  try {
    const db = await new Promise((res, rej) => {
      const r = indexedDB.open(name, 1)
      r.onupgradeneeded = () => r.result.createObjectStore('p')
      r.onsuccess = () => res(r.result)
      r.onerror = () => rej(r.error)
    })
    const tx = (mode) => db.transaction('p', mode).objectStore('p')
    const done = (req) => new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error) })
    const t = now()
    for (let i = 0; i < 30; i++) await done(tx('readwrite').put(new Blob([new Uint8Array(3 * 1024 * 1024)], { type: 'image/jpeg' }), `k${i}`))
    const writeMs = ms(t)
    const t2 = now()
    let bytes = 0
    for (let i = 0; i < 30; i++) bytes += (await done(tx('readonly').get(`k${i}`))).size
    const readMs = ms(t2)
    const estimate = await navigator.storage.estimate()
    db.close()
    await new Promise((res) => { const r = indexedDB.deleteDatabase(name); r.onsuccess = res; r.onerror = res; r.onblocked = res })
    return { writeMs, readMs, bytes, usage: estimate.usage, quota: estimate.quota }
  } catch (err) {
    return fail(err)
  }
}
