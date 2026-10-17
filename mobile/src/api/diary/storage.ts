/**
 * 日记本地存储。
 *
 * 优先使用 IndexedDB（容量大、支持持久化），浏览器不支持时降级为
 * uni.storage（H5 下是 localStorage，小程序下是本地缓存）。
 * 之所以不复用记账的 SQLite 数据库，是为了让日记模块保持独立，
 * 后续新增提醒事项、倒数日、收纳等模块时互不影响。
 */
import type { DiaryEntry } from "./types"

const DB_NAME = "local-diary"
const DB_VERSION = 1
const STORE_NAME = "entries"
const FALLBACK_KEY = "local-diary:entries"

let dbPromise: Promise<IDBDatabase | null> | null = null

export function isDiaryStorageAvailable(): boolean {
  try {
    return typeof indexedDB !== "undefined" && indexedDB !== null
  } catch {
    return false
  }
}

function openDatabase(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve) => {
    if (!isDiaryStorageAvailable()) {
      resolve(null)
      return
    }

    let request: IDBOpenDBRequest
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION)
    } catch (error) {
      console.warn("[diary] 打开 IndexedDB 失败，改用本地缓存:", error)
      resolve(null)
      return
    }

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" })
        store.createIndex("date", "date", { unique: false })
        store.createIndex("deletedAt", "deletedAt", { unique: false })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => {
      console.warn("[diary] 打开 IndexedDB 失败，改用本地缓存:", request.error)
      resolve(null)
    }
    request.onblocked = () => {
      console.warn("[diary] IndexedDB 被其他页面占用")
      resolve(null)
    }
  })

  return dbPromise
}

function fallbackRead(): DiaryEntry[] {
  try {
    const raw = uni.getStorageSync(FALLBACK_KEY)
    if (Array.isArray(raw)) return raw as DiaryEntry[]
    if (typeof raw === "string" && raw) {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? (parsed as DiaryEntry[]) : []
    }
  } catch (error) {
    console.warn("[diary] 读取本地缓存失败:", error)
  }
  return []
}

function fallbackWrite(entries: DiaryEntry[]): void {
  try {
    uni.setStorageSync(FALLBACK_KEY, entries)
  } catch (error) {
    console.warn("[diary] 写入本地缓存失败:", error)
    throw new Error("本地存储空间不足，日记保存失败")
  }
}

export async function readAllDiaryEntries(): Promise<DiaryEntry[]> {
  const db = await openDatabase()
  if (!db) return fallbackRead()

  return new Promise<DiaryEntry[]>((resolve, reject) => {
    let tx: IDBTransaction
    try {
      tx = db.transaction(STORE_NAME, "readonly")
    } catch (error) {
      reject(error)
      return
    }
    const request = tx.objectStore(STORE_NAME).getAll()
    request.onsuccess = () => resolve((request.result || []) as DiaryEntry[])
    request.onerror = () => reject(request.error)
  }).catch((error) => {
    console.warn("[diary] 读取 IndexedDB 失败，改用本地缓存:", error)
    return fallbackRead()
  })
}

export async function writeDiaryEntry(entry: DiaryEntry): Promise<void> {
  const db = await openDatabase()
  if (!db) {
    const entries = fallbackRead()
    const index = entries.findIndex((item) => item.id === entry.id)
    if (index >= 0) entries[index] = entry
    else entries.push(entry)
    fallbackWrite(entries)
    return
  }

  await new Promise<void>((resolve, reject) => {
    let tx: IDBTransaction
    try {
      tx = db.transaction(STORE_NAME, "readwrite")
    } catch (error) {
      reject(error)
      return
    }
    // JSON 深拷贝，避免把 Vue 响应式 Proxy 交给结构化克隆
    tx.objectStore(STORE_NAME).put(JSON.parse(JSON.stringify(entry)))
    tx.oncomplete = () => resolve()
    tx.onabort = () => reject(tx.error || new Error("IndexedDB 写入被中止"))
    tx.onerror = () => reject(tx.error || new Error("IndexedDB 写入失败"))
  })
}

export async function removeDiaryEntry(id: string): Promise<void> {
  const db = await openDatabase()
  if (!db) {
    fallbackWrite(fallbackRead().filter((item) => item.id !== id))
    return
  }

  await new Promise<void>((resolve, reject) => {
    let tx: IDBTransaction
    try {
      tx = db.transaction(STORE_NAME, "readwrite")
    } catch (error) {
      reject(error)
      return
    }
    tx.objectStore(STORE_NAME).delete(id)
    tx.oncomplete = () => resolve()
    tx.onabort = () => reject(tx.error || new Error("IndexedDB 删除被中止"))
    tx.onerror = () => reject(tx.error || new Error("IndexedDB 删除失败"))
  })
}

export async function replaceAllDiaryEntries(entries: DiaryEntry[]): Promise<void> {
  const db = await openDatabase()
  if (!db) {
    fallbackWrite(entries)
    return
  }

  await new Promise<void>((resolve, reject) => {
    let tx: IDBTransaction
    try {
      tx = db.transaction(STORE_NAME, "readwrite")
    } catch (error) {
      reject(error)
      return
    }
    const store = tx.objectStore(STORE_NAME)
    store.clear()
    entries.forEach((entry) => store.put(JSON.parse(JSON.stringify(entry))))
    tx.oncomplete = () => resolve()
    tx.onabort = () => reject(tx.error || new Error("IndexedDB 写入被中止"))
    tx.onerror = () => reject(tx.error || new Error("IndexedDB 写入失败"))
  })
}
