/**
 * SQLite 数据库引擎。
 *
 * - sql.js（SQLite WASM）通过静态 <script> 加载，避免打包 Node 分支；
 * - 数据库常驻内存，每次写操作后 export() 成 .sqlite 字节写入 IndexedDB；
 * - 所有写操作串行持久化，避免并发覆盖；
 * - IndexedDB 不可用时降级为纯内存模式（刷新后数据丢失，页面会提示）。
 */
import type { Database, SqlJsStatic } from "sql.js"
import { idbDelete, idbGet, idbKeys, idbSet, isIndexedDbAvailable } from "@/utils/idb"
import { clearAll, initSchema, seedDefaults } from "./sql"

const DB_KEY = "db"
const CORRUPT_KEY = "db.corrupt"
const SNAPSHOT_PREFIX = "snapshot."
const DAILY_SNAPSHOT_LIMIT = 7
const SAFETY_SNAPSHOT_LIMIT = 3
const MANUAL_SNAPSHOT_LIMIT = 5

let sqlJsPromise: Promise<SqlJsStatic> | null = null
let dbInstance: Database | null = null
let initPromise: Promise<Database> | null = null
let persistChain: Promise<void> = Promise.resolve()
let memoryOnly = false

function staticSqlBase(): string {
  const base = import.meta.env.BASE_URL || "/"
  const normalized = base.endsWith("/") ? base : `${base}/`
  return `${normalized}static/sql/`
}

function getGlobalInitSqlJs(): ((config?: any) => Promise<SqlJsStatic>) | undefined {
  return (globalThis as any).initSqlJs
}

function loadSqlJs(): Promise<SqlJsStatic> {
  if (sqlJsPromise) return sqlJsPromise

  sqlJsPromise = new Promise((resolve, reject) => {
    const base = staticSqlBase()
    const config = { locateFile: (file: string) => `${base}${file}` }

    const init = getGlobalInitSqlJs()
    if (init) {
      init(config).then(resolve, reject)
      return
    }

    const existing = document.querySelector<HTMLScriptElement>("script[data-sqljs]")
    const script = existing ?? document.createElement("script")
    script.src = `${base}sql-wasm.js`
    script.async = true
    script.dataset.sqljs = "true"

    script.onload = () => {
      const initFn = getGlobalInitSqlJs()
      if (!initFn) {
        reject(new Error("sql.js 加载失败：未找到 initSqlJs"))
        return
      }
      initFn(config).then(resolve, reject)
    }
    script.onerror = () => reject(new Error("sql.js 脚本加载失败，请确认 static/sql 已构建"))

    if (!existing) {
      document.head.appendChild(script)
    }
  })

  return sqlJsPromise
}

async function loadSavedBytes(): Promise<Uint8Array | null> {
  if (!isIndexedDbAvailable()) {
    memoryOnly = true
    return null
  }
  try {
    return await idbGet(DB_KEY)
  } catch (error) {
    console.warn("[db] 读取 IndexedDB 失败，将使用内存数据库:", error)
    memoryOnly = true
    return null
  }
}

function openDatabase(SQL: SqlJsStatic, bytes: Uint8Array | null): Database {
  if (!bytes || bytes.length === 0) {
    return new SQL.Database()
  }

  const db = new SQL.Database(bytes)
  // 查询 system 表，确认这是一个可用的 SQLite 文件
  db.exec("SELECT name FROM sqlite_master WHERE type='table' LIMIT 1")
  return db
}

async function backupCorrupted(bytes: Uint8Array): Promise<void> {
  if (!isIndexedDbAvailable()) return
  try {
    await idbSet(CORRUPT_KEY, bytes)
    console.warn("[db] 原数据库已备份到 IndexedDB 的 db.corrupt")
  } catch (error) {
    console.warn("[db] 备份损坏数据库失败:", error)
  }
}

async function createFreshDatabase(SQL: SqlJsStatic): Promise<Database> {
  const db = new SQL.Database()
  initSchema(db)
  seedDefaults(db)
  return db
}

async function persistBytes(bytes: Uint8Array): Promise<void> {
  if (memoryOnly || !isIndexedDbAvailable()) {
    memoryOnly = true
    return
  }
  await idbSet(DB_KEY, bytes)
}

