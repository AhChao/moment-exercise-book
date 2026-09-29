import { describe, expect, it } from 'vitest'
import { layoutSheet } from './layout'
import type { SheetContentWithPredictions } from './layout/extended'
import { fakeMeasurer, fakeTheme } from './testKit'
import type { DisplayOp, SheetContent, SheetGeometry, SheetPage } from './types'

const W = 560
const S = W / 28
const FOOTER_H = 2.2 * S
const MARGIN = 32
const BODY_FONT = `${S}px B`

const long = (n: number): string => '光影與時間的關係需要反覆練習才能看見。'.repeat(n)

function content(over: Partial<SheetContentWithPredictions> = {}): SheetContentWithPredictions {
  return {
    chapterTitle: '第一章　快門', title: '快門速度', level: 2, concept: '快門像窗簾開合的時間。',
    goal: '拍出凍結與拖影兩種水花', scene: '水龍頭或噴泉', fixed: ['ISO 100', '主鏡頭', '腳架或靠穩'],
    frames: [
      { label: '1/30', caption: '快門 1/30　ISO 100', aspect: 3 / 4, hasPhoto: true },
      { label: '1/125', caption: '', aspect: 4 / 3, hasPhoto: true },
      { label: '1/500', caption: '', aspect: 3 / 4, hasPhoto: false },
    ],
    includeNotes: true,
    predictions: ['哪一格最清楚？'],
    predictionNotes: ['右邊'],
    observeQuestions: ['兩格差在哪裡？', '哪一格比較亮？'],
    observeNotes: '左邊比較糊',
    reflectPrompts: [
      { prompt: '下次想怎麼調整？', note: '縮短快門' },
      { prompt: '哪個設定最有效？', note: '' },
    ],
    results: ['1/30　ISO 100　符合', '1/125　ISO 800　未符合（目標 ISO 400 以下）'],
    completed: true, footer: 'Moment Exercise Book　2026/09/29',
    ...over,
  }
}

const lay = (c: SheetContent, geometry: SheetGeometry): SheetPage[] =>
  layoutSheet({ content: c, geometry, theme: fakeTheme, measurer: fakeMeasurer })

/** Lowest y an op reaches (text: baseline plus a descender, stamp: its radius). */
function bottom(op: DisplayOp): number {
  switch (op.op) {
    case 'rect': case 'photo': case 'strip': return op.y + op.h
    case 'line': return Math.max(op.y1, op.y2)
    case 'text': return op.y + S * 0.3
    case 'stamp': return op.y + 2.4 * S
  }
}

describe('layoutSheet auto height', () => {
  const c = content({ completed: false, results: [] })
  const pages = lay(c, { pageWidth: W, pageHeight: 'auto', margin: MARGIN })

  it('is a single page whose height is the content plus margins and footer', () => {
    expect(pages).toHaveLength(1)
    const page = pages[0] as SheetPage
    expect(page.width).toBe(W)
    const body = page.ops.slice(1, -2)
    const maxBottom = Math.max(...body.map(bottom))
    expect(page.height - MARGIN - FOOTER_H).toBeCloseTo(maxBottom, 6)
  })

  it('starts with the paper background and ends with the footer', () => {
    const page = pages[0] as SheetPage
    expect(page.ops[0]).toMatchObject({ op: 'rect', x: 0, y: 0, w: W, h: page.height, fill: fakeTheme.paper })
    const last = page.ops[page.ops.length - 1] as DisplayOp
    expect(last).toMatchObject({ op: 'text', text: c.footer })
  })

  it('grows with the content', () => {
    const tall = lay(content({ goal: long(20) }), { pageWidth: W, pageHeight: 'auto', margin: MARGIN })
    expect(tall).toHaveLength(1)
    expect((tall[0] as SheetPage).height).toBeGreaterThan((pages[0] as SheetPage).height)
  })
})

