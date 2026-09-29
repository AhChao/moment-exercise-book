// Every size and spacing of the sheet, as multiples of the base unit s = pageWidth / 28
// (the body text size). Layout code never uses a bare pixel number.
import type { SheetLayoutInput, SheetTheme, TextMeasurer } from '../types'

export const BASE_DIVISOR = 28

/** Font sizes, in units of s. */
export const SIZE = {
  body: 1,
  title: 1.8,
  chapter: 0.62,
  section: 0.95,
  cardHeading: 0.85,
  chip: 0.7,
  caption: 0.62,
  frameLabel: 0.95,
  note: 1.05,
  footer: 0.6,
  header: 0.62,
  empty: 0.75,
} as const

/** Line height as a multiple of the font size. */
export const LEADING = { body: 1.65, title: 1.3, small: 1.4 } as const

/** Spacing, in units of s. */
export const SPACE = {
  gap: 0.8,
  section: 1.5,
  pad: 0.8,
  chipPadX: 0.55,
  chipPadY: 0.3,
  chipGap: 0.5,
  ruledPitch: 2.05,
  ruledMinLines: 2,
  ruledBaselineLift: 0.3,
  frameGutter: 0.9,
  framePad: 0.6,
  frameAreaRatio: 1.25,
  frameSoloWidth: 0.7,
  tapeWidthRatio: 0.28,
  tapeHeight: 1.1,
  dot: 0.5,
  dotGap: 0.35,
  bullet: 0.32,
  indent: 1.1,
  ruleHeight: 0.9,
  footer: 2.2,
  header: 2.6,
  stamp: 5.6,
  stampRadius: 2.4,
  radius: 0.25,
  hairline: 0.06,
} as const

export const TAPE_ALPHA = 0.6

export interface Fonts {
  body: string
  title: string
  chapter: string
  section: string
  cardHeading: string
  chip: string
  caption: string
  frameLabel: string
  note: string
  footer: string
  header: string
  empty: string
}

export interface Ctx {
  s: number
  theme: SheetTheme
  measurer: TextMeasurer
  pageWidth: number
  margin: number
  /** left edge and width of the content column */
  x0: number
  w: number
  f: Fonts
}

export const fontOf = (px: number, family: string): string => `${Math.round(px * 10) / 10}px ${family}`

/** Baseline offset inside a line box of height size * leading (text is centred, ascent ~ 0.85 em). */
export const baselineIn = (size: number, lineHeight: number): number => (lineHeight - size) / 2 + size * 0.85

/** "#rrggbb" -> rgba; anything else is returned unchanged. */
export function withAlpha(color: string, alpha: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(color.trim())
  if (!m) return color
  const n = parseInt(m[1] as string, 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}

export function makeCtx(input: SheetLayoutInput): Ctx {
  const { geometry, theme, measurer } = input
  const s = geometry.pageWidth / BASE_DIVISOR
  const px = (k: number): number => s * k
  const { fontBody: body, fontHand: hand, fontMono: mono } = theme
  return {
    s,
    theme,
    measurer,
    pageWidth: geometry.pageWidth,
    margin: geometry.margin,
    x0: geometry.margin,
    w: geometry.pageWidth - 2 * geometry.margin,
    f: {
      body: fontOf(px(SIZE.body), body),
      title: fontOf(px(SIZE.title), hand),
      chapter: fontOf(px(SIZE.chapter), mono),
      section: fontOf(px(SIZE.section), hand),
      cardHeading: fontOf(px(SIZE.cardHeading), hand),
      chip: fontOf(px(SIZE.chip), mono),
      caption: fontOf(px(SIZE.caption), mono),
      frameLabel: fontOf(px(SIZE.frameLabel), hand),
      note: fontOf(px(SIZE.note), hand),
      footer: fontOf(px(SIZE.footer), mono),
      header: fontOf(px(SIZE.header), mono),
      empty: fontOf(px(SIZE.empty), body),
    },
  }
}