async function initialize(): Promise<Database> {
  const SQL = await loadSqlJs()
  const saved = await loadSavedBytes()

  let db: Database
  if (saved && saved.length > 0) {
    try {
      db = openDatabase(SQL, saved)
      initSchema(db)
      seedDefaults(db)
    } catch (error) {
      console.error("[db] 本地数据库损坏，已重新创建:", error)
      await backupCorrupted(saved)
      db = await createFreshDatabase(SQL)
    }
  } else {
    db = await createFreshDatabase(SQL)
  }

  dbInstance = db

  // 首次启动或数据库有变化时写回，确保默认分类落盘
  try {
    await persistBytes(db.export())
  } catch (error) {
    console.warn("[db] 初始数据写入 IndexedDB 失败:", error)
    memoryOnly = true
  }

  // 每天首次打开时保留一份本机快照
  // 等待完成，保证「我的」页读取快照列表时能看到当天的快照
  await maybeCreateDailySnapshot(db)

  // 尽量申请持久化存储，降低被系统清理的概率（iOS 上不一定生效）
  try {
    const storage = (navigator as any).storage
    if (storage && typeof storage.persist === "function") {
      storage.persist().catch(() => undefined)
    }
  } catch {
    // 忽略
  }

  return db
}

/** 获取数据库单例；首次调用会加载 WASM 并从 IndexedDB 恢复 */
export function getDb(): Promise<Database> {
  if (dbInstance) return Promise.resolve(dbInstance)
  if (!initPromise) {
    initPromise = initialize().catch((error) => {
      initPromise = null
      throw error
    })
  }
  return initPromise
}

/** 提前加载数据库，不阻塞页面渲染 */
export function preloadLocalDb(): void {
  getDb().catch((error) => {
    console.error("[db] 预加载本地数据库失败:", error)
  })
}

function queuePersist(): Promise<void> {
  const task = persistChain.then(async () => {
    const db = dbInstance
    if (!db) return
    await persistBytes(db.export())
  })
  // 即使某次持久化失败，也不阻断后续写入
  persistChain = task.catch(() => undefined)
  return task
}

/**
 * 串行执行一次写操作，并在完成后把数据库写入 IndexedDB。
 * 写函数必须是同步的，且在单次调用内完成全部写入。
 */
export async function runWrite<T>(fn: (db: Database) => T): Promise<T> {
  const db = await getDb()
  const result = fn(db)
  await queuePersist()
  return result
}

export type SnapshotKind = "daily" | "safety" | "manual"

export interface SnapshotInfo {
  key: string
  kind: SnapshotKind
  label: string
  createdAt: string
}

function pad2(value: number): string {
  return String(value).padStart(2, "0")
}

function snapshotKey(kind: SnapshotKind): string {
  const now = new Date()
  if (kind === "daily") {
    return `snapshot.daily.${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`
  }
  const stamp = `${now.getFullYear()}${pad2(now.getMonth() + 1)}${pad2(now.getDate())}-${pad2(now.getHours())}${pad2(now.getMinutes())}${pad2(now.getSeconds())}`
  return `snapshot.${kind}.${stamp}`
}

function snapshotInfo(key: string): SnapshotInfo | null {
  if (key.startsWith("snapshot.daily.")) {
    const date = key.slice("snapshot.daily.".length)
    return { key, kind: "daily", label: "每日自动快照", createdAt: `${date} 00:00:00` }
  }
  if (key.startsWith("snapshot.safety.")) {
    return { key, kind: "safety", label: "操作前自动快照", createdAt: parseSnapshotStamp(key) }
  }
  if (key.startsWith("snapshot.manual.")) {
    return { key, kind: "manual", label: "手动快照", createdAt: parseSnapshotStamp(key) }
  }
  return null
}

function parseSnapshotStamp(key: string): string {
  const stamp = key.split(".").pop() || ""
  const match = /^(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})$/.exec(stamp)
  if (!match) return ""
  return `${match[1]}-${match[2]}-${match[3]} ${match[4]}:${match[5]}:${match[6]}`
}

async function pruneSnapshots(): Promise<void> {
  if (!isIndexedDbAvailable()) return
  const keys = (await idbKeys()).filter((key) => key.startsWith(SNAPSHOT_PREFIX))
  const groups: Record<SnapshotKind, string[]> = { daily: [], safety: [], manual: [] }
  for (const key of keys) {
    if (key.startsWith("snapshot.daily.")) groups.daily.push(key)
    else if (key.startsWith("snapshot.safety.")) groups.safety.push(key)
    else if (key.startsWith("snapshot.manual.")) groups.manual.push(key)
  }
  const limits: Record<SnapshotKind, number> = {
    daily: DAILY_SNAPSHOT_LIMIT,
    safety: SAFETY_SNAPSHOT_LIMIT,
    manual: MANUAL_SNAPSHOT_LIMIT,
  }
  for (const kind of Object.keys(groups) as SnapshotKind[]) {
    const stale = groups[kind].sort().reverse().slice(limits[kind])
    for (const key of stale) {
      try {
        await idbDelete(key)
      } catch (error) {
        console.warn("[db] 清理旧快照失败:", key, error)
      }
    }
  }
}

