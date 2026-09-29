export const album = {
  title: '相簿',
  filterAll: '全部',
  lensFilter: '鏡頭',
  chapterFilter: '章',
  empty: {
    title: '相簿目前沒有照片',
    message: '拍攝的照片會收在這裡。',
  },
  emptyFiltered: {
    title: '這個條件下沒有照片',
    action: '顯示全部',
  },
}

export function photoCount(n: number): string {
  return `共 ${n} 張`
}

/** Alt text for a grid thumbnail. */
export function photoAlt(index: number): string {
  return `照片 ${index + 1}`
}
