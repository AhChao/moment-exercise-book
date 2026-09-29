// Fixtures shared by the sheet tests (pure data, no DOM). Not imported by application code.
import type { Attempt, Exercise, PhotoMeta } from '@/types'
import { NO_DEVELOP } from '@/types'
import type { SheetTheme, TextMeasurer } from './types'

/** Every character is 10 wide, whatever the font. */
export const fakeMeasurer: TextMeasurer = { width: (text) => [...text].length * 10 }

export const fakeTheme: SheetTheme = {
  paper: '#f4ecd8', paperLight: '#fbf6e9', ink: '#3b2a1e', inkSoft: '#6b5847', inkFaint: '#b9a88f',
  accent: '#c2410c', film: '#222222', green: '#2f7d4f', yellow: '#f2d16b',
  fontBody: 'B', fontHand: 'H', fontMono: 'M',
}

export function makePhoto(over: Partial<PhotoMeta> & { iso?: number; exposureTime?: number } = {}): PhotoMeta {
  const { iso, exposureTime, ...rest } = over
  return {
    id: 'p1', createdAt: 0, source: 'camera', width: 3000, height: 4000, bytes: 1,
    exif: { hasExif: true, hasGps: true, iso, exposureTime },
    applied: {}, lens: 'main', develop: NO_DEVELOP,
    ...rest,
  }
}

const capture = { shutterSec: null, iso: null, ev: null, wbKelvin: null, zoom: null, focusMeters: null }

export function makeExercise(over: Partial<Exercise> = {}): Exercise {
  return {
    id: 'ex1', title: '快門速度', level: 2, goal: '拍出凍結與拖影兩種水花', scene: '水龍頭或噴泉',
    fixed: ['ISO 100', '主鏡頭'],
    shots: [
      { label: '1/30', capture, develop: null, hint: '' },
      { label: '1/125', capture, develop: null, hint: '' },
    ],
    concept: '快門像窗簾開合的時間。',
    predict: ['哪一格的水花最清楚？'],
    observe: ['兩格的水花差在哪裡？', '哪一格比較亮？'],
    reflect: ['下次想怎麼調整？', '哪個設定最有效？'],
    needs: [],
    checks: [
      { shot: 0, field: 'iso', op: '<=', value: 400 },
      { shot: 1, field: 'iso', op: '<=', value: 400 },
    ],
    sources: [],
    ...over,
  }
}

export function makeAttempt(over: Partial<Attempt> = {}): Attempt {
  return {
    exerciseId: 'ex1', slots: ['p1', 'p2'], observeNotes: '  左邊比較糊  ',
    reflectNotes: ['縮短快門', ''], predictNotes: ['右邊'], updatedAt: 1, completedAt: null,
    ...over,
  }
}
