// Thin seam between the capture logic and the browser. The real implementation is
// webDevice.ts; tests inject a fake so the retry logic runs without a camera or timers.

/** One entry of `{ advanced: [...] }`. Own type: lib.dom lags behind the fields Chrome exposes. */
export type ConstraintSet = Record<string, string | number | boolean>

/** Subset of track.getSettings() the engine reads back. exposureTime is in Web API units. */
export interface DeviceSettings {
  iso?: number
  exposureTime?: number
  exposureCompensation?: number
  colorTemperature?: number
  zoom?: number
  focusDistance?: number
}

export interface Device {
  /** Apply one constraint set; rejects on a platform error. */
  apply(set: ConstraintSet): Promise<void>
  takePhoto(): Promise<Blob>
  settings(): DeviceSettings
  /** Stop the stream and open a fresh one (the only cure for a stuck exposure). */
  reopen(): Promise<void>
  sleep(ms: number): Promise<void>
}
