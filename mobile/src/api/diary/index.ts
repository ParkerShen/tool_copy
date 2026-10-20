/**
 * 日记业务接口。
 * 所有数据都保存在本机，不依赖线上服务。
 */
import dayjs from "dayjs"
import {
  DIARY_MOODS,
  type DiaryDayGroup,
  type DiaryEntry,
  type DiaryEntryFilter,
  type DiaryEntryInput,
  type DiaryExportPayload,
  type DiaryMoodKey,
  type DiaryStats,
  type DiaryTagCount,
  type DiaryWeatherKey,
} from "./types"
import {
  readAllDiaryEntries,
  removeDiaryEntry,
  replaceAllDiaryEntries,
  writeDiaryEntry,
} from "./storage"

export { isDiaryStorageAvailable } from "./storage"
export * from "./types"

export const DIARY_TODAY = (): string => dayjs().format("YYYY-MM-DD")

function createId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID()
    }
  } catch {
    // 忽略，使用时间戳 + 随机数兜底
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function normalizeTags(tags: string[]): string[] {
  const result: string[] = []
  tags.forEach((tag) => {
    const value = String(tag || "").trim()
    if (value && !result.includes(value)) result.push(value)
  })
  return result
}

function normalizeDate(value?: string): string {
  if (!value) return DIARY_TODAY()
  const parsed = dayjs(value)
  return parsed.isValid() ? parsed.format("YYYY-MM-DD") : DIARY_TODAY()
}

function normalizeMood(value?: string): DiaryMoodKey {
  return DIARY_MOODS.some((item) => item.key === value) ? (value as DiaryMoodKey) : "neutral"
}

function compareEntries(a: DiaryEntry, b: DiaryEntry): number {
  if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
  if (a.date !== b.date) return a.date < b.date ? 1 : -1
  return b.createdAt - a.createdAt
}

/** 读取全部日记，默认排除回收站内容 */
export async function listDiaryEntries(filter: DiaryEntryFilter = {}): Promise<DiaryEntry[]> {
  const all = await readAllDiaryEntries()
  const keyword = (filter.keyword || "").trim().toLowerCase()
  const result = all.filter((entry) => {
    if (!filter.includeDeleted && entry.deletedAt) return false
    if (filter.mood && filter.mood !== "all" && entry.mood !== filter.mood) return false
    if (filter.tag && !entry.tags.includes(filter.tag)) return false
    if (keyword) {
      const text = `${entry.title} ${entry.content} ${entry.tags.join(" ")}`.toLowerCase()
      if (!text.includes(keyword)) return false
    }
    return true
  })
  return result.sort(compareEntries)
}

/** 读取回收站中的日记 */
export async function listDeletedDiaryEntries(): Promise<DiaryEntry[]> {
  const all = await readAllDiaryEntries()
  return all
    .filter((entry) => !!entry.deletedAt)
    .sort((a, b) => Number(b.deletedAt || 0) - Number(a.deletedAt || 0))
}

export async function getDiaryEntry(id: string): Promise<DiaryEntry | null> {
  if (!id) return null
  const all = await readAllDiaryEntries()
  return all.find((entry) => entry.id === id) || null
}

export async function saveDiaryEntry(input: DiaryEntryInput): Promise<DiaryEntry> {
  const all = await readAllDiaryEntries()
  const existing = input.id ? all.find((entry) => entry.id === input.id) : undefined
  const now = Date.now()
  const entry: DiaryEntry = {
    id: existing?.id || input.id || createId(),
    title: String(input.title ?? existing?.title ?? "").trim(),
    content: String(input.content ?? existing?.content ?? ""),
    date: normalizeDate(input.date ?? existing?.date),
    mood: normalizeMood(input.mood ?? existing?.mood),
    weather: (input.weather ?? existing?.weather ?? "") as DiaryWeatherKey | "",
    tags: normalizeTags(input.tags ?? existing?.tags ?? []),
    images: [...(input.images ?? existing?.images ?? [])],
    pinned: input.pinned ?? existing?.pinned ?? false,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    deletedAt: null,
  }
  await writeDiaryEntry(entry)
  return entry
}

/** 移入回收站 */
export async function softDeleteDiaryEntry(id: string): Promise<void> {
  const entry = await getDiaryEntry(id)
  if (!entry) return
  await writeDiaryEntry({ ...entry, deletedAt: Date.now(), updatedAt: Date.now() })
}

/** 从回收站恢复 */
export async function restoreDiaryEntry(id: string): Promise<void> {
  const entry = await getDiaryEntry(id)
  if (!entry) return
  await writeDiaryEntry({ ...entry, deletedAt: null, updatedAt: Date.now() })
}

/** 彻底删除 */
export async function deleteDiaryEntryForever(id: string): Promise<void> {
  await removeDiaryEntry(id)
}

/** 清空回收站 */
export async function emptyDiaryRecycleBin(): Promise<number> {
  const all = await readAllDiaryEntries()
  const kept = all.filter((entry) => !entry.deletedAt)
  const removed = all.length - kept.length
  if (removed > 0) await replaceAllDiaryEntries(kept)
  return removed
}

export async function toggleDiaryPin(id: string): Promise<DiaryEntry | null> {
  const entry = await getDiaryEntry(id)
  if (!entry) return null
  const next = { ...entry, pinned: !entry.pinned, updatedAt: Date.now() }
  await writeDiaryEntry(next)
  return next
}

/** 按日期分组，日期倒序 */
export function groupDiaryEntriesByDate(entries: DiaryEntry[]): DiaryDayGroup[] {
  const map = new Map<string, DiaryEntry[]>()
  entries.forEach((entry) => {
    const list = map.get(entry.date) || []
    list.push(entry)
    map.set(entry.date, list)
  })
  return Array.from(map.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([date, list]) => ({
      date,
      entries: list.sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
        return b.createdAt - a.createdAt
      }),
    }))
}

