/**
 * 本地记账 SQLite 层。
 *
 * 纯 TypeScript + sql.js，不依赖浏览器 API，便于在 Node 中直接测试。
 * 表结构与 serveradmin/src/app/models/mini 保持一致（字段名转 snake_case）。
 * 所有函数接收一个已打开的 sql.js Database。
 *
 * schema v3：
 * - 新增 mini_bookkeeping_account（账户 + 期初余额，余额为派生值）；
 * - record 增加 amount_cents（整数分，统计以此为准）、account_id；
 * - record 增加 images（图片 data URL 数组）与 tags（标签数组）；
 * - 保留 amount REAL，写入时双写，保证旧代码/旧备份仍可读。
 */
import type { Database, SqlValue } from "sql.js"
import { MAX_AMOUNT_CENTS, centsToAmount, decimalToCents, roundAmountToCents } from "./money"

export const SCHEMA_VERSION = 3

/** 单条记录最多保存的图片数量 */
export const MAX_RECORD_IMAGES = 3
/** 单张图片（data URL）长度上限，约 1.1 MB */
export const MAX_IMAGE_DATA_LENGTH = 1_500_000
/** 单条记录最多保存的标签数量 */
export const MAX_RECORD_TAGS = 5
/** 单个标签最大字数 */
export const MAX_TAG_LENGTH = 8
export const APP_ID = "local-bookkeeping"
export const DEFAULT_USER_ID = "1"
export const DEFAULT_ACCOUNT_ID = "sys_account_cash"

export interface CategoryRecord {
  id: string
  name: string
  type: "income" | "expense"
  icon: string
  color: string
  sortOrder: number
  isSystem: boolean
  userId?: string
  createdAt: string
  updatedAt: string
  source: "system" | "custom"
}

export type AccountType = "cash" | "debit" | "credit" | "ewallet" | "other"

export interface AccountRecord {
  id: string
  userId?: string
  name: string
  type: AccountType
  icon: string
  color: string
  initialBalanceCents: number
  archived: boolean
  sortOrder: number
  isSystem: boolean
  createdAt: string
  updatedAt: string
}

export interface AccountBalance extends AccountRecord {
  incomeCents: number
  expenseCents: number
  balanceCents: number
  recordCount: number
}

export interface RecordCategory {
  name: string
  icon: string
  color: string
}

export interface RecordAccount {
  id: string
  name: string
  icon: string
  color: string
}

export interface RecordRow {
  id: string
  userId: string
  categoryId: string
  type: "income" | "expense"
  /** 元，保留两位小数字符串，兼容旧页面 */
  amount: string
  /** 整数分，统计与排序以此为准 */
  amountCents: number
  accountId: string
  title: string
  remark: string
  recordDate: string
  recordTime: string
  /** 图片 data URL 列表（最多 3 张） */
  images: string[]
  /** 标签列表（最多 5 个） */
  tags: string[]
  createdAt: string
  updatedAt: string
  category: RecordCategory
  systemCategory: RecordCategory
  account: RecordAccount
}

export interface DailyRecordGroup {
  date: string
  records: RecordRow[]
  dayIncome: number
  dayExpense: number
  dayIncomeCents: number
  dayExpenseCents: number
}

export interface MonthlyStats {
  income: number
  expense: number
}

export interface CreateRecordInput {
  categoryId: string | number
  type?: "income" | "expense"
  amount: number | string
  accountId?: string
  title?: string
  remark?: string
  recordDate: string
  recordTime?: string
  images?: string[]
  tags?: string[]
}

export interface CreateCategoryInput {
  name: string
  type: "income" | "expense"
  icon?: string
  color?: string
}

export interface UpdateCategoryInput {
  name?: string
  icon?: string
  color?: string
  sortOrder?: number
}

export interface CreateAccountInput {
  name: string
  type: AccountType
  icon?: string
  color?: string
  initialBalanceCents?: number
  sortOrder?: number
}

export interface UpdateAccountInput {
  name?: string
  type?: AccountType
  icon?: string
  color?: string
  initialBalanceCents?: number
  sortOrder?: number
  archived?: boolean
}

export interface DateRange {
  start: string
  end: string
}

export interface RecordFilters extends DateRange {
  type?: "income" | "expense"
  accountId?: string
  categoryId?: string
}

export interface RangeStats {
  incomeCents: number
  expenseCents: number
  netCents: number
  recordCount: number
}

export interface AccountPeriodStats extends RangeStats {
  accountId: string
  balanceCents: number
}

export interface CategoryStat {
  categoryId: string
  name: string
  icon: string
  color: string
  type: "income" | "expense"
  totalCents: number
  count: number
  /** 占同类型总支出的百分比（保留一位小数） */
  percent: number
}

export interface DailyStat {
  date: string
  amountCents: number
  count: number
}

export interface TagUsage {
  name: string
  count: number
}

export interface DatabaseStats {
  recordCount: number
  categoryCount: number
  customCategoryCount: number
  firstRecordDate: string | null
  lastRecordDate: string | null
  totalIncome: number
  totalExpense: number
}

export interface BackupAccount {
  id: string
  userId?: string
  name: string
  type: AccountType
  icon?: string
  color?: string
  initialBalanceCents?: number
  archived?: boolean
  sortOrder?: number
  isSystem?: boolean
  createdAt?: string
  updatedAt?: string
}

export interface BackupRecord {
  id: string
  userId?: string
  categoryId: string
  type: "income" | "expense"
  amount: number
  amountCents?: number
  accountId?: string
  title?: string
  remark?: string
  recordDate: string
  recordTime?: string
  images?: string[]
  tags?: string[]
  createdAt?: string
  updatedAt?: string
}

export interface BackupPayload {
  app: string
  schemaVersion: number
  exportedAt: string
  accounts?: BackupAccount[]
  categories: CategoryRecord[]
  records: BackupRecord[]
}

const DEFAULT_CATEGORIES: Array<
  Pick<CategoryRecord, "id" | "name" | "type" | "icon" | "color"> & { sortOrder: number }
> = [
  {
    id: "sys_expense_food",
    name: "餐饮",
    type: "expense",
    icon: "shop",
    color: "#FF6B6B",
    sortOrder: 1,
  },
  {
    id: "sys_expense_transport",
    name: "交通",
    type: "expense",
    icon: "location",
    color: "#4ECDC4",
    sortOrder: 2,
  },
  {
    id: "sys_expense_shopping",
    name: "购物",
    type: "expense",
    icon: "bags",
    color: "#45B7D1",
    sortOrder: 3,
  },
  {
    id: "sys_expense_entertainment",
    name: "娱乐",
    type: "expense",
    icon: "star",
    color: "#96CEB4",
    sortOrder: 4,
  },
  {
    id: "sys_expense_housing",
    name: "住房",
    type: "expense",
    icon: "home",
    color: "#F7B731",
    sortOrder: 5,
  },
  {
    id: "sys_expense_medical",
    name: "医疗",
    type: "expense",
    icon: "heart",
    color: "#DDA0DD",
    sortOrder: 6,
  },
  {
    id: "sys_income_salary",
    name: "工资",
    type: "income",
    icon: "wallet",
    color: "#55A3FF",
    sortOrder: 1,
  },
  {
    id: "sys_income_parttime",
    name: "兼职",
    type: "income",
    icon: "service",
    color: "#26D0CE",
    sortOrder: 2,
  },
  {
    id: "sys_income_other",
    name: "其他收入",
    type: "income",
    icon: "gift",
    color: "#FDCB6E",
    sortOrder: 3,
  },
]

/** 分类创建弹窗中可选的图标（均为 wot-design-uni 内置图标名） */
export const CATEGORY_ICON_OPTIONS = [
  "shop",
  "location",
  "bags",
  "star",
  "home",
  "heart",
  "wallet",
  "service",
  "gift",
  "money-circle",
  "goods",
  "tools",
  "phone",
  "books",
  "flag",
  "camera",
  "photo",
  "edit",
  "more",
  "cart",
]

