import { describe, expect, it } from 'vitest'
import { buildSheetContent } from './content'
import { makeAttempt, makeExercise, makePhoto } from './testKit'
import type { SheetOptions, SheetSource } from './types'

const all: SheetOptions = { includeNotes: true, includeShootingData: true, footerDate: '2026/09/29' }
const none: SheetOptions = { includeNotes: false, includeShootingData: false, footerDate: '' }

const source = (over: Partial<SheetSource> = {}): SheetSource => ({
  exercise: makeExercise(),
  chapterTitle: ' 第一章 ',
  attempt: makeAttempt(),
  photos: [makePhoto({ iso: 100, exposureTime: 1 / 30 }), makePhoto({ iso: 800, exposureTime: 1 / 125, width: 4000, height: 3000 })],
  ...over,
})

describe('buildSheetContent', () => {
  it('reduces the exercise to trimmed display text', () => {
    const c = buildSheetContent(source(), all)
    expect(c).toMatchObject({ chapterTitle: '第一章', title: '快門速度', level: 2, goal: '拍出凍結與拖影兩種水花', scene: '水龍頭或噴泉' })
    expect(c.fixed).toEqual(['ISO 100', '主鏡頭'])
    expect(c.concept).toBe('快門像窗簾開合的時間。')
    expect(buildSheetContent(source({ exercise: makeExercise({ concept: undefined }) }), all).concept).toBeNull()
  })

  it('builds one frame per shot with aspect, photo flag and shooting data', () => {
    const c = buildSheetContent(source({ photos: [makePhoto({ iso: 400, exposureTime: 1 / 125 }), null] }), all)
    expect(c.frames).toHaveLength(2)
    expect(c.frames[0]).toEqual({ label: '1/30', caption: '快門 1/125　ISO 400', aspect: 3 / 4, hasPhoto: true })
    expect(c.frames[1]).toEqual({ label: '1/125', caption: '', aspect: 3 / 4, hasPhoto: false })
    const wide = buildSheetContent(source(), all)
    expect(wide.frames[1]?.aspect).toBeCloseTo(4 / 3, 9)
  })

  it('leaves the caption empty when hidden or when the photo has no values', () => {
    expect(buildSheetContent(source(), none).frames.map((f) => f.caption)).toEqual(['', ''])
    const bare = buildSheetContent(source({ photos: [makePhoto(), makePhoto()] }), all)
    expect(bare.frames.map((f) => f.caption)).toEqual(['', ''])
  })

  it('includes trimmed notes when notes are on', () => {
    const c = buildSheetContent(source(), all)
    expect(c.includeNotes).toBe(true)
    expect(c.observeNotes).toBe('左邊比較糊')
    expect(c.reflectPrompts.map((r) => r.note)).toEqual(['縮短快門', ''])
    expect(c.predictions).toEqual(['哪一格的水花最清楚？'])
    expect(c.predictionNotes).toEqual(['右邊'])
  })

  it('blanks the notes but keeps every prompt when notes are off', () => {
    const c = buildSheetContent(source(), none)
    expect(c.includeNotes).toBe(false)
    expect(c.predictionNotes).toEqual([''])
    expect(c.observeNotes).toBe('')
    expect(c.reflectPrompts).toEqual([
      { prompt: '下次想怎麼調整？', note: '' },
      { prompt: '哪個設定最有效？', note: '' },
    ])
    expect(c.predictions).toEqual(['哪一格的水花最清楚？'])
    expect(c.observeQuestions).toEqual(['兩格的水花差在哪裡？', '哪一格比較亮？'])
  })

  it('keeps the prompts when there is no attempt yet', () => {
    const c = buildSheetContent(source({ attempt: undefined }), all)
    expect(c.completed).toBe(false)
    expect(c.reflectPrompts).toHaveLength(2)
    expect(c.includeNotes).toBe(true)
    expect(c.observeNotes).toBe('')
  })

  it('formats pass and fail lines and drops unknown results', () => {
    const c = buildSheetContent(source(), all)
    expect(c.results).toEqual(['1/30　ISO 100　符合', '1/125　ISO 800　未符合（目標 ISO 400 以下）'])
    const partial = buildSheetContent(source({ photos: [makePhoto({ iso: 100 }), null] }), all)
    expect(partial.results).toEqual(['1/30　ISO 100　符合'])
  })

  it('reads completed from completedAt', () => {
    expect(buildSheetContent(source({ attempt: makeAttempt({ completedAt: 5 }) }), all).completed).toBe(true)
    expect(buildSheetContent(source(), all).completed).toBe(false)
  })

  it('builds the footer from the product name and the optional date', () => {
    expect(buildSheetContent(source(), all).footer).toBe('Moment Exercise Book　2026/09/29')
    expect(buildSheetContent(source(), { ...all, footerDate: '  ' }).footer).toBe('Moment Exercise Book')
  })

  it('never carries GPS or other photo fields into the content', () => {
    const json = JSON.stringify(buildSheetContent(source(), all))
    expect(json).not.toMatch(/hasGps|latitude|longitude|p1|bytes/)
  })
})
