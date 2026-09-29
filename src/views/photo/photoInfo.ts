// Shooting data of a stored photo as display rows. Absent values are omitted, never shown as unknown.
import type { CaptureResult } from '@/camera/types'
import type { ExifInfo, Lens, PhotoMeta } from '@/types'
import { formatIso, formatShutter } from '@/judge/format'
import { dataLabel, lensName, sourceName } from '@/copy/photo'

export interface DataRow {
  key: string
  label: string
  value: string
}

const pad = (n: number): string => String(n).padStart(2, '0')

/** "YYYY:MM:DD HH:MM:SS" -> "YYYY/MM/DD HH:MM"; null when it does not parse. */
export function formatExifTime(raw: string | undefined): string | null {
  const m = raw?.match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2})/)
  return m ? `${m[1]}/${m[2]}/${m[3]} ${m[4]}:${m[5]}` : null
}

export function formatTimestamp(ms: number): string {
  const d = new Date(ms)
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export const formatAperture = (f: number): string => `f/${Number(f.toFixed(1))}`
export const formatFocal = (mm: number): string => `${Math.round(mm)} mm`

export function lensLabel(lens: Lens): string | null {
  return lens === 'unknown' ? null : lensName[lens]
}

/** Rows shared by the photo viewer and the capture review (exif + lens only). */
export function exifRows(exif: ExifInfo, lens: Lens): DataRow[] {
  const rows: DataRow[] = []
  if (exif.exposureTime) rows.push({ key: 'shutter', label: dataLabel.shutter, value: formatShutter(exif.exposureTime) })
  if (exif.iso) rows.push({ key: 'iso', label: dataLabel.iso, value: String(Math.round(exif.iso)) })
  if (exif.fNumber) rows.push({ key: 'aperture', label: dataLabel.aperture, value: formatAperture(exif.fNumber) })
  const focal = exif.focalLength35 ?? exif.focalLength
  if (focal) rows.push({ key: 'focal', label: dataLabel.focal, value: formatFocal(focal) })
  const l = lensLabel(lens)
  if (l) rows.push({ key: 'lens', label: dataLabel.lens, value: l })
  return rows
}

export function photoRows(meta: PhotoMeta): DataRow[] {
  const rows = exifRows(meta.exif, meta.lens)
  const when = formatExifTime(meta.exif.dateTimeOriginal) ?? (meta.source === 'camera' ? formatTimestamp(meta.createdAt) : null)
  if (when) rows.push({ key: 'time', label: dataLabel.time, value: when })
  rows.push({ key: 'source', label: dataLabel.source, value: sourceName[meta.source] })
  return rows
}

/** Rows for the capture review: EXIF when present, else the applied values reported by the engine. */
export function reviewRows(exif: ExifInfo, lens: Lens, applied: CaptureResult['applied']): DataRow[] {
  const merged: ExifInfo = {
    ...exif,
    exposureTime: exif.exposureTime ?? applied.shutterSec,
    iso: exif.iso ?? applied.iso,
  }
  return exifRows(merged, lens)
}

/** Short caption for the comparison view: shutter and ISO when known. */
export function captionOf(meta: PhotoMeta): string {
  const parts: string[] = []
  if (meta.exif.exposureTime) parts.push(`${dataLabel.shutter} ${formatShutter(meta.exif.exposureTime)}`)
  if (meta.exif.iso) parts.push(formatIso(meta.exif.iso))
  return parts.join('　')
}