async function saveSnapshotBytes(bytes: Uint8Array, kind: SnapshotKind): Promise<string | null> {
  if (memoryOnly || !isIndexedDbAvailable()) return null
  const key = snapshotKey(kind)
  if (kind === "daily" && (await idbGet(key))) return key
  await idbSet(key, bytes)
  await pruneSnapshots()
  return key
}

/** 立即创建一份快照；type 为 manual 时可由用户主动触发 */
export async function createSnapshot(kind: SnapshotKind = "manual"): Promise<string> {
  const db = await getDb()
  const key = await saveSnapshotBytes(db.export(), kind)
  if (!key) throw new Error("当前浏览器无法保存快照")
  return key
}

async function maybeCreateDailySnapshot(db: Database): Promise<void> {
  if (memoryOnly || !isIndexedDbAvailable()) return
  try {
    const result = db.exec("SELECT COUNT(*) FROM mini_bookkeeping_record")
    const count = Number(result[0]?.values?.[0]?.[0] || 0)
    if (count <= 0) return
    const key = snapshotKey("daily")
    if (await idbGet(key)) return
    await idbSet(key, db.export())
    await pruneSnapshots()
  } catch (error) {
    console.warn("[db] 创建每日快照失败:", error)
  }
}

/** 列出本机自动/手动快照（不读取快照内容，避免占用内存） */
export async function listSnapshots(): Promise<SnapshotInfo[]> {
  if (!isIndexedDbAvailable()) return []
  const keys = await idbKeys()
  return keys
    .filter((key) => key.startsWith(SNAPSHOT_PREFIX))
    .map(snapshotInfo)
    .filter((info): info is SnapshotInfo => !!info)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

/** 用某份快照恢复数据库（恢复前会自动保留当前数据） */
export async function restoreSnapshot(key: string): Promise<void> {
  const bytes = await idbGet(key)
  if (!bytes || bytes.length === 0) {
    throw new Error("快照不存在或已被清理")
  }
  await importSqliteFile(bytes)
}

export async function deleteSnapshot(key: string): Promise<void> {
  await idbDelete(key)
}

/** 导出 .sqlite 文件字节 */
export async function exportSqliteFile(): Promise<Uint8Array> {
  const db = await getDb()
  await persistChain
  return db.export()
}

/** 用 .sqlite 文件整体替换当前数据库 */
export async function importSqliteFile(bytes: Uint8Array): Promise<void> {
  if (!bytes || bytes.length === 0) {
    throw new Error("备份文件为空")
  }

  const SQL = await loadSqlJs()
  let nextDb: Database
  try {
    nextDb = new SQL.Database(bytes)
    const result = nextDb.exec("SELECT name FROM sqlite_master WHERE type='table'")
    const tables = new Set<string>()
    if (result.length > 0) {
      for (const row of result[0].values) {
        tables.add(String(row[0]))
      }
    }
    if (!tables.has("mini_bookkeeping_record") || !tables.has("mini_bookkeeping_category")) {
      throw new Error("不是有效的本地记账数据库")
    }
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "备份文件无法读取")
  }

  // 补齐可能缺失的表和默认分类
  initSchema(nextDb)
  seedDefaults(nextDb)

  // 替换前先保留当前数据库，导入出错或误操作时可恢复
  if (dbInstance) {
    try {
      await createSnapshot("safety")
    } catch (error) {
      console.warn("[db] 导入前创建快照失败:", error)
    }
  }

  // 先落盘，成功后再替换内存中的数据库；失败则保持原数据不变
  await persistBytes(nextDb.export())

  const previous = dbInstance
  dbInstance = nextDb
  initPromise = Promise.resolve(nextDb)
  if (previous) {
    try {
      previous.close()
    } catch {
      // 忽略关闭异常
    }
  }
}

/** 清空记账数据（保留系统分类） */
export async function clearDatabase(): Promise<void> {
  try {
    await createSnapshot("safety")
  } catch (error) {
    console.warn("[db] 清空前创建快照失败:", error)
  }
  await runWrite((db) => clearAll(db))
}

/** 删除持久化数据（调试/重置用） */
export async function removePersistedDatabase(): Promise<void> {
  await idbDelete(DB_KEY)
}

export function isMemoryOnly(): boolean {
  return memoryOnly
}

export function isPersistentStorageAvailable(): boolean {
  return isIndexedDbAvailable() && !memoryOnly
}
