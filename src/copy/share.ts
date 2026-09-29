// Strings of the export flow (exercise page and chapter page). Wording follows docs/glossary.md.
export const share = {
  /** exercise page entry (icon button label) */
  exportLabel: '匯出',
  /** chapter page entry */
  exportChapter: '匯出本章',
  dialogTitleExercise: '匯出本題',
  dialogTitleChapter: '匯出本章',
  formatLabel: '格式',
  formatImage: '圖片',
  formatPdf: 'PDF',
  includeNotes: '包含觀察與反思紀錄',
  includeShootingData: '包含拍攝資料',
  exercisesLabel: '選擇要匯出的題',
  selectAll: '全選',
  clearAll: '取消全選',
  nothingSelected: '尚未選擇題目',
  submit: '匯出',
  busy: '匯出中',
  empty: '尚無照片可匯出',
  shared: '已匯出',
  downloaded: '檔案已儲存',
  failed: '匯出未完成',
} as const

/** "3 / 12 題" style progress caption while exporting. */
export function exportProgress(done: number, total: number): string {
  return `${share.busy} ${done} / ${total} 題`
}

/** Accessible name of the progress bar. */
export const progressAria = '匯出進度'
