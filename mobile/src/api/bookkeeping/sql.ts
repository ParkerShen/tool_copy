/**
 * 本地记账 SQLite 层。
 *
 * 纯 TypeScript + sql.js，不依赖浏览器 API，便于在 Node 中直接测试。
 * 表结构与 serveradmin/src/app/models/mini 保持一致（字段名转 snake_case）。
 * 所有函数接收一个已打开的 sql.js Database。
 */
import type { Database, SqlValue } from "sql.js"

export const SCHEMA_VERSION = 1
export const APP_ID = "local-bookkeeping"
export const DEFAULT_USER_ID = "1"

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

export interface RecordCategory {
  name: string
  icon: string
  color: string
}

export interface RecordRow {
  id: string
  userId: string
  categoryId: string
  type: "income" | "expense"
  amount: string
  title: string
  remark: string
  recordDate: string
  recordTime: string
  createdAt: string
  updatedAt: string
  category: RecordCategory
  systemCategory: RecordCategory
}

export interface DailyRecordGroup {
  date: string
  records: RecordRow[]
  dayIncome: number
  dayExpense: number
}

export interface MonthlyStats {
  income: number
  expense: number
}

export interface CreateRecordInput {
  categoryId: string | number
  type?: "income" | "expense"
  amount: number | string
  title?: string
  remark?: string
  recordDate: string
  recordTime?: string
}

