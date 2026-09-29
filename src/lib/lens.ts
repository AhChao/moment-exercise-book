import type { ExifInfo, Lens } from '@/types'

/**
 * Which physical camera took a photo, from EXIF alone. Measured on a Pixel 10:
 *   ultrawide  FocalLength 1.854 mm, 35mm-equiv 14
 *   main       FocalLength 4.53 mm,  35mm-equiv 24  (2x-4x digital crops keep the main lens)
 *   tele       FocalLength 14.2 mm   (35mm-equiv about 120; only present when the tele sensor was used)
 * A phone camera app may fall back to a main-lens crop for "5x" in low light, so tele is only
 * reported when the EXIF says so. `facing` distinguishes the selfie camera, which EXIF does not.
 */
export function detectLens(exif: ExifInfo, facing: 'user' | 'environment' = 'environment'): Lens {
  if (facing === 'user') return 'front'

  const eq = exif.focalLength35
  if (eq !== undefined && eq > 0) {
    if (eq <= 16) return 'ultrawide'
    if (eq >= 80) return 'tele'
    return 'main'
  }

  const mm = exif.focalLength ?? mmFromLensModel(exif.lensModel)
  if (mm === undefined || mm <= 0) return 'unknown'
  if (mm < 3) return 'ultrawide'
  if (mm < 9) return 'main'
  return 'tele'
}

function mmFromLensModel(model: string | undefined): number | undefined {
  const m = model?.match(/(\d+(?:\.\d+)?)\s*mm/i)
  return m ? Number(m[1]) : undefined
}
