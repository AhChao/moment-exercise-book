/** Whether this browser can shoot inside the app at all (camera stream plus still capture). */
export function canShootInApp(env: { hasImageCapture: boolean; hasGetUserMedia: boolean }): boolean {
  return env.hasImageCapture && env.hasGetUserMedia
}

export function detectShootSupport(): boolean {
  return canShootInApp({
    hasImageCapture: typeof ImageCapture !== 'undefined',
    hasGetUserMedia: typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia,
  })
}