/** 分类创建弹窗中可选的颜色 */
export const CATEGORY_COLOR_OPTIONS = [
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#96CEB4",
  "#F7B731",
  "#DDA0DD",
  "#55A3FF",
  "#26D0CE",
  "#FDCB6E",
  "#FF9F43",
  "#EE5A6F",
  "#7B68EE",
]

/** 账户图标（均来自 wot-design-uni 内置图标） */
export const ACCOUNT_ICON_OPTIONS = [
  "money-circle",
  "wallet",
  "shop",
  "home",
  "star",
  "service",
  "goods",
  "phone",
  "books",
  "flag",
]

export const ACCOUNT_COLOR_OPTIONS = CATEGORY_COLOR_OPTIONS

export const ACCOUNT_TYPE_OPTIONS: Array<{ value: AccountType; label: string }> = [
  { value: "cash", label: "现金" },
  { value: "debit", label: "储蓄卡" },
  { value: "credit", label: "信用卡" },
  { value: "ewallet", label: "电子钱包" },
  { value: "other", label: "其他" },
]

const DEFAULT_ACCOUNT: Pick<
  AccountRecord,
  "id" | "name" | "type" | "icon" | "color" | "initialBalanceCents" | "sortOrder" | "isSystem"
> = {
  id: DEFAULT_ACCOUNT_ID,
  name: "现金",
  type: "cash",
  icon: "money-circle",
  color: "#F7B731",
  initialBalanceCents: 0,
  sortOrder: 0,
  isSystem: true,
}

function assertAccountType(type: unknown): asserts type is AccountType {
  if (!ACCOUNT_TYPE_OPTIONS.some((option) => option.value === type)) {
    throw new Error("账户类型不正确")
  }
}

/** 生成 UUID；局域网 HTTP 下 crypto.randomUUID 不可用，做降级处理 */
export function generateId(): string {
  const cryptoObj = (globalThis as any).crypto
  if (cryptoObj && typeof cryptoObj.randomUUID === "function") {
    return cryptoObj.randomUUID()
  }
  const bytes = new Uint8Array(16)
  if (cryptoObj && typeof cryptoObj.getRandomValues === "function") {
    cryptoObj.getRandomValues(bytes)
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256)
    }
  }
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

function pad2(value: number): string {
  return String(value).padStart(2, "0")
}

function nowString(): string {
  const d = new Date()
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(
    d.getHours(),
  )}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
}

