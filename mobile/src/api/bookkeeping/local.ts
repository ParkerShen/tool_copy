/**
 * 本地接口实现：语义与 serveradmin 的 /api/miniapp/bookkeepings/* 保持一致，
 * 数据由页面内的 SQLite（sql.js）提供，不发起任何网络请求。
 */
import type { Database } from "sql.js"
import {
  clearDatabase,
  createSnapshot,
  deleteSnapshot,
  exportSqliteFile,
  getDb,
  importSqliteFile,
  isMemoryOnly,
  listSnapshots,
  restoreSnapshot,
  runWrite,
} from "./db"
import * as sql from "./sql"
import type { BackupPayload } from "./sql"
import {
  countSavedTagDiaries,
  isTagDiaryData,
  readTagDiaryData,
  writeTagDiaryData,
  type TagDiaryData,
} from "@/utils/toolData"
import { normalizeDiaryBackupEntries } from "@/api/diary"
import { readAllDiaryEntries, replaceAllDiaryEntries } from "@/api/diary/storage"
import type { DiaryEntry } from "@/api/diary/types"
import type {
  Account,
  AccountBalance,
  AccountPeriodStats,
  ApiMessageResult,
  ApiResult,
  CalendarDayStat,
  Category,
  CategoryStat,
  CreateAccountRequest,
  CreateCategoryRequest,
  CreateRecordRequest,
  DailyRecord,
  DailyRecordGroup,
  DailyStat,
  DateRange,
  LocalDatabaseStats,
  MonthlyStatsResult,
  RangeStats,
  RecordFilters,
  RecordSearchFilters,
  TagUsage,
  UpdateAccountRequest,
  UpdateCategoryRequest,
  UpdateRecordRequest,
} from "./types"

function toError(error: unknown): Error {
  if (error instanceof Error) return error
  return new Error(typeof error === "string" ? error : "本地数据操作失败")
}

async function read<T>(fn: (db: Database) => T): Promise<ApiResult<T>> {
  try {
    const db = await getDb()
    return { code: 200, data: fn(db) }
  } catch (error) {
    throw toError(error)
  }
}

async function write<T>(fn: (db: Database) => T): Promise<ApiResult<T>> {
  try {
    const data = await runWrite(fn)
    return { code: 200, data }
  } catch (error) {
    throw toError(error)
  }
}

/** 获取月度统计数据 */
export function getMonthlyStats(month: string): Promise<ApiResult<MonthlyStatsResult>> {
  return read((db) => sql.getMonthlyStats(db, month))
}

/** 获取每日记录列表 */
export function getDailyRecords(month: string): Promise<ApiResult<DailyRecordGroup[]>> {
  return read((db) => sql.getDailyRecords(db, month) as DailyRecordGroup[])
}

/** 按日期范围 / 类型 / 账户 / 分类筛选记录 */
export function listRecordGroups(filters: RecordFilters): Promise<ApiResult<DailyRecordGroup[]>> {
  return read((db) => sql.listRecordGroups(db, filters) as DailyRecordGroup[])
}

/** 关键词搜索记录（类别 / 标签 / 备注 / 金额） */
export function searchRecordGroups(
  filters: RecordSearchFilters,
): Promise<ApiResult<DailyRecordGroup[]>> {
  return read((db) => sql.searchRecordGroups(db, filters) as DailyRecordGroup[])
}

/** 某月每天的收支汇总（日历页） */
export function getCalendarMonth(month: string): Promise<ApiResult<CalendarDayStat[]>> {
  return read((db) => sql.getCalendarMonth(db, month) as CalendarDayStat[])
}

/** 获取单条记录（编辑页预填） */
export function getRecord(id: string | number): Promise<ApiResult<DailyRecord | null>> {
  return read((db) => sql.getRecord(db, String(id)) as DailyRecord | null)
}

/** 区间收支汇总（返回分） */
export function getRangeStats(
  range: DateRange,
  accountId?: string,
): Promise<ApiResult<RangeStats>> {
  return read((db) => sql.getRangeStats(db, range, accountId))
}

/** 记账记录的最早/最晚日期（统计页年份 tab 据此确定起点） */
export function getRecordDateRange(): Promise<
  ApiResult<{ firstRecordDate: string | null; lastRecordDate: string | null }>
> {
  return read((db) => sql.getRecordDateRange(db))
}

/** 分类排行（返回分与占比） */
export function getCategoryStats(
  type: "income" | "expense",
  range: DateRange,
  accountId?: string,
): Promise<ApiResult<CategoryStat[]>> {
  return read((db) => sql.getCategoryStats(db, type, range, accountId))
}

/** 某类型按日汇总 */
export function getDailyStats(
  params: DateRange & { type: "income" | "expense"; accountId?: string },
): Promise<ApiResult<DailyStat[]>> {
  return read((db) => sql.getDailyStats(db, params))
}

