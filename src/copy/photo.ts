// User-visible strings for the photo viewer, plus shared shooting-data wording.
import type { DevelopSpec, Lens } from '@/types'

export const photoCopy = {
  back: '返回',
  loading: '載入中',
  missingTitle: '找不到這張照片',
  missingLink: '回到相簿',
  imageAlt: '照片',
  showFailed: '這張照片目前無法顯示',
  dataHeading: '拍攝資料',
  noData: '這張照片沒有拍攝資料',
  save: '儲存調整後的照片',
  saving: '儲存中',
  savedToast: '已儲存照片',
  saveFailed: '照片儲存失敗',
  remove: '刪除',
  removedToast: '已刪除照片',
  removeFailed: '照片刪除失敗',
  confirm: {
    title: '刪除這張照片',
    message: '照片會從相簿刪除，並從使用它的畫格中移除。',
    confirmText: '刪除',
    cancelText: '取消',
  },
  adjustHeading: '調整',
  reset: '重設',
  suggestHeading: '建議調整',
  applySuggest: '套用建議值',
} as const

export const dataLabel = {
  shutter: '快門',
  iso: 'ISO',
  aperture: '光圈',
  focal: '焦段',
  lens: '鏡頭',
  time: '拍攝時間',
  source: '來源',
} as const

export const sourceName = { camera: '相機拍攝', import: '從相簿選取' } as const

/** Lens display names; unknown has no name so callers omit the row. */
export const lensName: Record<Exclude<Lens, 'unknown'>, string> = {
  main: '主鏡頭',
  ultrawide: '超廣角',
  tele: '長焦',
  front: '前鏡頭',
}

export const developLabel: Record<keyof DevelopSpec, string> = {
  shadows: '陰影',
  highlights: '亮部',
  exposure: '曝光',
  warmth: '暖度',
}

export const resetSliderLabel = (name: string): string => `重設${name}`
