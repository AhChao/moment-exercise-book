// Wording for the settings screen. No mention of where data lives beyond "this phone".
export const settings = {
  title: '設定',

  storage: {
    title: '儲存空間',
    loading: '正在讀取儲存空間',
    unavailable: '無法讀取儲存空間用量',
    protectedState: '已受保護',
    unprotectedState: '尚未受保護',
    protectedNote: '受保護的資料不會在手機空間不足時被自動清除。',
    protect: '保護資料',
    protectDone: '資料已受保護',
    protectDenied: '尚未取得保護。將練習本加入主畫面後再試，較容易取得。',
    install: '加入主畫面',
    installDone: '已加入主畫面',
  },

  backup: {
    title: '備份',
    note: '備份檔包含全部照片與各題的紀錄。',
    export: '匯出備份',
    exporting: '正在匯出備份',
    exportDone: '備份檔已匯出',
    exportFailed: '備份檔匯出失敗',
    import: '匯入備份',
    importing: '正在匯入備份',
    importFailed: '備份檔匯入失敗',
    invalidFile: '這個檔案不是有效的備份檔',
    mode: {
      title: '匯入備份檔',
      message: '合併會保留現有內容，並補上備份檔中缺少的部分。取代會先清空現有內容，再換成備份檔的內容。',
      merge: '合併',
      replace: '取代',
    },
    replaceConfirm: {
      title: '以備份檔取代現有內容？',
      message: '現有的照片與紀錄會先清空，此動作無法還原。',
      confirm: '取代',
    },
  },

  camera: {
    title: '這支手機的相機',
    note: '檢查後會列出相機提供的控制項目。',
    check: '檢查相機',
    checking: '檢查中',
    recheck: '重新檢查',
    available: '可用',
    unavailableControl: '這支手機的相機沒有提供此項控制',
    controls: {
      shutter: '快門',
      iso: 'ISO',
      ev: '曝光補償',
      wb: '白平衡',
      focus: '對焦距離',
      zoom: '倍率範圍',
    },
    errors: {
      denied: '未取得相機使用權限',
      unavailable: '這支手機沒有可用的相機',
      unsupported: '此瀏覽器不支援相機拍攝',
      failed: '相機目前無法開啟',
    },
  },

  about: {
    title: '關於',
    line: 'Moment Exercise Book，手機攝影練習本。',
    privacy: '所有照片與紀錄都存放在這支手機。',
  },
}

/** "已使用 12 MB / 8.2 GB" */
export function usageText(used: string, quota: string): string {
  return `已使用 ${used} / ${quota}`
}

/** "正在匯出備份 3 / 10" while a backup file is being written. */
export function exportProgress(done: number, total: number): string {
  return `${settings.backup.exporting} ${done} / ${total}`
}

/** Toast after a backup file has been imported. */
export function importDone(photos: number, attempts: number): string {
  return `已匯入 ${photos} 張照片、${attempts} 題紀錄`
}
