// User-visible strings printed on the shared practice page. Wording follows docs/glossary.md.
// Section names (目標, 場景, 固定, 觀察, 反思, 預測, 概念, 完成) come from ./exercise.

export const sheetCopy = {
  resultPass: '符合',
  resultFail: '未符合',
  /** between the product name and the export date in the footer */
  footerSeparator: '　',
  /** between the parts of one result line */
  resultSeparator: '　',
} as const

/** "（目標 ISO 400 以下）", appended to a result line that missed its target. */
export const resultTargetNote = (target: string): string => `（${target}）`
