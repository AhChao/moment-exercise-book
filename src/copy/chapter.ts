import type { Need } from '@/types'

export const chapterCopy = {
  notFound: {
    title: '找不到這一章',
    message: '這一章不存在，或網址有誤。',
  },
  noExercises: '這一章目前沒有題目',
}

/** Only these needs show as chips on an exercise row. */
export const needLabels: Partial<Record<Need, string>> = {
  ultrawide: '超廣角',
  tele: '長焦',
  night: '夜間',
}

/** Alt text for a thumbnail sitting in a numbered frame ("畫格 2"). */
export function frameName(index: number): string {
  return `畫格 ${index + 1}`
}