/** 所有出现过的标签及使用次数 */
export function collectDiaryTags(entries: DiaryEntry[]): DiaryTagCount[] {
  const map = new Map<string, number>()
  entries.forEach((entry) => {
    entry.tags.forEach((tag) => {
      map.set(tag, (map.get(tag) || 0) + 1)
    })
  })
  return Array.from(map.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
}

function buildHeatmap(countMap: Record<string, number>): DiaryStats["heatmap"] {
  const today = dayjs().startOf("day")
  // 以周一为一周起点，展示最近 12 周（含本周）
  const monday = today.subtract((today.day() + 6) % 7, "day")
  const start = monday.subtract(11, "week")
  const result: DiaryStats["heatmap"] = []
  for (let index = 0; index < 84; index++) {
    const date = start.add(index, "day").format("YYYY-MM-DD")
    result.push({ date, count: countMap[date] || 0 })
  }
  return result
}

export async function getDiaryStats(): Promise<DiaryStats> {
  const all = await readAllDiaryEntries()
  const active = all.filter((entry) => !entry.deletedAt)
  const dateSet = new Set(active.map((entry) => entry.date))
  const monthKey = dayjs().format("YYYY-MM")

  const moodCounts = DIARY_MOODS.reduce(
    (result, mood) => {
      result[mood.key] = 0
      return result
    },
    {} as Record<DiaryMoodKey, number>,
  )

  const countMap: Record<string, number> = {}
  active.forEach((entry) => {
    moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1
    countMap[entry.date] = (countMap[entry.date] || 0) + 1
  })

  let streak = 0
  let cursor = dayjs().startOf("day")
  if (!dateSet.has(cursor.format("YYYY-MM-DD"))) cursor = cursor.subtract(1, "day")
  while (dateSet.has(cursor.format("YYYY-MM-DD"))) {
    streak += 1
    cursor = cursor.subtract(1, "day")
  }

  return {
    total: active.length,
    days: dateSet.size,
    streak,
    monthCount: active.filter((entry) => entry.date.startsWith(monthKey)).length,
    deleted: all.length - active.length,
    moodCounts,
    tagCounts: collectDiaryTags(active),
    heatmap: buildHeatmap(countMap),
  }
}

export async function exportDiaryData(): Promise<DiaryExportPayload> {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    entries: await readAllDiaryEntries(),
  }
}

function sanitizeImportedEntry(raw: any): DiaryEntry | null {
  if (!raw || typeof raw !== "object") return null
  const date = dayjs(raw.date)
  if (!date.isValid()) return null
  const now = Date.now()
  return {
    id: String(raw.id || createId()),
    title: String(raw.title || ""),
    content: String(raw.content || ""),
    date: date.format("YYYY-MM-DD"),
    mood: normalizeMood(raw.mood),
    weather: (typeof raw.weather === "string" ? raw.weather : "") as DiaryWeatherKey | "",
    tags: normalizeTags(Array.isArray(raw.tags) ? raw.tags.map(String) : []),
    images: Array.isArray(raw.images) ? raw.images.map(String) : [],
    pinned: !!raw.pinned,
    createdAt: Number(raw.createdAt) || now,
    updatedAt: Number(raw.updatedAt) || now,
    deletedAt: raw.deletedAt ? Number(raw.deletedAt) : null,
  }
}

/**
 * 校验并规范化备份里的日记条目。
 * 同时供日记页单独导入和「我的」统一备份使用；
 * 支持 `{ entries }` 和纯数组两种旧格式。
 */
export function normalizeDiaryBackupEntries(payload: unknown): DiaryEntry[] {
  const source = Array.isArray(payload) ? payload : (payload as any)?.entries
  if (!Array.isArray(source)) throw new Error("备份文件格式不正确")

  const entries = source
    .map((item) => sanitizeImportedEntry(item))
    .filter((item): item is DiaryEntry => !!item)
  if (!entries.length && source.length > 0) throw new Error("备份文件中没有可导入的日记")
  return entries
}

/** 导入备份，会整体替换当前日记数据 */
export async function importDiaryData(payload: unknown): Promise<number> {
  const entries = normalizeDiaryBackupEntries(payload)
  await replaceAllDiaryEntries(entries)
  return entries.length
}
