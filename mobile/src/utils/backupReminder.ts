/**
 * 手动导出备份的提醒状态。
 * 数据只在本机：浏览器无法在没有用户操作的情况下把文件写入「文件」App，
 * 因此用“上次导出时间”来提醒定期导出 .sqlite 备份。
 */
export const LAST_EXPORT_KEY = "local-bookkeeping.last-export-at"
const SNOOZE_KEY = "local-bookkeeping.backup-snooze-until"
export const BACKUP_INTERVAL_DAYS = 7

export function getLastExportAt(): string | null {
  try {
    return localStorage.getItem(LAST_EXPORT_KEY)
  } catch {
    return null
  }
}

export function markExported(): void {
  try {
    localStorage.setItem(LAST_EXPORT_KEY, new Date().toISOString())
  } catch {
    // localStorage 不可用时忽略
  }
}

/** 距上次导出的天数；从未导出时返回 null */
export function daysSinceLastExport(): number | null {
  const value = getLastExportAt()
  if (!value) return null
  const time = new Date(value).getTime()
  if (!Number.isFinite(time)) return null
  return Math.max(0, Math.floor((Date.now() - time) / 86400000))
}

export function isBackupDue(): boolean {
  const days = daysSinceLastExport()
  return days === null || days >= BACKUP_INTERVAL_DAYS
}

/** 用户点「稍后」后，3 天内不再弹提醒 */
export function isBackupSnoozed(): boolean {
  try {
    const value = localStorage.getItem(SNOOZE_KEY)
    return !!value && Number(value) > Date.now()
  } catch {
    return false
  }
}

export function snoozeBackup(days = 3): void {
  try {
    localStorage.setItem(SNOOZE_KEY, String(Date.now() + days * 86400000))
  } catch {
    // 忽略
  }
}