function todayString(): string {
  const d = new Date()
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function roundMoney(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function monthRange(month: string): { start: string; end: string; days: number } {
  if (!/^\d{4}-\d{2}$/.test(month)) {
    throw new Error("月份格式应为 YYYY-MM")
  }
  const [year, monthIndex] = month.split("-").map(Number)
  if (monthIndex < 1 || monthIndex > 12) {
    throw new Error("月份格式应为 YYYY-MM")
  }
  const days = new Date(year, monthIndex, 0).getDate()
  return {
    start: `${month}-01`,
    end: `${month}-${pad2(days)}`,
    days,
  }
}

function queryAll(db: Database, sql: string, params: SqlValue[] = []): Record<string, SqlValue>[] {
  const stmt = db.prepare(sql)
  try {
    if (params.length > 0) stmt.bind(params)
    const rows: Record<string, SqlValue>[] = []
    while (stmt.step()) {
      rows.push(stmt.getAsObject() as Record<string, SqlValue>)
    }
    return rows
  } finally {
    stmt.free()
  }
}

function queryOne(
  db: Database,
  sql: string,
  params: SqlValue[] = [],
): Record<string, SqlValue> | null {
  const rows = queryAll(db, sql, params)
  return rows.length > 0 ? rows[0] : null
}

function asString(value: SqlValue | undefined, fallback = ""): string {
  if (value === null || value === undefined) return fallback
  return String(value)
}

function asNumber(value: SqlValue | undefined, fallback = 0): number {
  if (value === null || value === undefined) return fallback
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

function parseStringArray(value: SqlValue | undefined, limit = 20): string[] {
  const text = asString(value)
  if (!text) return []
  try {
    const parsed = JSON.parse(text)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((item): item is string => typeof item === "string" && item.length > 0)
      .slice(0, limit)
  } catch {
    return []
  }
}

/** 图片只接受 data URL，随 .sqlite / JSON 备份一起迁移 */
function normalizeImages(input: string[] | undefined): string[] {
  if (input === undefined) return []
  if (!Array.isArray(input)) throw new Error("图片格式不正确")
  if (input.length > MAX_RECORD_IMAGES) {
    throw new Error(`每条记录最多 ${MAX_RECORD_IMAGES} 张图片`)
  }
  const images: string[] = []
  for (const raw of input) {
    const url = String(raw ?? "")
    if (!url) continue
    if (!/^data:image\/[\w.+-]+;base64,/i.test(url)) {
      throw new Error("图片格式不支持，请重新选择")
    }
    if (url.length > MAX_IMAGE_DATA_LENGTH) {
      throw new Error("图片太大，请重新选择")
    }
    if (!images.includes(url)) images.push(url)
  }
  return images
}

function normalizeTags(input: string[] | undefined): string[] {
  if (input === undefined) return []
  if (!Array.isArray(input)) throw new Error("标签格式不正确")
  const tags: string[] = []
  for (const raw of input) {
    const tag = String(raw ?? "")
      .trim()
      .replace(/^#/, "")
    if (!tag) continue
    if (tag.length > MAX_TAG_LENGTH) {
      throw new Error(`单个标签不超过 ${MAX_TAG_LENGTH} 个字`)
    }
    if (!tags.includes(tag)) tags.push(tag)
  }
  if (tags.length > MAX_RECORD_TAGS) {
    throw new Error(`每条记录最多 ${MAX_RECORD_TAGS} 个标签`)
  }
  return tags
}

function tableColumns(db: Database, table: string): Set<string> {
  const rows = queryAll(db, `PRAGMA table_info("${table}")`)
  return new Set(rows.map((row) => asString(row.name)))
}

function getUserVersion(db: Database): number {
  const row = queryOne(db, "PRAGMA user_version")
  if (!row) return 0
  return asNumber(Object.values(row)[0])
}

const ACCOUNT_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS mini_bookkeeping_account (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('cash','debit','credit','ewallet','other')),
    icon TEXT,
    color TEXT DEFAULT '#409eff',
    initial_balance_cents INTEGER NOT NULL DEFAULT 0,
    archived INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    is_system INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`

/** 建表；旧库会在这里补齐缺失的列与账户表 */
export function initSchema(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS mini_bookkeeping_category (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('income','expense')),
      icon TEXT,
      color TEXT DEFAULT '#409eff',
      sort_order INTEGER DEFAULT 0,
      is_system INTEGER DEFAULT 0,
      user_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS mini_bookkeeping_record (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT '1',
      category_id TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('income','expense')),
      amount REAL NOT NULL,
      amount_cents INTEGER NOT NULL DEFAULT 0,
      account_id TEXT,
      title TEXT,
      remark TEXT,
      record_date TEXT NOT NULL,
      record_time TEXT,
      images TEXT NOT NULL DEFAULT '[]',
      tags TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    ${ACCOUNT_TABLE_SQL}

    CREATE INDEX IF NOT EXISTS idx_record_date ON mini_bookkeeping_record(record_date);
    CREATE INDEX IF NOT EXISTS idx_record_category ON mini_bookkeeping_record(category_id);
    CREATE INDEX IF NOT EXISTS idx_category_type ON mini_bookkeeping_category(type);
  `)

  // 旧库可能还没有 account_id，必须等迁移补列后再建账户索引
  migrateSchema(db)

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_record_account ON mini_bookkeeping_record(account_id);
    CREATE INDEX IF NOT EXISTS idx_record_account_date
      ON mini_bookkeeping_record(account_id, record_date);
  `)
}

/** 逐行回填 amount_cents；同时修复只完成了一半的迁移 */
function backfillRecordCents(db: Database): void {
  const rows = queryAll(
    db,
    "SELECT id, amount, amount_cents FROM mini_bookkeeping_record WHERE amount_cents = 0 AND amount <> 0",
  )
  if (rows.length === 0) return
  const stmt = db.prepare("UPDATE mini_bookkeeping_record SET amount_cents = ? WHERE id = ?")
  try {
    for (const row of rows) {
      // 旧数据可能带浮点误差，直接用数值四舍五入，不再经过字符串解析
      const cents = roundAmountToCents(asNumber(row.amount))
      if (cents !== 0) {
        stmt.run([cents, asString(row.id)])
      }
    }
  } finally {
    stmt.free()
  }
}

/**
 * schema v2 迁移：只加列、不删列，可重复执行。
 * 不依赖 user_version 判断是否缺列——导入的旧库版本号可能不可信。
 */
export function migrateSchema(db: Database): void {
  db.run(ACCOUNT_TABLE_SQL)
  const columns = tableColumns(db, "mini_bookkeeping_record")
  if (columns.size === 0) return

  const needsAmountCents = !columns.has("amount_cents")
  const needsAccountId = !columns.has("account_id")
  const needsImages = !columns.has("images")
  const needsTags = !columns.has("tags")
  const version = getUserVersion(db)

  if (
    !needsAmountCents &&
    !needsAccountId &&
    !needsImages &&
    !needsTags &&
    version >= SCHEMA_VERSION
  ) {
    // 已迁移过：顺手修复异常行与未关联账户的记录，保证幂等
    seedDefaultAccount(db)
    backfillRecordCents(db)
    db.run(
      "UPDATE mini_bookkeeping_record SET account_id = ? WHERE account_id IS NULL OR account_id = ''",
      [DEFAULT_ACCOUNT_ID],
    )
    db.run(
      "UPDATE mini_bookkeeping_record SET images = '[]' WHERE images IS NULL OR images = ''",
    )
    db.run("UPDATE mini_bookkeeping_record SET tags = '[]' WHERE tags IS NULL OR tags = ''")
    return
  }

  db.run("BEGIN TRANSACTION")
  try {
    if (needsAmountCents) {
      db.run(
        "ALTER TABLE mini_bookkeeping_record ADD COLUMN amount_cents INTEGER NOT NULL DEFAULT 0",
      )
    }
    if (needsAccountId) {
      db.run("ALTER TABLE mini_bookkeeping_record ADD COLUMN account_id TEXT")
    }
    if (needsImages) {
      db.run("ALTER TABLE mini_bookkeeping_record ADD COLUMN images TEXT NOT NULL DEFAULT '[]'")
    }
    if (needsTags) {
      db.run("ALTER TABLE mini_bookkeeping_record ADD COLUMN tags TEXT NOT NULL DEFAULT '[]'")
    }

    seedDefaultAccount(db)
    backfillRecordCents(db)

    db.run(
      "UPDATE mini_bookkeeping_record SET account_id = ? WHERE account_id IS NULL OR account_id = ''",
      [DEFAULT_ACCOUNT_ID],
    )
    db.run(
      "UPDATE mini_bookkeeping_record SET images = '[]' WHERE images IS NULL OR images = ''",
    )
    db.run("UPDATE mini_bookkeeping_record SET tags = '[]' WHERE tags IS NULL OR tags = ''")
    db.run("CREATE INDEX IF NOT EXISTS idx_record_account ON mini_bookkeeping_record(account_id)")
    db.run(
      "CREATE INDEX IF NOT EXISTS idx_record_account_date ON mini_bookkeeping_record(account_id, record_date)",
    )
    db.run(`PRAGMA user_version = ${SCHEMA_VERSION}`)
    db.run("COMMIT")
  } catch (error) {
    try {
      db.run("ROLLBACK")
    } catch {
      // 回滚失败时保留原始错误
    }
    throw error
  }
}

function seedDefaultAccount(db: Database): void {
  const now = nowString()
  db.run(
    `INSERT OR IGNORE INTO mini_bookkeeping_account
      (id, user_id, name, type, icon, color, initial_balance_cents, archived, sort_order, is_system, created_at, updated_at)
     VALUES (?, NULL, ?, ?, ?, ?, ?, 0, ?, 1, ?, ?)`,
    [
      DEFAULT_ACCOUNT.id,
      DEFAULT_ACCOUNT.name,
      DEFAULT_ACCOUNT.type,
      DEFAULT_ACCOUNT.icon,
      DEFAULT_ACCOUNT.color,
      DEFAULT_ACCOUNT.initialBalanceCents,
      DEFAULT_ACCOUNT.sortOrder,
      now,
      now,
    ],
  )
}

/** 播种默认分类与默认账户；已存在的不会被覆盖 */
export function seedDefaults(db: Database): void {
  const now = nowString()
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO mini_bookkeeping_category
      (id, name, type, icon, color, sort_order, is_system, user_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, NULL, ?, ?)
  `)
  try {
    for (const category of DEFAULT_CATEGORIES) {
      stmt.run([
        category.id,
        category.name,
        category.type,
        category.icon,
        category.color,
        category.sortOrder,
        now,
        now,
      ])
    }
  } finally {
    stmt.free()
  }
  seedDefaultAccount(db)
}

function mapCategory(row: Record<string, SqlValue>): CategoryRecord {
  const isSystem = asNumber(row.is_system) === 1
  return {
    id: asString(row.id),
    name: asString(row.name),
    type: asString(row.type) === "income" ? "income" : "expense",
    icon: asString(row.icon, "star"),
    color: asString(row.color, "#409eff"),
    sortOrder: asNumber(row.sort_order),
    isSystem,
    userId: row.user_id === null || row.user_id === undefined ? undefined : String(row.user_id),
    createdAt: asString(row.created_at),
    updatedAt: asString(row.updated_at),
    source: isSystem ? "system" : "custom",
  }
}

function getCategoryById(db: Database, id: string): CategoryRecord | null {
  const row = queryOne(db, "SELECT * FROM mini_bookkeeping_category WHERE id = ?", [id])
  return row ? mapCategory(row) : null
}

/** 分类列表；系统分类在前，自定义分类按 sortOrder 排列 */
export function listCategories(db: Database, type?: "income" | "expense"): CategoryRecord[] {
  const params: SqlValue[] = []
  let where = ""
  if (type) {
    where = "WHERE type = ?"
    params.push(type)
  }
  const rows = queryAll(
    db,
    `SELECT * FROM mini_bookkeeping_category ${where}
     ORDER BY is_system DESC, sort_order ASC, created_at ASC`,
    params,
  )
  return rows.map(mapCategory)
}

function mapAccount(row: Record<string, SqlValue>): AccountRecord {
  const rawType = asString(row.type)
  const type: AccountType = ACCOUNT_TYPE_OPTIONS.some((option) => option.value === rawType)
    ? (rawType as AccountType)
    : "other"
  return {
    id: asString(row.id),
    userId: row.user_id === null || row.user_id === undefined ? undefined : String(row.user_id),
    name: asString(row.name),
    type,
    icon: asString(row.icon, "money-circle"),
    color: asString(row.color, "#F7B731"),
    initialBalanceCents: Math.trunc(asNumber(row.initial_balance_cents)),
    archived: asNumber(row.archived) === 1,
    sortOrder: asNumber(row.sort_order),
    isSystem: asNumber(row.is_system) === 1,
    createdAt: asString(row.created_at),
    updatedAt: asString(row.updated_at),
  }
}

function getAccountById(db: Database, id: string): AccountRecord | null {
  const row = queryOne(db, "SELECT * FROM mini_bookkeeping_account WHERE id = ?", [id])
  return row ? mapAccount(row) : null
}

/** 账户列表；默认账户在前，归档账户在最后 */
export function listAccounts(db: Database, includeArchived = false): AccountRecord[] {
  const where = includeArchived ? "" : "WHERE archived = 0"
  const rows = queryAll(
    db,
    `SELECT * FROM mini_bookkeeping_account ${where}
     ORDER BY is_system DESC, archived ASC, sort_order ASC, created_at ASC`,
  )
  return rows.map(mapAccount)
}

export function getAccount(db: Database, id: string): AccountRecord | null {
  return getAccountById(db, String(id))
}

function normalizeInitialBalance(input: number | undefined): number {
  if (input === undefined || input === null) return 0
  if (!Number.isFinite(Number(input))) throw new Error("期初余额不正确")
  const cents = Math.trunc(Number(input))
  if (Math.abs(cents) > MAX_AMOUNT_CENTS) throw new Error("期初余额过大")
  return cents
}

/** 新增账户 */
export function createAccount(db: Database, input: CreateAccountInput): AccountRecord {
  const name = (input.name ?? "").trim()
  if (!name) throw new Error("请输入账户名称")
  if (name.length > 12) throw new Error("账户名称不超过 12 个字")
  assertAccountType(input.type)

  const duplicated = queryOne(db, "SELECT id FROM mini_bookkeeping_account WHERE name = ?", [name])
  if (duplicated) throw new Error("该账户已存在")

  const now = nowString()
  const id = generateId()
  const maxRow = queryOne(db, "SELECT MAX(sort_order) AS max_order FROM mini_bookkeeping_account")
  const sortOrder = input.sortOrder ?? asNumber(maxRow?.max_order) + 1

  db.run(
    `INSERT INTO mini_bookkeeping_account
      (id, user_id, name, type, icon, color, initial_balance_cents, archived, sort_order, is_system, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, 0, ?, ?)`,
    [
      id,
      DEFAULT_USER_ID,
      name,
      input.type,
      input.icon || "money-circle",
      input.color || "#F7B731",
      normalizeInitialBalance(input.initialBalanceCents),
      sortOrder,
      now,
      now,
    ],
  )

  const created = getAccountById(db, id)
  if (!created) throw new Error("账户创建失败")
  return created
}

/** 更新账户（默认账户不可归档/删除，但可改名） */
export function updateAccount(db: Database, id: string, patch: UpdateAccountInput): AccountRecord {
  const existing = getAccountById(db, String(id))
  if (!existing) throw new Error("账户不存在")

  const sets: string[] = []
  const params: SqlValue[] = []

  if (patch.name !== undefined) {
    const name = patch.name.trim()
    if (!name) throw new Error("请输入账户名称")
    if (name.length > 12) throw new Error("账户名称不超过 12 个字")
    const duplicated = queryOne(
      db,
      "SELECT id FROM mini_bookkeeping_account WHERE name = ? AND id <> ?",
      [name, existing.id],
    )
    if (duplicated) throw new Error("该账户已存在")
    sets.push("name = ?")
    params.push(name)
  }

  if (patch.type !== undefined) {
    assertAccountType(patch.type)
    sets.push("type = ?")
    params.push(patch.type)
  }

  if (patch.icon !== undefined) {
    sets.push("icon = ?")
    params.push(patch.icon || "money-circle")
  }

  if (patch.color !== undefined) {
    sets.push("color = ?")
    params.push(patch.color || "#F7B731")
  }

  if (patch.initialBalanceCents !== undefined) {
    sets.push("initial_balance_cents = ?")
    params.push(normalizeInitialBalance(patch.initialBalanceCents))
  }

  if (patch.sortOrder !== undefined) {
    sets.push("sort_order = ?")
    params.push(Math.trunc(Number(patch.sortOrder) || 0))
  }

  if (patch.archived !== undefined) {
    if (existing.isSystem && patch.archived) {
      throw new Error("默认账户不能归档")
    }
    sets.push("archived = ?")
    params.push(patch.archived ? 1 : 0)
  }

  if (sets.length === 0) return existing

  sets.push("updated_at = ?")
  params.push(nowString())
  params.push(existing.id)

  db.run(`UPDATE mini_bookkeeping_account SET ${sets.join(", ")} WHERE id = ?`, params)

  const updated = getAccountById(db, existing.id)
  if (!updated) throw new Error("账户不存在")
  return updated
}

/** 归档 / 取消归档账户；归档后不出现在选择器中，历史记录仍保留 */
export function archiveAccount(db: Database, id: string, archived = true): AccountRecord {
  return updateAccount(db, id, { archived })
}

/** 删除账户：仅未被任何记录引用且非默认账户 */
export function deleteAccount(db: Database, id: string): void {
  const account = getAccountById(db, String(id))
  if (!account) throw new Error("账户不存在")
  if (account.isSystem) throw new Error("默认账户无法删除")

  const used = queryOne(
    db,
    "SELECT COUNT(*) AS total FROM mini_bookkeeping_record WHERE account_id = ?",
    [account.id],
  )
  if (used && asNumber(used.total) > 0) {
    throw new Error("该账户下有记录，无法删除，可改为归档")
  }

  db.run("DELETE FROM mini_bookkeeping_account WHERE id = ?", [account.id])
}

/** 账户余额：期初 + 收入 − 支出；余额不落库，始终按记录实时计算 */
export function getAccountBalances(db: Database, includeArchived = false): AccountBalance[] {
  const where = includeArchived ? "" : "WHERE a.archived = 0"
  const rows = queryAll(
    db,
    `SELECT a.*,
            COALESCE(SUM(CASE WHEN r.type = 'income' THEN r.amount_cents ELSE 0 END), 0) AS income_cents,
            COALESCE(SUM(CASE WHEN r.type = 'expense' THEN r.amount_cents ELSE 0 END), 0) AS expense_cents,
            COUNT(r.id) AS record_count
     FROM mini_bookkeeping_account a
     LEFT JOIN mini_bookkeeping_record r ON r.account_id = a.id
     ${where}
     GROUP BY a.id
     ORDER BY a.is_system DESC, a.archived ASC, a.sort_order ASC, a.created_at ASC`,
  )

  return rows.map((row) => {
    const account = mapAccount(row)
    const incomeCents = asNumber(row.income_cents)
    const expenseCents = asNumber(row.expense_cents)
    return {
      ...account,
      incomeCents,
      expenseCents,
      balanceCents: account.initialBalanceCents + incomeCents - expenseCents,
      recordCount: asNumber(row.record_count),
    }
  })
}

/** 某账户在指定范围内的收支；balanceCents 为全生命周期余额 */
export function getAccountStats(
  db: Database,
  accountId: string,
  range?: DateRange,
): AccountPeriodStats {
  const account = getAccountById(db, String(accountId))
  if (!account) throw new Error("账户不存在")
  if (range) assertRange(range.start, range.end)

  const dateFilter = range ? " AND record_date BETWEEN ? AND ?" : ""
  const params: SqlValue[] = [account.id]
  if (range) params.push(range.start, range.end)

  const inRange = queryOne(
    db,
    `SELECT
       COALESCE(SUM(CASE WHEN type = 'income' THEN amount_cents ELSE 0 END), 0) AS income_cents,
       COALESCE(SUM(CASE WHEN type = 'expense' THEN amount_cents ELSE 0 END), 0) AS expense_cents,
       COUNT(*) AS record_count
     FROM mini_bookkeeping_record
     WHERE account_id = ?${dateFilter}`,
    params,
  )
  const lifetime = queryOne(
    db,
    `SELECT
       COALESCE(SUM(CASE WHEN type = 'income' THEN amount_cents ELSE 0 END), 0) AS income_cents,
       COALESCE(SUM(CASE WHEN type = 'expense' THEN amount_cents ELSE 0 END), 0) AS expense_cents
     FROM mini_bookkeeping_record
     WHERE account_id = ?`,
    [account.id],
  )

  const incomeCents = asNumber(inRange?.income_cents)
  const expenseCents = asNumber(inRange?.expense_cents)
  return {
    accountId: account.id,
    incomeCents,
    expenseCents,
    netCents: incomeCents - expenseCents,
    recordCount: asNumber(inRange?.record_count),
    balanceCents:
      account.initialBalanceCents +
      asNumber(lifetime?.income_cents) -
      asNumber(lifetime?.expense_cents),
  }
}

/** 月度收入 / 支出汇总 */
export function getMonthlyStats(db: Database, month: string): MonthlyStats {
  const { start, end } = monthRange(month)
  const rows = queryAll(
    db,
    `SELECT type, SUM(amount_cents) AS total
     FROM mini_bookkeeping_record
     WHERE user_id = ? AND record_date BETWEEN ? AND ?
     GROUP BY type`,
    [DEFAULT_USER_ID, start, end],
  )
  const result: MonthlyStats = { income: 0, expense: 0 }
  for (const row of rows) {
    if (asString(row.type) === "income") {
      result.income = roundMoney(asNumber(row.total) / 100)
    }
    if (asString(row.type) === "expense") {
      result.expense = roundMoney(asNumber(row.total) / 100)
    }
  }
  return result
}

/** 区间汇总（金额为分） */
export function getRangeStats(db: Database, range: DateRange, accountId?: string): RangeStats {
  assertRange(range.start, range.end)
  const params: SqlValue[] = [range.start, range.end]
  let accountFilter = ""
  if (accountId) {
    accountFilter = " AND account_id = ?"
    params.push(accountId)
  }

  const row = queryOne(
    db,
    `SELECT
       COALESCE(SUM(CASE WHEN type = 'income' THEN amount_cents ELSE 0 END), 0) AS income_cents,
       COALESCE(SUM(CASE WHEN type = 'expense' THEN amount_cents ELSE 0 END), 0) AS expense_cents,
       COUNT(*) AS record_count
     FROM mini_bookkeeping_record
     WHERE record_date BETWEEN ? AND ?${accountFilter}`,
    params,
  )

  const incomeCents = asNumber(row?.income_cents)
  const expenseCents = asNumber(row?.expense_cents)
  return {
    incomeCents,
    expenseCents,
    netCents: incomeCents - expenseCents,
    recordCount: asNumber(row?.record_count),
  }
}

/** 分类排行（金额为分，按金额倒序） */
export function getCategoryStats(
  db: Database,
  type: "income" | "expense",
  range: DateRange,
  accountId?: string,
): CategoryStat[] {
  assertType(type)
  assertRange(range.start, range.end)
  const params: SqlValue[] = [type, range.start, range.end]
  let accountFilter = ""
  if (accountId) {
    accountFilter = " AND r.account_id = ?"
    params.push(accountId)
  }

  const rows = queryAll(
    db,
    `SELECT r.category_id AS category_id,
            c.name AS name,
            c.icon AS icon,
            c.color AS color,
            SUM(r.amount_cents) AS total_cents,
            COUNT(*) AS record_count
     FROM mini_bookkeeping_record r
     LEFT JOIN mini_bookkeeping_category c ON c.id = r.category_id
     WHERE r.type = ? AND r.record_date BETWEEN ? AND ?${accountFilter}
     GROUP BY r.category_id, c.name, c.icon, c.color
     ORDER BY total_cents DESC`,
    params,
  )

  const totalAbs = rows.reduce((sum, row) => sum + Math.abs(asNumber(row.total_cents)), 0)
  return rows.map((row) => {
    const totalCents = asNumber(row.total_cents)
    return {
      categoryId: asString(row.category_id),
      name: asString(row.name, "未分类"),
      icon: asString(row.icon, "star"),
      color: asString(row.color, "#409eff"),
      type,
      totalCents,
      count: asNumber(row.record_count),
      percent: totalAbs > 0 ? Math.round((Math.abs(totalCents) * 1000) / totalAbs) / 10 : 0,
    }
  })
}

/** 某类型按日汇总（只返回有数据的日期，图表自行补零） */
export function getDailyStats(
  db: Database,
  range: DateRange & { type: "income" | "expense"; accountId?: string },
): DailyStat[] {
  assertType(range.type)
  assertRange(range.start, range.end)
  const params: SqlValue[] = [range.type, range.start, range.end]
  let accountFilter = ""
  if (range.accountId) {
    accountFilter = " AND account_id = ?"
    params.push(range.accountId)
  }

  const rows = queryAll(
    db,
    `SELECT record_date AS date, SUM(amount_cents) AS total_cents, COUNT(*) AS record_count
     FROM mini_bookkeeping_record
     WHERE type = ? AND record_date BETWEEN ? AND ?${accountFilter}
     GROUP BY record_date
     ORDER BY record_date ASC`,
    params,
  )
  return rows.map((row) => ({
    date: asString(row.date),
    amountCents: asNumber(row.total_cents),
    count: asNumber(row.record_count),
  }))
}

function mapRecord(row: Record<string, SqlValue>): RecordRow {
  const category: RecordCategory = {
    name: asString(row.category_name, asString(row.title, "未分类")),
    icon: asString(row.category_icon, "star"),
    color: asString(row.category_color, "#409eff"),
  }
  const rawCents = asNumber(row.amount_cents)
  const amountCents = rawCents !== 0 ? rawCents : roundAmountToCents(asNumber(row.amount))
  const accountId = asString(row.account_id, DEFAULT_ACCOUNT_ID)
  const account: RecordAccount = {
    id: accountId,
    name: asString(row.account_name, DEFAULT_ACCOUNT.name),
    icon: asString(row.account_icon, DEFAULT_ACCOUNT.icon),
    color: asString(row.account_color, DEFAULT_ACCOUNT.color),
  }
  return {
    id: asString(row.id),
    userId: asString(row.user_id, DEFAULT_USER_ID),
    categoryId: asString(row.category_id),
    type: asString(row.type) === "income" ? "income" : "expense",
    amount: (amountCents / 100).toFixed(2),
    amountCents,
    accountId,
    title: asString(row.title),
    remark: asString(row.remark),
    recordDate: asString(row.record_date),
    recordTime: asString(row.record_time),
    images: parseStringArray(row.images, MAX_RECORD_IMAGES),
    tags: parseStringArray(row.tags, MAX_RECORD_TAGS),
    createdAt: asString(row.created_at),
    updatedAt: asString(row.updated_at),
    category,
    systemCategory: category,
    account,
  }
}

const RECORD_SELECT = `
  SELECT r.*,
         c.name AS category_name,
         c.icon AS category_icon,
         c.color AS category_color,
         a.name AS account_name,
         a.icon AS account_icon,
         a.color AS account_color
  FROM mini_bookkeeping_record r
  LEFT JOIN mini_bookkeeping_category c ON c.id = r.category_id
  LEFT JOIN mini_bookkeeping_account a ON a.id = r.account_id
`

/** 按条件查询记录，并按日期倒序分组 */
export function listRecordGroups(db: Database, filters: RecordFilters): DailyRecordGroup[] {
  assertRange(filters.start, filters.end)

  const where: string[] = ["r.user_id = ?", "r.record_date BETWEEN ? AND ?"]
  const params: SqlValue[] = [DEFAULT_USER_ID, filters.start, filters.end]

  if (filters.type) {
    assertType(filters.type)
    where.push("r.type = ?")
    params.push(filters.type)
  }
  if (filters.accountId) {
    where.push("r.account_id = ?")
    params.push(filters.accountId)
  }
  if (filters.categoryId) {
    where.push("r.category_id = ?")
    params.push(filters.categoryId)
  }

  const rows = queryAll(
    db,
    `${RECORD_SELECT}
     WHERE ${where.join(" AND ")}
     ORDER BY r.record_date DESC, r.created_at DESC, r.id DESC`,
    params,
  )

  const groups = new Map<string, DailyRecordGroup>()
  for (const row of rows) {
    const record = mapRecord(row)
    let group = groups.get(record.recordDate)
    if (!group) {
      group = {
        date: record.recordDate,
        records: [],
        dayIncome: 0,
        dayExpense: 0,
        dayIncomeCents: 0,
        dayExpenseCents: 0,
      }
      groups.set(record.recordDate, group)
    }
    group.records.push(record)
    if (record.type === "income") {
      group.dayIncomeCents += record.amountCents
      group.dayIncome = roundMoney(group.dayIncomeCents / 100)
    } else {
      group.dayExpenseCents += record.amountCents
      group.dayExpense = roundMoney(group.dayExpenseCents / 100)
    }
  }
  return Array.from(groups.values())
}

/** 某月记录，按日期倒序分组 */
export function getDailyRecords(db: Database, month: string): DailyRecordGroup[] {
  const { start, end } = monthRange(month)
  return listRecordGroups(db, { start, end })
}

/** 某月每日金额数组（下标 0 对应 1 号） */
export function getMonthlyChartData(
  db: Database,
  month: string,
  type: "income" | "expense" = "expense",
): number[] {
  const { start, end, days } = monthRange(month)
  const rows = queryAll(
    db,
    `SELECT CAST(substr(record_date, 9, 2) AS INTEGER) AS day, SUM(amount_cents) AS total
     FROM mini_bookkeeping_record
     WHERE user_id = ? AND type = ? AND record_date BETWEEN ? AND ?
     GROUP BY day`,
    [DEFAULT_USER_ID, type, start, end],
  )
  const result = Array.from({ length: days }, () => 0)
  for (const row of rows) {
    const day = asNumber(row.day)
    if (day >= 1 && day <= days) {
      result[day - 1] = roundMoney(asNumber(row.total) / 100)
    }
  }
  return result
}

function assertType(type: unknown): asserts type is "income" | "expense" {
  if (type !== "income" && type !== "expense") {
    throw new Error("类型必须为 income 或 expense")
  }
}

function assertDate(date: unknown): asserts date is string {
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("日期格式应为 YYYY-MM-DD")
  }
}

