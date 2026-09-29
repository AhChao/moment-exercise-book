export const home = {
  deviceNotice: {
    title: '這個瀏覽器無法在練習本內拍攝',
    message: '手動調整快門與 ISO 需要 Android 手機上的 Chrome。其他瀏覽器仍可先用手機相機 App 拍攝，再從相簿選取照片練習。',
  },
  subtitle: '用手機相機，一題一題練習攝影',
  contents: '目錄',
  startKicker: '從這裡開始',
  continueKicker: '接著練習',
  allDone: {
    title: '所有題目都已完成',
    message: '拍過的照片收在相簿。',
    action: '前往相簿',
  },
}

/** Position of a chapter in reading order as two digits: "03". */
export function chapterNumber(position: number): string {
  return String(position).padStart(2, '0')
}
