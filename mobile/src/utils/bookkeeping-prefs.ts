/**
 * 记账偏好：默认账户。
 *
 * 默认账户只影响「新建记录」时预选的账户，不改变任何历史记录。
 * 存在本地 Storage 中；账户被归档或删除后自动回退到系统账户。
 */
export const DEFAULT_ACCOUNT_KEY = "bk_last_account_id"

export function getDefaultAccountId(): string {
  try {
    return String(uni.getStorageSync(DEFAULT_ACCOUNT_KEY) || "")
  } catch {
    return ""
  }
}

export function setDefaultAccountId(id: string): void {
  try {
    uni.setStorageSync(DEFAULT_ACCOUNT_KEY, String(id || ""))
  } catch (error) {
    console.warn("[bookkeeping] 保存默认账户失败:", error)
  }
}
