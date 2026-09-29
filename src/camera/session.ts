import type { CaptureSpec } from '@/types'
import { CameraError } from './types'
import type { CameraSession, CapturePhase, CaptureResult, Capabilities } from './types'
import type { Device } from './device'
import { normalizeCapabilities } from './capabilities'
import { buildPreviewConstraints } from './constraints'
import { captureWithDevice } from './capture'
import { openWebDevice } from './webDevice'
import type { WebDevice } from './webDevice'

interface SessionDevice extends Device {
  attach(video: HTMLVideoElement): Promise<void>
  close(): void
}

/** Session over any device; openCamera wires the real one. Exported for tests. */
export function createSession(device: SessionDevice, capabilities: Capabilities): CameraSession {
  let closed = false
  // Every operation on the stream runs through one chain, so capture and preview never interleave.
  let tail: Promise<unknown> = Promise.resolve()
  const serial = <T>(fn: () => Promise<T>): Promise<T> => {
    const run = tail.then(fn)
    tail = run.catch(() => {})
    return run
  }
  const ensureOpen = (): void => {
    if (closed) throw new CameraError('failed', 'camera is closed')
  }

  return {
    capabilities,
    attach: (video) => {
      ensureOpen()
      return device.attach(video)
    },
    preview: (spec: CaptureSpec) =>
      serial(async () => {
        if (closed) return
        for (const set of buildPreviewConstraints(spec, capabilities)) {
          try {
            await device.apply(set)
          } catch {
            // preview is best effort
          }
        }
      }),
    capture: (spec: CaptureSpec, onPhase?: (phase: CapturePhase) => void): Promise<CaptureResult> =>
      serial(() => {
        ensureOpen()
        return captureWithDevice(device, spec, capabilities, onPhase)
      }),
    close: () => {
      if (closed) return
      closed = true
      device.close()
    },
  }
}

export async function openCamera(): Promise<CameraSession> {
  const device: WebDevice = await openWebDevice()
  return createSession(device, normalizeCapabilities(device.rawCapabilities, device.label))
}
