/*
 * @Date: 2025-07-23 16:56:06
 * @LastEditors: parker 960822987@qq.com
 * @LastEditTime: 2025-07-24 15:37:51
 * @FilePath: \mobile\src\api\bookkeeping\index.ts
 *
 * 接口门面：根据构建模式在「本地 SQLite」与「远程 serveradmin」之间切换。
 * - standalone 构建（VITE_DATA_MODE=local）：全部操作在页面内完成；
 * - 其他构建（VITE_DATA_MODE=server）：保持原有 HTTP 行为。
 */
import * as localApi from "./local"
import type { SnapshotInfo, SnapshotKind } from "./db"
import type {
  Account,
  AccountBalance,
  AccountPeriodStats,
  ApiMessageResult,
  ApiResult,
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
  TagUsage,
  UpdateAccountRequest,
  UpdateCategoryRequest,
  UpdateRecordRequest,
} from "./types"

const useLocalData = import.meta.env.VITE_DATA_MODE !== "server"

function remoteApi() {
  return import("./remote")
}

function callRemote<T>(method: (api: typeof import("./remote")) => Promise<T>): Promise<T> {
  return remoteApi().then(method)
}

/**
 * 获取月度统计数据
 */
export function getMonthlyStats(month: string): Promise<ApiResult<MonthlyStatsResult>> {
  if (useLocalData) return localApi.getMonthlyStats(month)
  return callRemote((api) => api.getMonthlyStats(month))
}

/**
 * 获取每日记录列表
 */
export function getDailyRecords(month: string): Promise<ApiResult<DailyRecordGroup[]>> {
  if (useLocalData) return localApi.getDailyRecords(month)
  return callRemote((api) => api.getDailyRecords(month))
}

/**
 * 获取月度图表数据
 */
export function getMonthlyChartData(
  month: string,
  type: "income" | "expense" = "expense",
): Promise<ApiResult<number[]>> {
  if (useLocalData) return localApi.getMonthlyChartData(month, type)
  return callRemote((api) => api.getMonthlyChartData(month, type))
}

/**
 * 创建记账记录
 */
export function createRecord(data: CreateRecordRequest): Promise<ApiResult<DailyRecord>> {
  if (useLocalData) return localApi.createRecord(data)
  return callRemote((api) => api.createRecord(data))
}

/**
 * 更新记账记录
 */
export function updateRecord(
  id: string | number,
  data: UpdateRecordRequest,
): Promise<ApiMessageResult> {
  if (useLocalData) return localApi.updateRecord(id, data)
  return callRemote((api) => api.updateRecord(id, data))
}

/**
 * 删除记账记录
 */
export function deleteRecord(id: string | number): Promise<ApiMessageResult> {
  if (useLocalData) return localApi.deleteRecord(id)
  return callRemote((api) => api.deleteRecord(id))
}

/**
 * 获取分类列表
 */
export function getCategories(type?: "income" | "expense"): Promise<ApiResult<Category[]>> {
  if (useLocalData) return localApi.getCategories(type)
  return callRemote((api) => api.getCategories(type))
}

/**
 * 新增自定义分类
 */
export function createCategory(data: CreateCategoryRequest): Promise<ApiResult<Category>> {
  if (useLocalData) return localApi.createCategory(data)
  return callRemote((api) => api.createCategory(data))
}

/**
 * 更新分类（本地模式：名称 / 图标 / 颜色 / 排序）
 */
export function updateCategory(
  id: string | number,
  data: UpdateCategoryRequest,
): Promise<ApiResult<Category>> {
  if (useLocalData) return localApi.updateCategory(id, data)
  return Promise.reject(new Error("远程接口模式暂不支持在线修改分类"))
}

/**
 * 删除自定义分类
 */
export function deleteCategory(id: string | number): Promise<ApiMessageResult> {
  if (useLocalData) return localApi.deleteCategory(id)
  return callRemote((api) => api.deleteCategory(id))
}

// ---------------------------------------------------------------------------
// 记录筛选 / 统计（v2，本地模式）
// ---------------------------------------------------------------------------

/** 按范围 / 类型 / 账户 / 分类筛选记录 */
export function listRecordGroups(filters: RecordFilters): Promise<ApiResult<DailyRecordGroup[]>> {
  if (useLocalData) return localApi.listRecordGroups(filters)
  return Promise.reject(new Error("当前为远程接口模式，暂不支持组合筛选"))
}

/** 获取单条记录（编辑页预填） */
export function getRecord(id: string | number): Promise<ApiResult<DailyRecord | null>> {
  if (useLocalData) return localApi.getRecord(id)
  return Promise.reject(new Error("当前为远程接口模式，暂不支持读取单条记录"))
}

/** 区间收支汇总（分） */
export function getRangeStats(
  range: DateRange,
  accountId?: string,
): Promise<ApiResult<RangeStats>> {
  if (useLocalData) return localApi.getRangeStats(range, accountId)
  return Promise.reject(new Error("当前为远程接口模式，暂不支持区间统计"))
}

/** 分类排行（分） */
export function getCategoryStats(
  type: "income" | "expense",
  range: DateRange,
  accountId?: string,
): Promise<ApiResult<CategoryStat[]>> {
  if (useLocalData) return localApi.getCategoryStats(type, range, accountId)
  return Promise.reject(new Error("当前为远程接口模式，暂不支持分类统计"))
}

/** 某类型按日汇总（分） */
export function getDailyStats(
  params: DateRange & { type: "income" | "expense"; accountId?: string },
): Promise<ApiResult<DailyStat[]>> {
  if (useLocalData) return localApi.getDailyStats(params)
  return Promise.reject(new Error("当前为远程接口模式，暂不支持趋势统计"))
}

