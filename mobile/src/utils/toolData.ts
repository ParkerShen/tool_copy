/**
 * 首页其他工具的数据（目前是标签日记）。
 *
 * 标签日记是独立静态页，数据保存在同源的 localStorage：
 * `tag-diary:data:v1`。这里提供统一的读取、校验和恢复入口，
 * 让「我的 → 数据备份」可以一次性包含所有工具的数据。
 */

export const TAG_DIARY_DATA_KEY = "tag-diary:data:v1"

/** SQLite / JSON 统一备份中用于标记标签日记的 key */
export const TAG_DIARY_TOOL_KEY = "tag-diary"

export interface TagDiaryData {
  version?: number
  tags: unknown[]
  archivedTags?: unknown[]
  activities: unknown[]
  diaries: Record<string, unknown>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value)
}

export function isTagDiaryData(value: unknown): value is TagDiaryData {
  return (
    isRecord(value) &&
    Array.isArray(value.tags) &&
    Array.isArray(value.activities) &&
    isRecord(value.diaries)
  )
}

/** 读取标签日记原始 JSON；格式不正确时返回 null */
export function readTagDiaryRaw(): string | null {
  if (typeof localStorage === "undefined") return null
  try {
    const raw = localStorage.getItem(TAG_DIARY_DATA_KEY)
    if (!raw) return null
    return isTagDiaryData(JSON.parse(raw)) ? raw : null
  } catch {
    return null
  }
}

export function readTagDiaryData(): TagDiaryData | null {
  const raw = readTagDiaryRaw()
  if (!raw) return null
  try {
    return JSON.parse(raw) as TagDiaryData
  } catch {
    return null
  }
}

export function parseTagDiaryRaw(raw: string): TagDiaryData {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error("标签日记备份不是有效的 JSON")
  }
  if (!isTagDiaryData(parsed)) {
    throw new Error("标签日记备份格式不正确")
  }
  return parsed
}

/** 原样写回标签日记 localStorage；写入前会校验 */
export function writeTagDiaryRaw(raw: string): void {
  parseTagDiaryRaw(raw)
  if (typeof localStorage === "undefined") {
    throw new Error("当前环境无法恢复标签日记")
  }
  localStorage.setItem(TAG_DIARY_DATA_KEY, raw)
}

export function writeTagDiaryData(value: unknown): void {
  if (!isTagDiaryData(value)) {
    throw new Error("标签日记备份格式不正确")
  }
  writeTagDiaryRaw(JSON.stringify(value))
}

/** 统计已保存的日志篇数（首页卡片使用） */
export function countSavedTagDiaries(value: unknown): number {
  if (!isTagDiaryData(value)) return 0
  return Object.values(value.diaries).filter((entry) => {
    return isRecord(entry) && String(entry.content || "").trim().length > 0
  }).length
}
