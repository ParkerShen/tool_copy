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
import type {
  ApiMessageResult,
  ApiResult,
  Category,
  CreateCategoryRequest,
  CreateRecordRequest,
  DailyRecord,
  DailyRecordGroup,
  LocalDatabaseStats,
  MonthlyStatsResult,
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
export function createCategory(
  data: CreateCategoryRequest,
): Promise<ApiResult<Category>> {
  return write((db) => sql.createCategory(db, data) as Category)
}

/** 删除自定义分类 */
export function deleteCategory(id: string | number): Promise<ApiMessageResult> {
  return write((db) => {
    sql.deleteCategory(db, String(id))
    return { code: 200, message: "删除成功" }
  }).then((result) => result.data)
}

/** 数据库概览（记录数、分类数、大小等） */
export async function getDatabaseStats(): Promise<LocalDatabaseStats> {
  const db = await getDb()
  const stats = sql.getStats(db)
  const bytes = db.export()
  return {
    ...stats,
    size: bytes.byteLength,
    memoryOnly: isMemoryOnly(),
  }
}

/** 导出 .sqlite 数据库文件 */
export function exportSqliteBackup(): Promise<Uint8Array> {
  return exportSqliteFile()
}

/** 导出 JSON 备份 */
export async function exportJsonBackup(): Promise<BackupPayload> {
  const db = await getDb()
  return sql.exportJson(db)
}

/** 从 .sqlite 文件恢复 */
export async function importSqliteBackup(bytes: Uint8Array): Promise<void> {
  try {
    await importSqliteFile(bytes)
  } catch (error) {
    throw toError(error)
  }
}

/** 从 JSON 备份恢复 */
export async function importJsonBackup(payload: unknown): Promise<void> {
  try {
    try {
      await createSnapshot("safety")
    } catch (error) {
      console.warn("[local] 导入前创建快照失败:", error)
    }
    await runWrite((db) => sql.importJson(db, payload))
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

export { CATEGORY_COLOR_OPTIONS, CATEGORY_ICON_OPTIONS } from "./sql"
export type { BackupPayload, CategoryRecord, RecordRow } from "./sql"
export type { SnapshotInfo, SnapshotKind } from "./db"
