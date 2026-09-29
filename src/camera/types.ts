// Contract of the camera engine (implemented in src/camera/session.ts).
// UI code depends on this file only, never on MediaStream / ImageCapture directly.
import type { AppliedSettings, CaptureSpec } from '@/types'

export interface RangeCap {
  min: number
  max: number
  step: number
}

/** Normalised view of what the phone's browser exposes. Units are app units, not the Web API's. */
export interface Capabilities {
  /** false when the camera could not be opened or was denied */
  available: boolean
  label?: string
  zoom?: RangeCap
  iso?: RangeCap
  /** seconds (the Web API uses units of 100 microseconds; the engine converts) */
  shutterSec?: RangeCap
  ev?: RangeCap
  wbKelvin?: RangeCap
  focusMeters?: RangeCap
  torch: boolean
  /** true only when iso AND shutter AND a manual exposure mode are all exposed */
  canManualExposure: boolean
  canManualWB: boolean
  canManualFocus: boolean
}

export type CapturePhase = 'preparing' | 'settling' | 'shooting' | 'verifying' | 'retrying'

export interface CaptureResult {
  blob: Blob
  /** values read back from the track / EXIF after the shot */
  applied: AppliedSettings
  /** false when manual exposure was requested and EXIF did not confirm it after all retries */
  verified: boolean
  /** number of shooting attempts used (1..3) */
  attempts: number
  /** set when verified is false: which value did not match */
  mismatch?: string
}

export type CameraErrorCode = 'denied' | 'unavailable' | 'unsupported' | 'failed'

export class CameraError extends Error {
  constructor(public code: CameraErrorCode, message: string) {
    super(message)
    this.name = 'CameraError'
  }
}

export interface CameraSession {
  readonly capabilities: Capabilities
  /** Bind the live preview. Resolves once frames are flowing. */
  attach(video: HTMLVideoElement): Promise<void>
  /**
   * Live preview only (no photo). Applies the spec so the preview matches what will be shot;
   * measured on a Pixel 10: preview brightness tracks the photo within about 1.5 luma.
   * null fields fall back to the phone's automatic behaviour.
   */
  preview(spec: CaptureSpec): Promise<void>
  /**
   * Take one photo with the spec. When shutter or ISO is prescribed the engine runs the verified
   * sequence: back to auto, wait 600 ms, apply mode+values in ONE call, wait 1500 ms, takePhoto,
   * read EXIF back (tolerance 5 %), and on mismatch or platform error reopen the stream and retry
   * (up to 3 attempts). Never rejects for a mismatch; rejects with CameraError for hard failures.
   */
  capture(spec: CaptureSpec, onPhase?: (phase: CapturePhase) => void): Promise<CaptureResult>
  close(): void
}