describe('layoutSheet pagination', () => {
  const c = content({
    goal: long(12), scene: long(6),
    predictions: [long(2)],
    predictionNotes: [long(3)],
    observeNotes: long(10),
    reflectPrompts: [1, 2, 3, 4, 5].map((i) => ({ prompt: `${long(1)}${i}`, note: long(3) })),
    frames: [1, 2, 3, 4].map((i) => ({ label: `畫格${i}`, caption: '快門 1/125', aspect: i % 2 ? 3 / 4 : 4 / 3, hasPhoto: true })),
  })
  const H = 700
  const pages = lay(c, { pageWidth: W, pageHeight: H, margin: MARGIN })

  it('uses several fixed-height pages', () => {
    expect(pages.length).toBeGreaterThan(2)
    for (const p of pages) {
      expect(p.height).toBe(H)
      expect(p.width).toBe(W)
    }
  })

  it('never lets an op reach past the page height', () => {
    for (const p of pages) for (const op of p.ops) expect(bottom(op)).toBeLessThanOrEqual(H)
  })

  it('keeps body ops above the footer zone', () => {
    for (const p of pages) {
      const body = p.ops.slice(1, -2)
      for (const op of body) expect(bottom(op)).toBeLessThanOrEqual(H - MARGIN - FOOTER_H + 0.5)
    }
  })

  it('puts the footer on every page and a running header after the first', () => {
    pages.forEach((p, i) => {
      const last = p.ops[p.ops.length - 1] as DisplayOp
      expect(last).toMatchObject({ op: 'text', text: c.footer })
      const header = p.ops[1] as DisplayOp
      if (i === 0) expect(header).not.toMatchObject({ text: c.title })
      else expect(header).toMatchObject({ op: 'text', text: c.title })
      expect(p.ops[0]).toMatchObject({ op: 'rect', fill: fakeTheme.paper })
    })
  })

  it('never splits a frame row: every photo sits inside a polaroid on the same page', () => {
    let photos = 0
    for (const p of pages) {
      const rects = p.ops.filter((o): o is Extract<DisplayOp, { op: 'rect' }> => o.op === 'rect' && o.fill === fakeTheme.paperLight)
      for (const op of p.ops) {
        if (op.op !== 'photo') continue
        photos++
        const host = rects.find((r) => op.x >= r.x && op.x + op.w <= r.x + r.w + 1e-6 && op.y >= r.y && op.y + op.h <= r.y + r.h + 1e-6)
        expect(host).toBeDefined()
      }
    }
    expect(photos).toBe(4)
  })

  it('splits a long paragraph by lines and loses no text', () => {
    const bodyText = pages
      .flatMap((p) => p.ops)
      .filter((o): o is Extract<DisplayOp, { op: 'text' }> => o.op === 'text' && o.font === BODY_FONT)
      .map((o) => o.text)
      .join('')
    expect(bodyText.includes(c.goal)).toBe(true)
    expect(bodyText.includes(c.scene)).toBe(true)
  })

  it('keeps every text line inside the content column', () => {
    for (const p of pages) {
      for (const op of p.ops) {
        if (op.op !== 'text' || op.align === 'center' || op.text === c.footer) continue
        expect(op.x).toBeGreaterThanOrEqual(MARGIN - 1e-6)
        expect(op.x + [...op.text].length * 10).toBeLessThanOrEqual(W - MARGIN + 1e-6 + 10)
      }
    }
  })
})

describe('layoutSheet parts', () => {
  const geo: SheetGeometry = { pageWidth: W, pageHeight: 'auto', margin: MARGIN }
  const ops = (c: SheetContent): DisplayOp[] => (lay(c, geo)[0] as SheetPage).ops
  const count = (list: DisplayOp[], op: DisplayOp['op']): number => list.filter((o) => o.op === op).length

  it('draws ruled lines only when notes are included, at least two per prompt', () => {
    const blank = content({
      includeNotes: true, predictions: ['哪一格最清楚？'], predictionNotes: [''], observeNotes: '',
      reflectPrompts: [{ prompt: 'a', note: '' }, { prompt: 'b', note: '' }],
    })
    const hidden = content({
      includeNotes: false, predictions: ['哪一格最清楚？'], predictionNotes: ['不該出現'], observeNotes: '不該出現',
      reflectPrompts: [{ prompt: 'a', note: '不該出現' }, { prompt: 'b', note: '' }],
    })
    const withNotes = count(ops(blank), 'line')
    const without = count(ops(hidden), 'line')
    expect(withNotes - without).toBe(2 * 4)
    // the questions are still printed
    const texts = ops(hidden).filter((o) => o.op === 'text').map((o) => (o as { text: string }).text)
    expect(texts).toContain('哪一格最清楚？')
    expect(texts).not.toContain('不該出現')
  })

  it('writes the learner notes on the ruled lines', () => {
    const all = ops(content())
    const texts = all.filter((o) => o.op === 'text').map((o) => (o as { text: string }).text)
    expect(texts).toContain('左邊比較糊')
    expect(texts).toContain('右邊')
    expect(texts).toContain('縮短快門')
  })

  it('draws the stamp only when completed', () => {
    expect(count(ops(content({ completed: true })), 'stamp')).toBe(1)
    expect(count(ops(content({ completed: false })), 'stamp')).toBe(0)
  })

  it('lays frames two per row, one alone in a centred row, and keeps their aspect', () => {
    const photos = ops(content()).filter((o): o is Extract<DisplayOp, { op: 'photo' }> => o.op === 'photo')
    expect(photos).toHaveLength(2) // the third frame has no photo
    const [a, b] = photos as [typeof photos[0], typeof photos[0]]
    expect(b.y).toBeLessThan(a.y + a.h) // same row: b starts before a ends
    expect(b.x).toBeGreaterThan(a.x + a.w)
    expect(a.w / a.h).toBeCloseTo(3 / 4, 6)
    expect(b.w / b.h).toBeCloseTo(4 / 3, 6)
    const one = ops(content({ frames: [{ label: '1/30', caption: '', aspect: 1, hasPhoto: true }] }))
    expect(count(one, 'photo')).toBe(1)
  })

  it('draws the wavy rule and skips empty sections', () => {
    const all = ops(content({ concept: null, fixed: [], predictions: [], observeQuestions: [], observeNotes: '', reflectPrompts: [], results: [], frames: [], completed: false }))
    expect(all.some((o) => o.op === 'line' && o.wavy)).toBe(true)
    expect(count(all, 'photo')).toBe(0)
    expect(count(all, 'stamp')).toBe(0)
  })
})
