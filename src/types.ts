// Single source of truth for the domain model. Every module imports these;
// do not redeclare a second copy of any shape.

// ── Exercise content (content/exercises/*.json) ────────────────────────────

export type Level = 1 | 2 | 3

/** Target settings for one shot. null = not prescribed (phone auto, or the learner's own choice). */
export interface CaptureSpec {
  shutterSec: number | null
  iso: number | null
  /** exposure compensation in EV; only meaningful while shutterSec and iso are both null */
  ev: number | null
  wbKelvin: number | null
  /** 0.5 = ultrawide (cannot be shot in-app), 1 = main, >= 5 = telephoto */
  zoom: number | null
  focusMeters: number | null
}

/** Post-shot adjustment, each -100..100. 0 = untouched. */
export interface DevelopSpec {
  shadows: number
  highlights: number
  exposure: number
  warmth: number
}

export type Need =
  | 'manualExposure' | 'exposureComp' | 'manualWB' | 'manualFocus'
  | 'tele' | 'ultrawide' | 'develop' | 'tripodOrRest' | 'night'
  | 'person' | 'movingSubject'

export interface Shot {
  label: string
  capture: CaptureSpec
  develop: DevelopSpec | null
  hint: string
  /**
   * Brightness of this shot in stops relative to a properly exposed picture of the SAME scene
   * (0 = properly exposed, -2 = two stops darker, +2 = two stops brighter). It only applies when
   * exactly one of shutterSec / iso is prescribed: the app meters the scene for the free one and
   * scales it by 2^stops (one stop = doubling of ISO or of the shutter time). Absent = 0.
   * Prescribing both shutterSec and iso is an "absolute" shot and this field is ignored.
   */
  exposureStops?: number
}

export type CheckField = 'iso' | 'shutterSec' | 'focalLength35' | 'lens'
export type CheckOp = '<=' | '>=' | '==' | 'between'

export interface Check {
  shot: number
  field: CheckField
  op: CheckOp
  value: number | string | [number, number]
}

export interface Exercise {
  id: string
  title: string
  level: Level
  goal: string
  scene: string
  fixed: string[]
  shots: Shot[]
  /** Two or three sentences of core idea shown above the goal (the mental model). Optional. */
  concept?: string
  /** Prompts answered BEFORE shooting ("which frame will be brightest?"). Optional. */
  predict?: string[]
  observe: string[]
  reflect: string[]
  needs: Need[]
  checks: Check[]
  sources: string[]
}

export interface Chapter {
  id: string
  order: number
  title: string
  blurb: string
  level: Level
}

export interface ChapterFile {
  chapter: Chapter
  exercises: Exercise[]
}

// ── Photos ─────────────────────────────────────────────────────────────────

export type Lens = 'ultrawide' | 'main' | 'tele' | 'front' | 'unknown'

/** Tags read from a JPEG's EXIF. Any field may be absent. */
export interface ExifInfo {
  hasExif: boolean
  hasGps: boolean
  make?: string
  model?: string
  /** EXIF orientation 1..8 */
  orientation?: number
  iso?: number
  /** seconds */
  exposureTime?: number
  fNumber?: number
  /** mm */
  focalLength?: number
  /** 35mm-equivalent, mm */
  focalLength35?: number
  /** EV, only present in files written by a camera app (not by takePhoto) */
  exposureBias?: number
  lensModel?: string
  /** "YYYY:MM:DD HH:MM:SS" as stored */
  dateTimeOriginal?: string
  /** 0 auto, 1 manual */
  whiteBalance?: number
}

/** What the app asked for and what the track reported when the photo was taken. */
export interface AppliedSettings {
  shutterSec?: number
  iso?: number
  ev?: number
  wbKelvin?: number
  zoom?: number
  focusMeters?: number
}

export interface PhotoMeta {
  id: string
  createdAt: number
  source: 'camera' | 'import'
  /** displayed size, after applying EXIF orientation */
  width: number
  height: number
  bytes: number
  exif: ExifInfo
  applied: AppliedSettings
  lens: Lens
  develop: DevelopSpec
}

export const NO_DEVELOP: DevelopSpec = { shadows: 0, highlights: 0, exposure: 0, warmth: 0 }

// ── Practice progress ──────────────────────────────────────────────────────

export interface Attempt {
  exerciseId: string
  /** photo id per shot slot, same length as exercise.shots */
  slots: (string | null)[]
  observeNotes: string
  /** one entry per exercise.reflect prompt */
  reflectNotes: string[]
  /** one entry per exercise.predict prompt; absent on attempts saved before predictions existed */
  predictNotes?: string[]
  updatedAt: number
  completedAt: number | null
}

// ── Judging ────────────────────────────────────────────────────────────────

export type CheckStatus = 'pass' | 'fail' | 'unknown'

export interface CheckResult {
  check: Check
  status: CheckStatus
  /** human-readable measured value, e.g. "ISO 200" or "1/125"; absent when unknown */
  actual?: string
}
