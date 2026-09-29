// Strings shared by several areas. Wording follows docs/glossary.md.
import type { Lens } from '@/types'

export const common = {
  productName: 'Moment Exercise Book',
  notebook: '練習本',
  close: '關閉',
  back: '返回',
  cancel: '取消',
  confirm: '確定',
  loading: '載入中',
  completed: '完成',
  backToNotebook: '回到練習本',
  genericError: '操作未完成',
}

/** Lens names as shown to the learner. `unknown` has no label and never appears as a filter. */
export const lensLabels: Record<Exclude<Lens, 'unknown'>, string> = {
  main: '主鏡頭',
  ultrawide: '超廣角',
  tele: '長焦',
  front: '前鏡頭',
}

/** "3 / 12 題" */
export function progress(done: number, total: number): string {
  return `${done} / ${total} 題`
}

/** "難度 2 / 3", used for the pencil-dot rating. */
export function levelLabel(level: number): string {
  return `難度 ${level} / 3`
}
