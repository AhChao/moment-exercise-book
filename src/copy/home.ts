export const home = {
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

/** Chapter order as a two-digit index: "03". */
export function chapterNumber(order: number): string {
  return String(order).padStart(2, '0')
}
