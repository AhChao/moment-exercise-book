import { describe, expect, it } from 'vitest'
import { fakeMeasurer } from '../testKit'
import { fitOneLine, wrapText } from './wrap'

const wrap = (text: string, max: number): string[] => wrapText(text, max, 'x', fakeMeasurer)

describe('wrapText', () => {
  it('breaks between any two CJK characters', () => {
    expect(wrap('一二三四五六', 30)).toEqual(['一二三', '四五六'])
  })

  it('keeps a line that fits exactly', () => {
    expect(wrap('一二三', 30)).toEqual(['一二三'])
    expect(wrap('一二三四', 30)).toEqual(['一二三', '四'])
  })

  it('breaks Latin text at spaces and drops the trailing space', () => {
    expect(wrap('aa bb cc', 50)).toEqual(['aa bb', 'cc'])
    expect(wrap('hello world', 80)).toEqual(['hello', 'world'])
  })

  it('cuts a Latin word that is wider than the line', () => {
    expect(wrap('abcdefgh', 30)).toEqual(['abc', 'def', 'gh'])
  })

  it('never starts a line with closing punctuation', () => {
    expect(wrap('一二三，四', 30)).toEqual(['一二', '三，四'])
    expect(wrap('一二三。」四', 30)).toEqual(['一二', '三。」', '四'])
  })

  it('never ends a line with an opening bracket', () => {
    expect(wrap('一二（三四', 30)).toEqual(['一二', '（三四'])
  })

  it('keeps an opening bracket with a following word wider than the rest of the line', () => {
    const lines = wrap('一二（Shutter）', 40)
    expect(lines.every((l) => !'（「『《'.includes(l[l.length - 1] ?? ''))).toBe(true)
    expect(lines.join('')).toBe('一二（Shutter）')
    for (const max of [30, 40, 50, 60]) {
      const ls = wrap('決定（Shutter）', max)
      expect(ls.every((l) => !'（'.includes(l[l.length - 1] ?? ''))).toBe(true)
    }
  })

  it('lets punctuation hang when nothing can be pulled down', () => {
    expect(wrap('一，二', 10)).toEqual(['一，', '二'])
  })

  it('holds the kinsoku rules on mixed text', () => {
    const text = '快門速度（Shutter）決定「凍結」或「拖影」，ISO 400；光圈 f/2.8。'
    for (const max of [50, 60, 70, 90, 120]) {
      const lines = wrap(text, max)
      for (const l of lines) {
        expect('，。、；：！？）」』》'.includes(l[0] ?? '')).toBe(false)
        expect('（「『《'.includes(l[l.length - 1] ?? '')).toBe(false)
        expect([...l].length * 10).toBeLessThanOrEqual(max + 10) // a hanging mark may overshoot by one
      }
      expect(lines.join('').replace(/\s/g, '')).toBe(text.replace(/\s/g, ''))
    }
  })

  it('keeps blank lines inside text, drops trailing ones, returns nothing for empty text', () => {
    expect(wrap('一\n\n二\n\n', 100)).toEqual(['一', '', '二'])
    expect(wrap('', 100)).toEqual([])
    expect(wrap('   ', 100)).toEqual([])
  })
})

describe('fitOneLine', () => {
  it('adds an ellipsis only when the text is too wide', () => {
    expect(fitOneLine('abc', 30, 'x', fakeMeasurer)).toBe('abc')
    expect(fitOneLine('abcdef', 40, 'x', fakeMeasurer)).toBe('abc…')
  })
})