/** 获取月度图表数据 */
export function getMonthlyChartData(
  month: string,
  type: "income" | "expense" = "expense",
): Promise<ApiResult<number[]>> {
  return read((db) => sql.getMonthlyChartData(db, month, type))
}

/** 创建记账记录 */
export function createRecord(data: CreateRecordRequest): Promise<ApiResult<DailyRecord>> {
  return write((db) => sql.createRecord(db, data) as DailyRecord)
}

/** 更新记账记录 */
export function updateRecord(
  id: string | number,
  data: UpdateRecordRequest,
): Promise<ApiMessageResult> {
  return write((db) => {
    sql.updateRecord(db, String(id), data)
    return { code: 200, message: "更新成功" }
  }).then((result) => result.data)
}

/** 删除记账记录 */
export function deleteRecord(id: string | number): Promise<ApiMessageResult> {
  return write((db) => {
    sql.deleteRecord(db, String(id))
    return { code: 200, message: "删除成功" }
  }).then((result) => result.data)
}

/** 获取分类列表 */
export function getCategories(type?: "income" | "expense"): Promise<ApiResult<Category[]>> {
  return read((db) => sql.listCategories(db, type) as Category[])
}

/** 新增自定义分类 */
export function createCategory(data: CreateCategoryRequest): Promise<ApiResult<Category>> {
  return write((db) => sql.createCategory(db, data) as Category)
}

/** 更新分类（名称 / 图标 / 颜色 / 排序） */
export function updateCategory(
  id: string | number,
  data: UpdateCategoryRequest,
): Promise<ApiResult<Category>> {
  return write((db) => sql.updateCategory(db, String(id), data) as Category)
}

/** 删除自定义分类 */
export function deleteCategory(id: string | number): Promise<ApiMessageResult> {
  return write((db) => {
    sql.deleteCategory(db, String(id))
    return { code: 200, message: "删除成功" }
  }).then((result) => result.data)
}

/** 所有记录里出现过的标签 */
export function listTags(): Promise<ApiResult<TagUsage[]>> {
  return read((db) => sql.listTags(db))
}

/** 分类使用次数（key 为分类 id） */
export function getCategoryUsage(
  type?: "income" | "expense",
): Promise<ApiResult<Record<string, number>>> {
  return read((db) => sql.getCategoryUsage(db, type))
}

/** 账户列表 */
export function getAccounts(includeArchived = false): Promise<ApiResult<Account[]>> {
  return read((db) => sql.listAccounts(db, includeArchived) as Account[])
}

/** 账户列表 + 实时余额 */
export function getAccountBalances(includeArchived = false): Promise<ApiResult<AccountBalance[]>> {
  return read((db) => sql.getAccountBalances(db, includeArchived) as AccountBalance[])
}

/** 单个账户在区间内的收支与当前余额 */
export function getAccountStats(
  accountId: string,
  range?: DateRange,
): Promise<ApiResult<AccountPeriodStats>> {
  return read((db) => sql.getAccountStats(db, accountId, range))
}

/** 新增账户 */
export function createAccount(data: CreateAccountRequest): Promise<ApiResult<Account>> {
  return write((db) => sql.createAccount(db, data) as Account)
}

/** 更新账户 */
export function updateAccount(id: string, data: UpdateAccountRequest): Promise<ApiResult<Account>> {
  return write((db) => sql.updateAccount(db, id, data) as Account)
}

/** 归档 / 取消归档账户 */
export function archiveAccount(id: string, archived = true): Promise<ApiResult<Account>> {
  return write((db) => sql.archiveAccount(db, id, archived) as Account)
}

/** 删除账户（有记录或系统账户时拒绝） */
export function deleteAccount(id: string): Promise<ApiMessageResult> {
  return write((db) => {
    sql.deleteAccount(db, id)
    return { code: 200, message: "删除成功" }
  }).then((result) => result.data)
}

/** 数据库概览（记录数、分类数、大小等） */
export async function getDatabaseStats(): Promise<LocalDatabaseStats> {
  const db = await getDb()
  const stats = sql.getStats(db)
  const bytes = db.export()

  // 日记、标签日记不在 SQLite 里，需要单独统计
  let diaryCount = 0
  try {
    const entries = await readAllDiaryEntries()
    diaryCount = entries.filter((entry) => !entry.deletedAt).length
  } catch (error) {
    console.warn("[local] 统计日记数量失败:", error)
  }
  const tagDiaryCount = countSavedTagDiaries(readTagDiaryData())

  return {
    ...stats,
    diaryCount,
    tagDiaryCount,
    size: bytes.byteLength,
    memoryOnly: isMemoryOnly(),
  }
}

/** 导出 .sqlite 数据库文件 */
export function exportSqliteBackup(): Promise<Uint8Array> {
  return exportSqliteFile()
}

