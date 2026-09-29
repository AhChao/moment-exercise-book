// User-visible strings for the exercise page.
import type { PlanReason } from '@/exercise/shotPlan'

export const exerciseCopy = {
  loading: '載入中',
  missingTitle: '找不到這一題',
  missingLink: '回到練習本',
  goal: '目標',
  scene: '場景',
  fixed: '固定',
  observe: '觀察',
  reflect: '反思',
  concept: '概念',
  predict: '預測',
  earlierPredict: '先前的預測',
  results: '結果對照',
  frames: '畫格',
  shoot: '拍攝',
  retake: '重拍',
  pickFromAlbum: '從相簿選取',
  viewPhoto: '查看照片',
  adjust: '調整',
  suggested: '建議調整',
  compare: '並排比較',
  markDone: '標為完成',
  unmarkDone: '取消完成',
  doneStamp: '完成',
  cameraAppTag: '相機 App',
  emptyFrame: '尚無照片',
  placedToast: '已放入畫格',
  notImage: '這個檔案不是可用的照片',
  placeFailed: '照片放入畫格失敗',
} as const

export const importNote = '此畫格改由手機相機 App 拍攝後，從相簿選取'

const reasonText: Record<PlanReason, string> = {
  ultrawide: '超廣角（0.5×）無法在此拍攝',
  exposure: '這支手機的相機沒有提供快門與 ISO 控制',
  whiteBalance: '這支手機的相機沒有提供色溫控制',
  focus: '這支手機的相機沒有提供對焦距離控制',
  compensation: '這支手機的相機沒有提供曝光補償控制',
  zoom: '這支手機的相機沒有提供此倍率',
  noCamera: '未取得相機使用權限',
}

/** One explanation line for a slot that has to be filled from the album. */
export function importReason(reasons: readonly PlanReason[]): string {
  const first = reasons[0]
  return first ? `${reasonText[first]}。${importNote}` : importNote
}

export const frameAria = (n: number, label: string): string => `畫格 ${n}：${label}`
export const nextLink = (title: string): string => `下一題：${title}`
export const observeAria = '觀察記錄'
export const predictAria = (n: number): string => `預測記錄 ${n}`
export const reflectAria =(n: number): string => `反思記錄 ${n}`
export const targetLabel = {
  shutter: '快門',
  ev: '曝光補償',
  wb: '色溫',
  zoom: '倍率',
  focus: '對焦',
} as const
export const autoValue = '自動'
export const levelAria = (level: number): string => `難度 ${level} / 3`

export const checkTarget = {
  atMost: (v: string): string => `${v} 以下`,
  atLeast: (v: string): string => `${v} 以上`,
  between: (a: string, b: string): string => `${a} 至 ${b}`,
  goalPrefix: '目標',
} as const
export const checkFieldLabel = { iso: 'ISO', shutterSec: '快門', focalLength35: '焦段', lens: '鏡頭' } as const
