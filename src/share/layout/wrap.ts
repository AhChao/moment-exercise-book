// Line breaking by measured width. CJK breaks between any two characters, Latin at spaces,
// closing punctuation never starts a line, an opening bracket never ends one.
import type { TextMeasurer } from '../types'

const CLOSING = new Set([...'，。、；：！？）」』》〉】〕］｝…‥,.;:!?)]}”’'])
const OPENING = new Set([...'（「『《〈【〔［｛([{“‘'])
const EPS = 1e-6

interface Tok {
  text: string
  /** whitespace that followed the token; dropped when the line breaks here */
  space: string
}

function isCjk(ch: string): boolean {
  const c = ch.codePointAt(0) ?? 0
  return (
    (c >= 0x2e80 && c <= 0x9fff) ||
    (c >= 0xf900 && c <= 0xfaff) ||
    (c >= 0xfe30 && c <= 0xfe4f) ||
    (c >= 0xff00 && c <= 0xffef) ||
    (c >= 0x20000 && c <= 0x3ffff) ||
    c === 0x2014 || c === 0x2026 || (c >= 0x2018 && c <= 0x201f)
  )
}

function tokenize(par: string): Tok[] {
  const toks: Tok[] = []
  let word = ''
  const flush = (): void => {
    if (word) toks.push({ text: word, space: '' })
    word = ''
  }
  for (const ch of par) {
    if (/\s/.test(ch)) {
      flush()
      const last = toks[toks.length - 1]
      if (last) last.space += ch
    } else if (isCjk(ch)) {
      flush()
      toks.push({ text: ch, space: '' })
    } else word += ch
  }
  flush()
  return toks
}

const joined = (ts: Tok[]): string => ts.map((t) => t.text + t.space).join('').trimEnd()
const first = (t: Tok | undefined): string => (t ? [...t.text][0] ?? '' : '')
const lastChar = (t: Tok | undefined): string => (t ? [...t.text].pop() ?? '' : '')

function wrapParagraph(par: string, max: number, font: string, m: TextMeasurer): string[] {
  const queue = tokenize(par.trim())
  if (queue.length === 0) return ['']
  const fits = (ts: Tok[]): boolean => m.width(joined(ts), font) <= max + EPS
  const lines: string[] = []
  let line: Tok[] = []

  while (queue.length > 0) {
    const t = queue.shift() as Tok
    if (line.length === 0) {
      const chars = [...t.text]
      if (chars.length > 1 && !fits([t])) {
        // A word wider than the line: cut it where it still fits (at least one character).
        let n = 1
        while (n < chars.length - 1 && fits([{ text: chars.slice(0, n + 1).join(''), space: '' }])) n++
        lines.push(chars.slice(0, n).join(''))
        queue.unshift({ text: chars.slice(n).join(''), space: t.space })
      } else line.push(t)
      continue
    }
    if (fits([...line, t])) {
      line.push(t)
      continue
    }
    // Break before t, then repair kinsoku by pulling tokens down to the next line.
    const pending: Tok[] = [t]
    while (
      line.length > 1 &&
      (CLOSING.has(first(pending[0])) || OPENING.has(lastChar(line[line.length - 1])))
    ) {
      pending.unshift(line.pop() as Tok)
    }
    if (CLOSING.has(first(pending[0]))) {
      // Nothing left to pull down: let the punctuation hang at the end of this line.
      line.push(...pending)
      continue
    }
    if (pending.length === 1 && line.length === 1 && OPENING.has(lastChar(line[0]))) {
      // A lone opening bracket cannot end a line: keep it with as much of the next word as fits.
      const chars = [...t.text]
      let n = 1
      while (n < chars.length && fits([...line, { text: chars.slice(0, n + 1).join(''), space: '' }])) n++
      if (n >= chars.length) line.push(t)
      else {
        line.push({ text: chars.slice(0, n).join(''), space: '' })
        lines.push(joined(line))
        line = []
        queue.unshift({ text: chars.slice(n).join(''), space: t.space })
      }
      continue
    }
    lines.push(joined(line))
    line = []
    queue.unshift(...pending)
  }
  if (line.length > 0) lines.push(joined(line))
  return lines
}

/** Wraps text (with optional newlines) to lines no wider than maxWidth. Empty text gives no lines. */
export function wrapText(text: string, maxWidth: number, font: string, m: TextMeasurer): string[] {
  const out = text
    .replace(/\r/g, '')
    .split('\n')
    .flatMap((p) => wrapParagraph(p, maxWidth, font, m))
  while (out.length > 0 && out[out.length - 1] === '') out.pop()
  return out
}

/** Cuts text with an ellipsis so it fits on one line. */
export function fitOneLine(text: string, maxWidth: number, font: string, m: TextMeasurer): string {
  if (m.width(text, font) <= maxWidth + EPS) return text
  const chars = [...text]
  while (chars.length > 1 && m.width(chars.join('') + '…', font) > maxWidth + EPS) chars.pop()
  return chars.join('') + '…'
}