function assertRange(start: unknown, end: unknown): void {
  assertDate(start)
  assertDate(end)
  if (start > end) {
    throw new Error("开始日期不能晚于结束日期")
  }
}

/** 记录金额：允许历史负数（退款），但拒绝 0；返回整数分 */
function normalizeAmountCents(input: number | string): number {
  const cents =
    typeof input === "number" ? roundAmountToCents(input) : decimalToCents(String(input ?? ""))
  if (!Number.isFinite(cents) || cents === 0) {
    throw new Error("金额不能为 0")
  }
  if (Math.abs(cents) > MAX_AMOUNT_CENTS) {
    throw new Error("金额过大")
  }
  return cents
}

function getRecordById(db: Database, id: string): RecordRow | null {
  const row = queryOne(db, `${RECORD_SELECT} WHERE r.id = ?`, [id])
  return row ? mapRecord(row) : null
}

/** 按 id 获取单条记录 */
export function getRecord(db: Database, id: string): RecordRow | null {
  return getRecordById(db, String(id))
}

/** 新增记录 */
export function createRecord(db: Database, input: CreateRecordInput): RecordRow {
  const categoryId = String(input.categoryId ?? "")
  if (!categoryId) throw new Error("请选择分类")

  const category = getCategoryById(db, categoryId)
  if (!category) throw new Error("分类不存在")

  const type = input.type ?? category.type
  assertType(type)
  if (type !== category.type) throw new Error("分类与收支类型不匹配")
  assertDate(input.recordDate)

  const amountCents = normalizeAmountCents(input.amount)

  const accountId = input.accountId ? String(input.accountId) : DEFAULT_ACCOUNT_ID
  const account = getAccountById(db, accountId)
  if (!account) throw new Error("账户不存在")
  if (account.archived) throw new Error("该账户已归档，请选择其他账户")

  const now = nowString()
  const id = generateId()
  const title = input.title?.trim() || category.name
  const recordTime = input.recordTime || now.slice(11)
  const images = normalizeImages(input.images)
  const tags = normalizeTags(input.tags)

  db.run(
    `INSERT INTO mini_bookkeeping_record
      (id, user_id, category_id, type, amount, amount_cents, account_id, title, remark, record_date, record_time, images, tags, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      DEFAULT_USER_ID,
      categoryId,
      type,
      centsToAmount(amountCents),
      amountCents,
      accountId,
      title,
      input.remark ?? "",
      input.recordDate,
      recordTime,
      JSON.stringify(images),
      JSON.stringify(tags),
      now,
      now,
    ],
  )

  const created = getRecordById(db, id)
  if (!created) throw new Error("记录创建失败")
  return created
}

/** 更新记录（部分字段） */
export function updateRecord(
  db: Database,
  id: string,
  patch: Partial<CreateRecordInput> & { categoryId?: string | number },
): RecordRow {
  const existing = getRecordById(db, String(id))
  if (!existing) throw new Error("记录不存在")

  const sets: string[] = []
  const params: SqlValue[] = []

  let category: CategoryRecord | null = null
  if (patch.categoryId !== undefined && patch.categoryId !== null && patch.categoryId !== "") {
    category = getCategoryById(db, String(patch.categoryId))
    if (!category) throw new Error("分类不存在")
    sets.push("category_id = ?")
    params.push(category.id)
  }

  if (patch.type !== undefined) {
    assertType(patch.type)
  }

  const typeChanging = patch.type !== undefined
  let nextType: "income" | "expense" = patch.type ?? existing.type
  if (category) {
    if (!typeChanging) nextType = category.type
    if (nextType !== category.type) {
      throw new Error("分类与收支类型不匹配")
    }
  }
  if (typeChanging || category) {
    sets.push("type = ?")
    params.push(nextType)
  }

  if (patch.amount !== undefined) {
    const cents = normalizeAmountCents(patch.amount)
    sets.push("amount = ?")
    params.push(centsToAmount(cents))
    sets.push("amount_cents = ?")
    params.push(cents)
  }

  if (patch.accountId !== undefined) {
    const accountId = String(patch.accountId || "")
    if (!accountId) throw new Error("请选择账户")
    const account = getAccountById(db, accountId)
    if (!account) throw new Error("账户不存在")
    if (account.archived && accountId !== existing.accountId) {
      throw new Error("该账户已归档，请选择其他账户")
    }
    sets.push("account_id = ?")
    params.push(accountId)
  }

  if (patch.title !== undefined) {
    const title = patch.title.trim()
    sets.push("title = ?")
    params.push(title || category?.name || existing.title)
  } else if (category) {
    sets.push("title = ?")
    params.push(category.name)
  }

  if (patch.remark !== undefined) {
    sets.push("remark = ?")
    params.push(patch.remark)
  }

  if (patch.recordDate !== undefined) {
    assertDate(patch.recordDate)
    sets.push("record_date = ?")
    params.push(patch.recordDate)
  }

  if (patch.recordTime !== undefined) {
    sets.push("record_time = ?")
    params.push(patch.recordTime)
  }

  if (patch.images !== undefined) {
    sets.push("images = ?")
    params.push(JSON.stringify(normalizeImages(patch.images)))
  }

  if (patch.tags !== undefined) {
    sets.push("tags = ?")
    params.push(JSON.stringify(normalizeTags(patch.tags)))
  }

  if (sets.length === 0) {
    return existing
  }

  sets.push("updated_at = ?")
  params.push(nowString())
  params.push(String(id))

  db.run(`UPDATE mini_bookkeeping_record SET ${sets.join(", ")} WHERE id = ?`, params)

  const updated = getRecordById(db, String(id))
  if (!updated) throw new Error("记录不存在")
  return updated
}

/** 删除记录 */
export function deleteRecord(db: Database, id: string): void {
  const existing = getRecordById(db, String(id))
  if (!existing) throw new Error("记录不存在")
  db.run("DELETE FROM mini_bookkeeping_record WHERE id = ?", [String(id)])
}

/** 新增自定义分类 */
export function createCategory(db: Database, input: CreateCategoryInput): CategoryRecord {
  const name = (input.name ?? "").trim()
  if (!name) throw new Error("请输入分类名称")
  if (name.length > 4) throw new Error("分类名称不超过 4 个字")
  assertType(input.type)

  const duplicated = queryOne(
    db,
    "SELECT id FROM mini_bookkeeping_category WHERE name = ? AND type = ?",
    [name, input.type],
  )
  if (duplicated) throw new Error("该分类已存在")

  const now = nowString()
  const id = generateId()
  db.run(
    `INSERT INTO mini_bookkeeping_category
      (id, name, type, icon, color, sort_order, is_system, user_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 999, 0, ?, ?, ?)`,
    [
      id,
      name,
      input.type,
      input.icon || "star",
      input.color || "#409eff",
      DEFAULT_USER_ID,
      now,
      now,
    ],
  )

  const created = getCategoryById(db, id)
  if (!created) throw new Error("分类创建失败")
  return created
}

/** 更新分类名称/图标/颜色；不允许改类型 */
export function updateCategory(
  db: Database,
  id: string,
  patch: UpdateCategoryInput,
): CategoryRecord {
  const existing = getCategoryById(db, String(id))
  if (!existing) throw new Error("分类不存在")

  const sets: string[] = []
  const params: SqlValue[] = []
  let nextName = existing.name

  if (patch.name !== undefined) {
    const name = patch.name.trim()
    if (!name) throw new Error("请输入分类名称")
    if (name.length > 4) throw new Error("分类名称不超过 4 个字")
    const duplicated = queryOne(
      db,
      "SELECT id FROM mini_bookkeeping_category WHERE name = ? AND type = ? AND id <> ?",
      [name, existing.type, existing.id],
    )
    if (duplicated) throw new Error("该分类已存在")
    nextName = name
    sets.push("name = ?")
    params.push(name)
  }

  if (patch.icon !== undefined) {
    sets.push("icon = ?")
    params.push(patch.icon || "star")
  }

  if (patch.color !== undefined) {
    sets.push("color = ?")
    params.push(patch.color || "#409eff")
  }

  if (patch.sortOrder !== undefined) {
    sets.push("sort_order = ?")
    params.push(Math.trunc(Number(patch.sortOrder) || 0))
  }

  if (sets.length === 0) return existing

  sets.push("updated_at = ?")
  params.push(nowString())
  params.push(existing.id)

  db.run(`UPDATE mini_bookkeeping_category SET ${sets.join(", ")} WHERE id = ?`, params)

  // 记录标题默认跟随分类名；只更新仍使用旧默认标题的记录
  if (nextName !== existing.name) {
    db.run("UPDATE mini_bookkeeping_record SET title = ? WHERE category_id = ? AND title = ?", [
      nextName,
      existing.id,
      existing.name,
    ])
  }

  const updated = getCategoryById(db, existing.id)
  if (!updated) throw new Error("分类不存在")
  return updated
}

/** 删除自定义分类；系统分类或有关联记录时禁止删除 */
export function deleteCategory(db: Database, id: string): void {
  const category = getCategoryById(db, String(id))
  if (!category) throw new Error("分类不存在")
  if (category.isSystem) throw new Error("系统分类无法删除")

  const used = queryOne(
    db,
    "SELECT COUNT(*) AS total FROM mini_bookkeeping_record WHERE category_id = ?",
    [category.id],
  )
  if (used && asNumber(used.total) > 0) {
    throw new Error("该分类下有记录，无法删除")
  }

  db.run("DELETE FROM mini_bookkeeping_category WHERE id = ?", [category.id])
}

/** 分类使用次数，用于分类管理页 */
export function getCategoryUsage(
  db: Database,
  type?: "income" | "expense",
): Record<string, number> {
  const params: SqlValue[] = []
  let where = ""
  if (type) {
    where = "WHERE type = ?"
    params.push(type)
  }
  const rows = queryAll(
    db,
    `SELECT category_id, COUNT(*) AS total FROM mini_bookkeeping_record ${where} GROUP BY category_id`,
    params,
  )
  const usage: Record<string, number> = {}
  for (const row of rows) {
    usage[asString(row.category_id)] = asNumber(row.total)
  }
  return usage
}

/** 所有记录里出现过的标签，按使用次数倒序（供标签选择器使用） */
export function listTags(db: Database, limit = 200): TagUsage[] {
  const rows = queryAll(
    db,
    "SELECT tags FROM mini_bookkeeping_record WHERE tags IS NOT NULL AND tags <> '' AND tags <> '[]'",
  )
  const counts = new Map<string, number>()
  for (const row of rows) {
    for (const tag of parseStringArray(row.tags, MAX_RECORD_TAGS)) {
      counts.set(tag, (counts.get(tag) || 0) + 1)
    }
  }
  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, Math.max(0, limit))
}

/** 数据库概览（记录数、分类数、日期范围、累计收支） */
export function getStats(db: Database): DatabaseStats {
  const recordCount = asNumber(
    queryOne(db, "SELECT COUNT(*) AS total FROM mini_bookkeeping_record")?.total,
  )
  const categoryCount = asNumber(
    queryOne(db, "SELECT COUNT(*) AS total FROM mini_bookkeeping_category")?.total,
  )
  const customCategoryCount = asNumber(
    queryOne(db, "SELECT COUNT(*) AS total FROM mini_bookkeeping_category WHERE is_system = 0")
      ?.total,
  )
  const range = queryOne(
    db,
    "SELECT MIN(record_date) AS first_date, MAX(record_date) AS last_date FROM mini_bookkeeping_record",
  )
  const sums = queryOne(
    db,
    `SELECT
       COALESCE(SUM(CASE WHEN type = 'income' THEN amount_cents ELSE 0 END), 0) AS income,
       COALESCE(SUM(CASE WHEN type = 'expense' THEN amount_cents ELSE 0 END), 0) AS expense
     FROM mini_bookkeeping_record`,
  )

  return {
    recordCount,
    categoryCount,
    customCategoryCount,
    firstRecordDate: range?.first_date ? asString(range.first_date) : null,
    lastRecordDate: range?.last_date ? asString(range.last_date) : null,
    totalIncome: roundMoney(asNumber(sums?.income) / 100),
    totalExpense: roundMoney(asNumber(sums?.expense) / 100),
  }
}

/** 导出可读 JSON 备份（v2：包含账户与整数分） */
export function exportJson(db: Database): BackupPayload {
  const categories = listCategories(db)
  const accounts = listAccounts(db, true)
  const rows = queryAll(
    db,
    `SELECT * FROM mini_bookkeeping_record
     ORDER BY record_date ASC, created_at ASC, id ASC`,
  )

  return {
    app: APP_ID,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    accounts: accounts.map((account) => ({
      id: account.id,
      userId: account.userId,
      name: account.name,
      type: account.type,
      icon: account.icon,
      color: account.color,
      initialBalanceCents: account.initialBalanceCents,
      archived: account.archived,
      sortOrder: account.sortOrder,
      isSystem: account.isSystem,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    })),
    categories,
    records: rows.map((row) => {
      const rawCents = asNumber(row.amount_cents)
      const amountCents = rawCents !== 0 ? rawCents : roundAmountToCents(asNumber(row.amount))
      return {
        id: asString(row.id),
        userId: asString(row.user_id, DEFAULT_USER_ID),
        categoryId: asString(row.category_id),
        type: asString(row.type) === "income" ? "income" : "expense",
        amount: roundMoney(amountCents / 100),
        amountCents,
        accountId: asString(row.account_id, DEFAULT_ACCOUNT_ID),
        title: asString(row.title),
        remark: asString(row.remark),
        recordDate: asString(row.record_date),
        recordTime: asString(row.record_time),
        images: parseStringArray(row.images, MAX_RECORD_IMAGES),
        tags: parseStringArray(row.tags, MAX_RECORD_TAGS),
        createdAt: asString(row.created_at),
        updatedAt: asString(row.updated_at),
      }
    }),
  }
}

function validateBackup(payload: unknown): BackupPayload {
  if (!payload || typeof payload !== "object") {
    throw new Error("备份文件格式不正确")
  }
  const data = payload as Partial<BackupPayload>
  if (!Array.isArray(data.categories) || !Array.isArray(data.records)) {
    throw new Error("备份文件缺少 categories 或 records")
  }
  if (data.app !== undefined && data.app !== APP_ID) {
    throw new Error("不是本地记账的备份文件")
  }
  if (data.schemaVersion !== undefined && Number(data.schemaVersion) > SCHEMA_VERSION) {
    throw new Error("备份文件版本过新，请更新页面后再导入")
  }

  const accountIds = new Set<string>()
  if (data.accounts !== undefined) {
    if (!Array.isArray(data.accounts)) {
      throw new Error("备份文件中的 accounts 格式不正确")
    }
    for (const account of data.accounts) {
      if (!account || typeof account !== "object") throw new Error("账户数据格式不正确")
      const accountId = String(account.id || "")
      if (!accountId || !account.name) throw new Error("账户缺少 id 或 name")
      if (accountIds.has(accountId)) throw new Error("账户 id 重复")
      assertAccountType(account.type)
      if (
        account.initialBalanceCents !== undefined &&
        !Number.isFinite(Number(account.initialBalanceCents))
      ) {
        throw new Error("账户期初余额不正确")
      }
      accountIds.add(accountId)
    }
  }

  const categoryIds = new Set<string>()
  for (const category of data.categories) {
    if (!category || typeof category !== "object") throw new Error("分类数据格式不正确")
    const categoryId = String(category.id || "")
    if (!categoryId || !category.name) throw new Error("分类缺少 id 或 name")
    if (categoryIds.has(categoryId)) throw new Error("分类 id 重复")
    assertType(category.type)
    categoryIds.add(categoryId)
  }

  const recordIds = new Set<string>()
  for (const record of data.records) {
    if (!record || typeof record !== "object") throw new Error("记录数据格式不正确")
    const recordId = String(record.id || "")
    if (!recordId) throw new Error("记录缺少 id")
    if (recordIds.has(recordId)) throw new Error("记录 id 重复")
    recordIds.add(recordId)

    if (!record.categoryId || !categoryIds.has(String(record.categoryId))) {
      throw new Error("记录引用了不存在的分类")
    }
    assertType(record.type)

    if (record.amountCents !== undefined) {
      const cents = Number(record.amountCents)
      if (!Number.isFinite(cents) || !Number.isInteger(cents) || cents === 0) {
        throw new Error("记录金额不正确")
      }
      if (Math.abs(cents) > MAX_AMOUNT_CENTS) throw new Error("记录金额过大")
    } else if (!Number.isFinite(Number(record.amount)) || Number(record.amount) === 0) {
      // 允许负数：旧数据里的退款/冲正会以负的支出记录存在
      throw new Error("记录金额不正确")
    }
    assertDate(record.recordDate)
    if (record.images !== undefined) normalizeImages(record.images)
    if (record.tags !== undefined) normalizeTags(record.tags)
  }

  return data as BackupPayload
}

/** 导入 JSON 备份；事务内整体替换，失败时回滚且不影响原数据 */
export function importJson(db: Database, payload: unknown): void {
  const data = validateBackup(payload)
  const now = nowString()

  db.run("BEGIN TRANSACTION")
  try {
    db.run("DELETE FROM mini_bookkeeping_record")
    db.run("DELETE FROM mini_bookkeeping_category")
    db.run("DELETE FROM mini_bookkeeping_account")

    if (data.accounts && data.accounts.length > 0) {
      const accountStmt = db.prepare(`
        INSERT INTO mini_bookkeeping_account
          (id, user_id, name, type, icon, color, initial_balance_cents, archived, sort_order, is_system, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      try {
        for (const account of data.accounts) {
          const accountId = String(account.id)
          accountStmt.run([
            accountId,
            account.userId || (account.isSystem ? null : DEFAULT_USER_ID),
            String(account.name),
            account.type,
            account.icon || "money-circle",
            account.color || "#F7B731",
            normalizeInitialBalance(account.initialBalanceCents),
            account.archived ? 1 : 0,
            Number(account.sortOrder) || 0,
            accountId === DEFAULT_ACCOUNT_ID || account.isSystem ? 1 : 0,
            account.createdAt || now,
            account.updatedAt || now,
          ])
        }
      } finally {
        accountStmt.free()
      }
    }

    // 即使备份里没有账户，也保证默认账户存在
    seedDefaultAccount(db)

    const accountIds = new Set<string>((data.accounts || []).map((account) => String(account.id)))
    accountIds.add(DEFAULT_ACCOUNT_ID)

    const categoryStmt = db.prepare(`
      INSERT INTO mini_bookkeeping_category
        (id, name, type, icon, color, sort_order, is_system, user_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    try {
      for (const category of data.categories) {
        categoryStmt.run([
          String(category.id),
          String(category.name),
          category.type,
          category.icon || "star",
          category.color || "#409eff",
          Number(category.sortOrder) || 0,
          category.isSystem ? 1 : 0,
          category.userId ?? (category.isSystem ? null : DEFAULT_USER_ID),
          category.createdAt || now,
          category.updatedAt || now,
        ])
      }
    } finally {
      categoryStmt.free()
    }

    const recordStmt = db.prepare(`
      INSERT INTO mini_bookkeeping_record
        (id, user_id, category_id, type, amount, amount_cents, account_id, title, remark, record_date, record_time, images, tags, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    try {
      for (const record of data.records) {
        const cents =
          record.amountCents !== undefined
            ? Math.trunc(Number(record.amountCents))
            : roundAmountToCents(Number(record.amount))
        const accountId =
          record.accountId && accountIds.has(String(record.accountId))
            ? String(record.accountId)
            : DEFAULT_ACCOUNT_ID
        recordStmt.run([
          String(record.id),
          record.userId || DEFAULT_USER_ID,
          String(record.categoryId),
          record.type,
          centsToAmount(cents),
          cents,
          accountId,
          record.title ?? "",
          record.remark ?? "",
          record.recordDate,
          record.recordTime ?? "",
          JSON.stringify(normalizeImages(record.images)),
          JSON.stringify(normalizeTags(record.tags)),
          record.createdAt || now,
          record.updatedAt || now,
        ])
      }
    } finally {
      recordStmt.free()
    }

    db.run("COMMIT")
  } catch (error) {
    try {
      db.run("ROLLBACK")
    } catch {
      // 回滚失败时保留原始错误
    }
    throw error
  }

  // 与下次冷启动时的初始化保持一致：补回备份中缺失的系统默认分类与账户
  seedDefaults(db)
}

/** 清空记账数据，保留系统默认分类与默认账户 */
export function clearAll(db: Database): void {
  db.run("BEGIN TRANSACTION")
  try {
    db.run("DELETE FROM mini_bookkeeping_record")
    db.run("DELETE FROM mini_bookkeeping_category WHERE is_system = 0")
    db.run("DELETE FROM mini_bookkeeping_account WHERE is_system = 0")
    db.run("COMMIT")
  } catch (error) {
    try {
      db.run("ROLLBACK")
    } catch {
      // 忽略回滚异常
    }
    throw error
  }
  seedDefaults(db)
}

/** 供工具与测试使用 */
export const __internal = {
  monthRange,
  roundMoney,
  todayString,
  tableColumns,
  getUserVersion,
  DEFAULT_CATEGORIES,
  normalizeImages,
  normalizeTags,
}

export {
  MAX_AMOUNT_CENTS,
  centsToAmount,
  decimalToCents,
  evaluateAmountExpression,
  formatCents,
  formatRecordAmount,
  parseUserAmountToCents,
  roundAmountToCents,
} from "./money"
