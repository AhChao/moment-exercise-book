// Contract of the sheet export (implemented in src/share/). Sharing a practice page as one long
// image, or several pages as a PDF, without any server: the page is laid out as a display list
// (pure, unit-tested) and painted with Canvas 2D (thin browser glue).
import type { Attempt, Exercise, PhotoMeta } from '@/types'

/** Colours and fonts, resolved from the CSS tokens at export time (src/styles/tokens.css). */
export interface SheetTheme {
  paper: string
  paperLight: string
  ink: string
  inkSoft: string
  inkFaint: string
  accent: string
  film: string
  green: string
  yellow: string
  fontBody: string
  fontHand: string
  fontMono: string
}

export interface SheetOptions {
  includeNotes: boolean
  includeShootingData: boolean
  /** shown in the footer, for example the export date; empty = no date */
  footerDate: string
}

/** Everything the layout needs to know about one exercise, already reduced to display text. */
export interface SheetContent {
  chapterTitle: string
  title: string
  level: number
  concept: string | null
  goal: string
  scene: string
  fixed: string[]
  frames: SheetFrameInfo[]
  predictions: string[]
  /** the learner's answer to each prediction prompt, same length as predictions ('' when blank or notes are off) */
  predictionNotes: string[]
  observeQuestions: string[]
  observeNotes: string
  reflectPrompts: { prompt: string; note: string }[]
  /** pass / fail lines already formatted for reading; empty when nothing was judged */
  results: string[]
  completed: boolean
  footer: string
  /** true when the learner's notes are part of the sheet: blank notes still get ruled writing lines */
  includeNotes: boolean
}

export interface SheetFrameInfo {
  label: string
  /** shooting data line such as "快門 1/125　ISO 400"; empty when hidden or unknown */
  caption: string
  /** width / height of the displayed photo; 3/4 when there is no photo */
  aspect: number
  hasPhoto: boolean
}

export interface SheetGeometry {
  pageWidth: number
  /** fixed page height for PDF pages; 'auto' = one page as tall as the content needs */
  pageHeight: number | 'auto'
  margin: number
}

/** Measures text so layout stays pure and testable (the browser implementation uses canvas measureText). */
export interface TextMeasurer {
  width(text: string, font: string): number
}

// ── display list ──────────────────────────────────────────────────────────

export type DisplayOp =
  | { op: 'rect'; x: number; y: number; w: number; h: number; fill?: string; stroke?: string; lineWidth?: number; dashed?: boolean; radius?: number }
  | { op: 'line'; x1: number; y1: number; x2: number; y2: number; stroke: string; lineWidth: number; wavy?: boolean }
  /** y is the alphabetic baseline (canvas default); left aligned unless align is given */
  | { op: 'text'; x: number; y: number; text: string; font: string; color: string; align?: 'left' | 'center' | 'right' }
  /** Fills the frame at index with its photo (cover-fit, already the right aspect); no photo = the frame is drawn empty. */
  | { op: 'photo'; frame: number; x: number; y: number; w: number; h: number }
  /** x,y is the CENTRE of the stamp, rotated -5 degrees about it */
  | { op: 'stamp'; x: number; y: number; text: string; color: string }
  | { op: 'strip'; x: number; y: number; w: number; h: number }

export interface SheetPage {
  width: number
  height: number
  ops: DisplayOp[]
}

/** Resolved fonts/colours are referenced by name so layout does not depend on CSS. */
export interface SheetFonts {
  title: string
  heading: string
  body: string
  note: string
  mono: string
}

export interface SheetLayoutInput {
  content: SheetContent
  geometry: SheetGeometry
  theme: SheetTheme
  measurer: TextMeasurer
}

/** Pure: content + geometry -> pages of drawing operations. */
export type LayoutSheet = (input: SheetLayoutInput) => SheetPage[]

export interface RenderedPage {
  jpeg: Uint8Array
  width: number
  height: number
}

/** Pure: assembles JPEG pages into a PDF file (one image per page, page size = image size in points). */
export type BuildPdf = (pages: RenderedPage[], meta: { title: string; createdIso: string }) => Uint8Array

export interface SheetSource {
  exercise: Exercise
  chapterTitle: string
  attempt: Attempt | undefined
  photos: (PhotoMeta | null)[]
}