export interface CreateCategoryInput {
  name: string
  type: "income" | "expense"
  icon?: string
  color?: string
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

export interface BackupPayload {
  app: string
  schemaVersion: number
  exportedAt: string
  categories: CategoryRecord[]
  records: Array<{
    id: string
    userId: string
    categoryId: string
    type: "income" | "expense"
    amount: number
    title: string
    remark: string
    recordDate: string
    recordTime: string
    createdAt: string
    updatedAt: string
  }>
}

const DEFAULT_CATEGORIES: Array<
  Pick<CategoryRecord, "id" | "name" | "type" | "icon" | "color"> & { sortOrder: number }
> = [
  { id: "sys_expense_food", name: "餐饮", type: "expense", icon: "shop", color: "#FF6B6B", sortOrder: 1 },
  { id: "sys_expense_transport", name: "交通", type: "expense", icon: "location", color: "#4ECDC4", sortOrder: 2 },
  { id: "sys_expense_shopping", name: "购物", type: "expense", icon: "bags", color: "#45B7D1", sortOrder: 3 },
  { id: "sys_expense_entertainment", name: "娱乐", type: "expense", icon: "star", color: "#96CEB4", sortOrder: 4 },
  { id: "sys_expense_housing", name: "住房", type: "expense", icon: "home", color: "#F7B731", sortOrder: 5 },
  { id: "sys_expense_medical", name: "医疗", type: "expense", icon: "heart", color: "#DDA0DD", sortOrder: 6 },
  { id: "sys_income_salary", name: "工资", type: "income", icon: "wallet", color: "#55A3FF", sortOrder: 1 },
  { id: "sys_income_parttime", name: "兼职", type: "income", icon: "service", color: "#26D0CE", sortOrder: 2 },
  { id: "sys_income_other", name: "其他收入", type: "income", icon: "gift", color: "#FDCB6E", sortOrder: 3 },
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

/** 建表 + 索引，并写入 schema 版本号 */
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
      title TEXT,
      remark TEXT,
      record_date TEXT NOT NULL,
      record_time TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_record_date ON mini_bookkeeping_record(record_date);
    CREATE INDEX IF NOT EXISTS idx_record_category ON mini_bookkeeping_record(category_id);
    CREATE INDEX IF NOT EXISTS idx_category_type ON mini_bookkeeping_category(type);
  `)

  const versionRow = queryOne(db, "PRAGMA user_version")
  const currentVersion = versionRow ? asNumber(Object.values(versionRow)[0]) : 0
  if (currentVersion < SCHEMA_VERSION) {
    db.run(`PRAGMA user_version = ${SCHEMA_VERSION}`)
  }
}

/** 播种默认分类；已存在的分类不会被覆盖 */
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

/** 月度收入 / 支出汇总 */
export function getMonthlyStats(db: Database, month: string): MonthlyStats {
  const { start, end } = monthRange(month)
  const rows = queryAll(
    db,
    `SELECT type, SUM(amount) AS total
     FROM mini_bookkeeping_record
     WHERE user_id = ? AND record_date BETWEEN ? AND ?
     GROUP BY type`,
    [DEFAULT_USER_ID, start, end],
  )
  const result: MonthlyStats = { income: 0, expense: 0 }
  for (const row of rows) {
    if (asString(row.type) === "income") result.income = roundMoney(asNumber(row.total))
    if (asString(row.type) === "expense") result.expense = roundMoney(asNumber(row.total))
  }
  return result
}

function mapRecord(row: Record<string, SqlValue>): RecordRow {
  const category: RecordCategory = {
    name: asString(row.category_name, asString(row.title, "未分类")),
    icon: asString(row.category_icon, "star"),
    color: asString(row.category_color, "#409eff"),
  }
  return {
    id: asString(row.id),
    userId: asString(row.user_id, DEFAULT_USER_ID),
    categoryId: asString(row.category_id),
    type: asString(row.type) === "income" ? "income" : "expense",
    amount: asNumber(row.amount).toFixed(2),
    title: asString(row.title),
    remark: asString(row.remark),
    recordDate: asString(row.record_date),
    recordTime: asString(row.record_time),
    createdAt: asString(row.created_at),
    updatedAt: asString(row.updated_at),
    category,
    systemCategory: category,
  }
}

const RECORD_SELECT = `
  SELECT r.*,
         c.name AS category_name,
         c.icon AS category_icon,
         c.color AS category_color
  FROM mini_bookkeeping_record r
  LEFT JOIN mini_bookkeeping_category c ON c.id = r.category_id
`

/** 某月记录，按日期倒序分组 */
export function getDailyRecords(db: Database, month: string): DailyRecordGroup[] {
  const { start, end } = monthRange(month)
  const rows = queryAll(
    db,
    `${RECORD_SELECT}
     WHERE r.user_id = ? AND r.record_date BETWEEN ? AND ?
     ORDER BY r.record_date DESC, r.created_at DESC, r.id DESC`,
    [DEFAULT_USER_ID, start, end],
  )

  const groups = new Map<string, DailyRecordGroup>()
  for (const row of rows) {
    const record = mapRecord(row)
    let group = groups.get(record.recordDate)
    if (!group) {
      group = { date: record.recordDate, records: [], dayIncome: 0, dayExpense: 0 }
      groups.set(record.recordDate, group)
    }
    group.records.push(record)
    if (record.type === "income") {
      group.dayIncome = roundMoney(group.dayIncome + Number(record.amount))
    } else {
      group.dayExpense = roundMoney(group.dayExpense + Number(record.amount))
    }
  }
  return Array.from(groups.values())
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
    `SELECT CAST(substr(record_date, 9, 2) AS INTEGER) AS day, SUM(amount) AS total
     FROM mini_bookkeeping_record
     WHERE user_id = ? AND type = ? AND record_date BETWEEN ? AND ?
     GROUP BY day`,
    [DEFAULT_USER_ID, type, start, end],
  )
  const result = Array.from({ length: days }, () => 0)
  for (const row of rows) {
    const day = asNumber(row.day)
    if (day >= 1 && day <= days) {
      result[day - 1] = roundMoney(asNumber(row.total))
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

function normalizeAmount(input: number | string): number {
  const amount = Number(input)
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("金额必须大于 0")
  }
  return roundMoney(amount)
}

function getRecordById(db: Database, id: string): RecordRow | null {
  const row = queryOne(db, `${RECORD_SELECT} WHERE r.id = ?`, [id])
  return row ? mapRecord(row) : null
}

/** 新增记录 */
export function createRecord(db: Database, input: CreateRecordInput): RecordRow {
  const categoryId = String(input.categoryId ?? "")
  if (!categoryId) throw new Error("请选择分类")

  const category = getCategoryById(db, categoryId)
  if (!category) throw new Error("分类不存在")

  const type = input.type ?? category.type
  assertType(type)
  assertDate(input.recordDate)

  const amount = normalizeAmount(input.amount)
  const now = nowString()
  const id = generateId()
  const title = input.title?.trim() || category.name
  const recordTime = input.recordTime || now.slice(11)

  db.run(
    `INSERT INTO mini_bookkeeping_record
      (id, user_id, category_id, type, amount, title, remark, record_date, record_time, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      DEFAULT_USER_ID,
      categoryId,
      type,
      amount,
      title,
      input.remark ?? "",
      input.recordDate,
      recordTime,
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
    sets.push("type = ?")
    params.push(patch.type)
  }

  if (patch.amount !== undefined) {
    sets.push("amount = ?")
    params.push(normalizeAmount(patch.amount))
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

/** 删除自定义分类；系统分类或有关联记录时禁止删除 */
export function deleteCategory(db: Database, id: string): void {
  const category = getCategoryById(db, String(id))
  if (!category) throw new Error("分类不存在")
  if (category.isSystem) throw new Error("系统分类无法删除")

  const used = queryOne(db, "SELECT COUNT(*) AS total FROM mini_bookkeeping_record WHERE category_id = ?", [
    category.id,
  ])
  if (used && asNumber(used.total) > 0) {
    throw new Error("该分类下有记录，无法删除")
  }

  db.run("DELETE FROM mini_bookkeeping_category WHERE id = ?", [category.id])
}

/** 数据库概览（记录数、分类数、日期范围、累计收支） */
export function getStats(db: Database): DatabaseStats {
  const recordCount = asNumber(queryOne(db, "SELECT COUNT(*) AS total FROM mini_bookkeeping_record")?.total)
  const categoryCount = asNumber(
    queryOne(db, "SELECT COUNT(*) AS total FROM mini_bookkeeping_category")?.total,
  )
  const customCategoryCount = asNumber(
    queryOne(db, "SELECT COUNT(*) AS total FROM mini_bookkeeping_category WHERE is_system = 0")?.total,
  )
  const range = queryOne(
    db,
    "SELECT MIN(record_date) AS first_date, MAX(record_date) AS last_date FROM mini_bookkeeping_record",
  )
  const sums = queryOne(
    db,
    `SELECT
       COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS income,
       COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS expense
     FROM mini_bookkeeping_record`,
  )

  return {
    recordCount,
    categoryCount,
    customCategoryCount,
    firstRecordDate: range?.first_date ? asString(range.first_date) : null,
    lastRecordDate: range?.last_date ? asString(range.last_date) : null,
    totalIncome: roundMoney(asNumber(sums?.income)),
    totalExpense: roundMoney(asNumber(sums?.expense)),
  }
}

/** 导出可读 JSON 备份 */
export function exportJson(db: Database): BackupPayload {
  const categories = listCategories(db)
  const rows = queryAll(
    db,
    `SELECT * FROM mini_bookkeeping_record
     ORDER BY record_date ASC, created_at ASC, id ASC`,
  )

  return {
    app: APP_ID,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    categories,
    records: rows.map((row) => ({
      id: asString(row.id),
      userId: asString(row.user_id, DEFAULT_USER_ID),
      categoryId: asString(row.category_id),
      type: asString(row.type) === "income" ? "income" : "expense",
      amount: roundMoney(asNumber(row.amount)),
      title: asString(row.title),
      remark: asString(row.remark),
      recordDate: asString(row.record_date),
      recordTime: asString(row.record_time),
      createdAt: asString(row.created_at),
      updatedAt: asString(row.updated_at),
    })),
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

  const categoryIds = new Set<string>()
  for (const category of data.categories) {
    if (!category || typeof category !== "object") throw new Error("分类数据格式不正确")
    if (!category.id || !category.name) throw new Error("分类缺少 id 或 name")
    assertType(category.type)
    categoryIds.add(String(category.id))
  }

  for (const record of data.records) {
    if (!record || typeof record !== "object") throw new Error("记录数据格式不正确")
    if (!record.id) throw new Error("记录缺少 id")
    if (!record.categoryId || !categoryIds.has(String(record.categoryId))) {
      throw new Error("记录引用了不存在的分类")
    }
    assertType(record.type)
    // 允许负数：旧数据里的退款/冲正会以负的支出记录存在
    if (!Number.isFinite(Number(record.amount)) || Number(record.amount) === 0) {
      throw new Error("记录金额不正确")
    }
    assertDate(record.recordDate)
  }

  return data as BackupPayload
}

/** 导入 JSON 备份；事务内整体替换，失败时回滚且不影响原数据 */
export function importJson(db: Database, payload: unknown): void {
  const data = validateBackup(payload)

  db.run("BEGIN TRANSACTION")
  try {
    db.run("DELETE FROM mini_bookkeeping_record")
    db.run("DELETE FROM mini_bookkeeping_category")

    const now = nowString()
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
        (id, user_id, category_id, type, amount, title, remark, record_date, record_time, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    try {
      for (const record of data.records) {
        recordStmt.run([
          String(record.id),
          record.userId || DEFAULT_USER_ID,
          String(record.categoryId),
          record.type,
          roundMoney(Number(record.amount)),
          record.title ?? "",
          record.remark ?? "",
          record.recordDate,
          record.recordTime ?? "",
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

  // 与下次冷启动时的初始化保持一致：补回备份中缺失的系统默认分类
  seedDefaults(db)
}

/** 清空记账数据，保留系统默认分类 */
export function clearAll(db: Database): void {
  db.run("BEGIN TRANSACTION")
  try {
    db.run("DELETE FROM mini_bookkeeping_record")
    db.run("DELETE FROM mini_bookkeeping_category WHERE is_system = 0")
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
  DEFAULT_CATEGORIES,
}
