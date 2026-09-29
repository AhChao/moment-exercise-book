// User-visible strings for the capture screen.
import type { CameraErrorCode, CapturePhase } from '@/camera/types'
import { importNote } from './exercise'

export const captureCopy = {
  opening: '相機開啟中',
  close: '關閉',
  shutter: '拍攝',
  slowHint: '手機請靠在穩固處',
  panelOpen: '展開拍攝設定',
  panelClose: '收合拍攝設定',
  panelTitle: '拍攝設定',
  auto: '自動',
  locked: '已固定',
  zoomFine: '倍率微調',
  keep: '採用',
  retake: '重拍',
  discard: '放棄',
  reviewTitle: '拍攝結果',
  reviewAlt: '剛拍下的照片',
  unverified: '拍攝值與要求略有差異',
  savedToast: '已放入畫格',
  saveFailed: '照片存入失敗',
  captureFailed: '拍攝未完成',
  pickFromAlbum: '從相簿選取',
  back: '返回',
  missing: '找不到這一題',
  leave: {
    title: '放棄這張照片',
    message: '尚未採用的照片將不會保存。',
    confirmText: '放棄',
    cancelText: '返回拍攝',
  },
} as const

export const controlLabel = {
  zoom: '倍率',
  ev: '曝光補償',
  shutter: '快門',
  iso: 'ISO',
  wb: '色溫',
  focus: '對焦距離',
} as const

export const phaseText: Record<CapturePhase, string> = {
  preparing: '準備中',
  settling: '穩定中',
  shooting: '拍攝中',
  verifying: '確認中',
  retrying: '重新拍攝中',
}

export const exposing = (shutter: string): string => `曝光 ${shutter}`

export const errorTitle: Record<CameraErrorCode, string> = {
  denied: '未取得相機使用權限',
  unavailable: '這支手機目前沒有可用的相機',
  unsupported: '這支手機無法在此拍攝',
  failed: '相機目前無法使用',
}
export const errorBody = importNote