/** 所有记录里出现过的标签 */
export function listTags(): Promise<ApiResult<TagUsage[]>> {
  if (useLocalData) return localApi.listTags()
  return Promise.reject(new Error("当前为远程接口模式，暂不支持标签"))
}

/** 分类使用次数 */
export function getCategoryUsage(
  type?: "income" | "expense",
): Promise<ApiResult<Record<string, number>>> {
  if (useLocalData) return localApi.getCategoryUsage(type)
  return Promise.reject(new Error("当前为远程接口模式，暂不支持分类管理"))
}

// ---------------------------------------------------------------------------
// 账户（v2，本地模式）
// ---------------------------------------------------------------------------

/** 账户列表 */
export function getAccounts(includeArchived = false): Promise<ApiResult<Account[]>> {
  if (useLocalData) return localApi.getAccounts(includeArchived)
  return Promise.reject(new Error("当前为远程接口模式，暂不支持账户"))
}

/** 账户列表 + 实时余额 */
export function getAccountBalances(includeArchived = false): Promise<ApiResult<AccountBalance[]>> {
  if (useLocalData) return localApi.getAccountBalances(includeArchived)
  return Promise.reject(new Error("当前为远程接口模式，暂不支持账户"))
}

/** 单个账户区间统计与当前余额 */
export function getAccountStats(
  accountId: string,
  range?: DateRange,
): Promise<ApiResult<AccountPeriodStats>> {
  if (useLocalData) return localApi.getAccountStats(accountId, range)
  return Promise.reject(new Error("当前为远程接口模式，暂不支持账户"))
}

/** 新增账户 */
export function createAccount(data: CreateAccountRequest): Promise<ApiResult<Account>> {
  if (useLocalData) return localApi.createAccount(data)
  return Promise.reject(new Error("当前为远程接口模式，暂不支持账户"))
}

/** 更新账户 */
export function updateAccount(id: string, data: UpdateAccountRequest): Promise<ApiResult<Account>> {
  if (useLocalData) return localApi.updateAccount(id, data)
  return Promise.reject(new Error("当前为远程接口模式，暂不支持账户"))
}

/** 归档 / 取消归档账户 */
export function archiveAccount(id: string, archived = true): Promise<ApiResult<Account>> {
  if (useLocalData) return localApi.archiveAccount(id, archived)
  return Promise.reject(new Error("当前为远程接口模式，暂不支持账户"))
}

/** 删除账户 */
export function deleteAccount(id: string): Promise<ApiMessageResult> {
  if (useLocalData) return localApi.deleteAccount(id)
  return Promise.reject(new Error("当前为远程接口模式，暂不支持账户"))
}

// ---------------------------------------------------------------------------
// 本地数据库备份（仅 standalone 模式可用）
// ---------------------------------------------------------------------------

function assertLocalMode(): void {
  if (!useLocalData) {
    throw new Error("当前为远程接口模式，无法操作本地数据库")
  }
}

/** 本地数据库概览 */
export async function getDatabaseStats(): Promise<LocalDatabaseStats> {
  assertLocalMode()
  return localApi.getDatabaseStats()
}

/** 导出 .sqlite 数据库文件 */
export async function exportSqliteBackup(): Promise<Uint8Array> {
  assertLocalMode()
  return localApi.exportSqliteBackup()
}

/** 导出 JSON 备份 */
export async function exportJsonBackup() {
  assertLocalMode()
  return localApi.exportJsonBackup()
}

/** 从 .sqlite 文件恢复 */
export async function importSqliteBackup(bytes: Uint8Array): Promise<void> {
  assertLocalMode()
  return localApi.importSqliteBackup(bytes)
}

/** 从 JSON 备份恢复 */
export async function importJsonBackup(payload: unknown): Promise<void> {
  assertLocalMode()
  return localApi.importJsonBackup(payload)
}

/** 清空记账数据，保留系统默认分类 */
export async function clearLocalDatabase(): Promise<void> {
  assertLocalMode()
  return localApi.clearLocalDatabase()
}

/** 立即创建一份本机快照 */
export async function createLocalSnapshot(): Promise<string> {
  assertLocalMode()
  return localApi.createLocalSnapshot()
}

/** 列出本机自动/手动快照 */
export async function listLocalSnapshots() {
  assertLocalMode()
  return localApi.listLocalSnapshots()
}

/** 用某份快照恢复数据库 */
export async function restoreLocalSnapshot(key: string): Promise<void> {
  assertLocalMode()
  return localApi.restoreLocalSnapshot(key)
}

/** 删除某份快照 */
export async function deleteLocalSnapshot(key: string): Promise<void> {
  assertLocalMode()
  return localApi.deleteLocalSnapshot(key)
}

/** 是否是本地数据模式 */
export const isLocalDataMode = useLocalData

export {
  ACCOUNT_COLOR_OPTIONS,
  ACCOUNT_ICON_OPTIONS,
  ACCOUNT_TYPE_OPTIONS,
  CATEGORY_COLOR_OPTIONS,
  CATEGORY_ICON_OPTIONS,
  MAX_RECORD_IMAGES,
  MAX_RECORD_TAGS,
  MAX_TAG_LENGTH,
} from "./local"

// 导出类型
export type {
  Account,
  AccountBalance,
  AccountPeriodStats,
  AccountType,
  ApiMessageResult,
  ApiResult,
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
  RecordAccount,
  RecordFilters,
  TagUsage,
  UpdateAccountRequest,
  UpdateCategoryRequest,
  UpdateRecordRequest,
} from "./types"

export type { SnapshotInfo, SnapshotKind } from "./db"
