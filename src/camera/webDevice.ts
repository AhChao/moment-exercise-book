// The only file that touches MediaStream / ImageCapture. Keep it thin: logic lives elsewhere.
import { CameraError } from './types'
import type { Device, ConstraintSet, DeviceSettings } from './device'

export interface WebDevice extends Device {
  readonly rawCapabilities: object
  readonly label: string
  attach(video: HTMLVideoElement): Promise<void>
  close(): void
}

const VIDEO = { facingMode: { ideal: 'environment' }, width: { ideal: 4000 }, height: { ideal: 3000 } }

function toCameraError(e: unknown): CameraError {
  const name = e instanceof Error ? e.name : ''
  const text = e instanceof Error ? e.message : String(e)
  if (name === 'NotAllowedError' || name === 'SecurityError' || name === 'PermissionDeniedError') return new CameraError('denied', text)
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError' || name === 'OverconstrainedError') return new CameraError('unavailable', text)
  return new CameraError('failed', text)
}

interface Handle {
  stream: MediaStream
  track: MediaStreamTrack
  ic: ImageCapture
}

async function openHandle(): Promise<Handle> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: VIDEO, audio: false })
    const track = stream.getVideoTracks()[0]
    return { stream, track, ic: new ImageCapture(track) }
  } catch (e) {
    throw toCameraError(e)
  }
}

export async function openWebDevice(): Promise<WebDevice> {
  if (typeof ImageCapture === 'undefined') throw new CameraError('unsupported', 'ImageCapture is not available')
  if (!navigator.mediaDevices?.getUserMedia) throw new CameraError('unavailable', 'no camera API')
  let h = await openHandle()
  let video: HTMLVideoElement | null = null
  const raw = h.track.getCapabilities() as object
  const label = h.track.label

  const bind = async (): Promise<void> => {
    if (!video) return
    video.srcObject = h.stream
    await video.play().catch(() => {})
  }
  const stop = (): void => h.stream.getTracks().forEach((t) => t.stop())

  return {
    rawCapabilities: raw,
    label,
    attach: async (el) => {
      video = el
      await bind()
    },
    apply: (set: ConstraintSet) => h.track.applyConstraints({ advanced: [set] } as MediaTrackConstraints),
    takePhoto: () => h.ic.takePhoto(),
    settings: () => h.track.getSettings() as unknown as DeviceSettings,
    reopen: async () => {
      stop()
      h = await openHandle()
      await bind()
    },
    sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
    close: () => {
      stop()
      if (video) video.srcObject = null
    },
  }
}