export type UnifiedBackupPayload = BackupPayload & {
  tools?: {
    tagDiary?: TagDiaryData
    diary?: DiaryEntry[]
  }
}

/** 导出 JSON 备份：记账、倒数日、收纳、日记、标签日记（不含 API Key） */
export async function exportJsonBackup(): Promise<UnifiedBackupPayload> {
  const db = await getDb()
  const payload: UnifiedBackupPayload = sql.exportJson(db)
  const tagDiary = readTagDiaryData()
  let diary: DiaryEntry[] | undefined
  try {
    diary = await readAllDiaryEntries()
  } catch (error) {
    console.warn("[local] 读取日记失败，JSON 备份暂不包含日记:", error)
  }
  if (tagDiary || diary) {
    payload.tools = {}
    if (tagDiary) payload.tools.tagDiary = tagDiary
    if (diary) payload.tools.diary = diary
  }
  return payload
}

/** 从统一 JSON 备份中取出标签日记；没有则返回 undefined */
function extractTagDiary(payload: unknown): TagDiaryData | undefined {
  if (!payload || typeof payload !== "object") return undefined
  const tools = (payload as { tools?: unknown }).tools
  if (!tools || typeof tools !== "object") return undefined
  const tagDiary = (tools as { tagDiary?: unknown }).tagDiary
  if (tagDiary === undefined || tagDiary === null) return undefined
  if (!isTagDiaryData(tagDiary)) {
    throw new Error("备份中的标签日记格式不正确")
  }
  return tagDiary
}

/** 从统一 JSON 备份中取出日记；没有该字段时返回 undefined（保留现有日记） */
function extractDiary(payload: unknown): DiaryEntry[] | undefined {
  if (!payload || typeof payload !== "object") return undefined
  const tools = (payload as { tools?: unknown }).tools
  if (!tools || typeof tools !== "object") return undefined
  const diary = (tools as { diary?: unknown }).diary
  if (diary === undefined || diary === null) return undefined
  try {
    return normalizeDiaryBackupEntries(diary)
  } catch (error) {
    const reason = error instanceof Error ? error.message : "格式不正确"
    throw new Error(`备份中的日记格式不正确：${reason}`)
  }
}

/** 从 .sqlite 文件恢复 */
export async function importSqliteBackup(bytes: Uint8Array): Promise<void> {
  try {
    await importSqliteFile(bytes)
  } catch (error) {
    throw toError(error)
  }
}

/** 从 JSON 备份恢复：先校验工具数据，再整体替换记账数据 */
export async function importJsonBackup(payload: unknown): Promise<void> {
  try {
    const tagDiary = extractTagDiary(payload)
    const diary = extractDiary(payload)
    try {
      await createSnapshot("safety")
    } catch (error) {
      console.warn("[local] 导入前创建快照失败:", error)
    }
    await runWrite((db) => sql.importJson(db, payload))
    if (tagDiary) {
      try {
        writeTagDiaryData(tagDiary)
      } catch (error) {
        const reason = error instanceof Error ? error.message : "未知错误"
        throw new Error(`记账数据已恢复，但标签日记恢复失败：${reason}`)
      }
    }
    if (diary !== undefined) {
      try {
        await replaceAllDiaryEntries(diary)
      } catch (error) {
        const reason = error instanceof Error ? error.message : "未知错误"
        throw new Error(`记账数据已恢复，但日记恢复失败：${reason}`)
      }
    }
  } catch (error) {
    throw toError(error)
  }
}

/** 清空记账数据，保留系统默认分类 */
export async function clearLocalDatabase(): Promise<void> {
  try {
    await clearDatabase()
  } catch (error) {
    throw toError(error)
  }
}

/** 立即创建一份本机快照 */
export async function createLocalSnapshot(): Promise<string> {
  try {
    return await createSnapshot("manual")
  } catch (error) {
    throw toError(error)
  }
}

/** 列出本机快照 */
export function listLocalSnapshots() {
  return listSnapshots()
}

/** 用某份快照恢复数据库 */
export async function restoreLocalSnapshot(key: string): Promise<void> {
  try {
    await restoreSnapshot(key)
  } catch (error) {
    throw toError(error)
  }
}

/** 删除某份快照 */
export async function deleteLocalSnapshot(key: string): Promise<void> {
  try {
    await deleteSnapshot(key)
  } catch (error) {
    throw toError(error)
  }
}

export {
  ACCOUNT_COLOR_OPTIONS,
  ACCOUNT_ICON_OPTIONS,
  ACCOUNT_TYPE_OPTIONS,
  CATEGORY_COLOR_OPTIONS,
  CATEGORY_ICON_OPTIONS,
  MAX_RECORD_IMAGES,
  MAX_RECORD_TAGS,
  MAX_TAG_LENGTH,
} from "./sql"
export type { BackupPayload, CategoryRecord, RecordRow } from "./sql"
export type { SnapshotInfo, SnapshotKind } from "./db"
