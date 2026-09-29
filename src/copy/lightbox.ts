// Strings for the photo viewer. Wording follows docs/glossary.md.
export const lightboxCopy = {
  dialog: '照片檢視',
  prev: '上一張',
  next: '下一張',
  zoomIn: '放大',
  zoomOut: '縮小',
  reset: '還原大小',
  adjust: '調整',
  adjustAria: '調整這張照片',
}

/** "2 / 3" */
export function counter(index: number, total: number): string {
  return `${index + 1} / ${total}`
}

/** Alt text of the shown photo: its label, else its position. */
export function photoName(label: string | undefined, index: number): string {
  return label ? label : `照片 ${index + 1}`
}

/** Accessible name of a tappable photo that opens the viewer. */
export function openAria(label: string): string {
  return label ? `檢視大圖：${label}` : '檢視大圖'
}
