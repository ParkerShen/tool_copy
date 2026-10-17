/**
 * 极简 IndexedDB 键值存储，用于持久化 SQLite 数据库文件。
 * 不依赖第三方库；IndexedDB 不可用（隐私模式等）时由调用方降级为内存模式。
 */
const DB_NAME = "local-bookkeeping"
const STORE_NAME = "files"
const DB_VERSION = 1

let dbPromise: Promise<IDBDatabase | null> | null = null

export function isIndexedDbAvailable(): boolean {
  try {
    return typeof indexedDB !== "undefined" && indexedDB !== null
  } catch {
    return false
  }
}

function openDatabase(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve) => {
    if (!isIndexedDbAvailable()) {
      resolve(null)
      return
    }

    let request: IDBOpenDBRequest
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION)
    } catch (error) {
      console.warn("[idb] 打开 IndexedDB 失败:", error)
      resolve(null)
      return
    }

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => {
      console.warn("[idb] 打开 IndexedDB 失败:", request.error)
      resolve(null)
    }
    request.onblocked = () => {
      console.warn("[idb] IndexedDB 被其他页面占用")
      resolve(null)
    }
  })

  return dbPromise
}

export async function idbGet(key: string): Promise<Uint8Array | null> {
  const db = await openDatabase()
  if (!db) return null

  return new Promise((resolve, reject) => {
    let tx: IDBTransaction
    try {
      tx = db.transaction(STORE_NAME, "readonly")
    } catch (error) {
      reject(error)
      return
    }
    const request = tx.objectStore(STORE_NAME).get(key)
    request.onsuccess = () => {
      const value = request.result
      if (value instanceof Uint8Array) {
        resolve(value)
      } else if (value instanceof ArrayBuffer) {
        resolve(new Uint8Array(value))
      } else if (value === undefined || value === null) {
        resolve(null)
      } else {
        resolve(null)
      }
    }
    request.onerror = () => reject(request.error)
  })
}

export async function idbSet(key: string, value: Uint8Array): Promise<void> {
  const db = await openDatabase()
  if (!db) {
    throw new Error("当前浏览器无法使用 IndexedDB，数据无法持久化")
  }

  return new Promise((resolve, reject) => {
    let tx: IDBTransaction
    try {
      tx = db.transaction(STORE_NAME, "readwrite")
    } catch (error) {
      reject(error)
      return
    }
    // 复制一份，避免把 WASM 堆上的视图直接交给 IndexedDB
    const copy = new Uint8Array(value)
    const request = tx.objectStore(STORE_NAME).put(copy, key)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
    tx.onabort = () => reject(tx.error || new Error("IndexedDB 写入被中止"))
    tx.onerror = () => reject(tx.error || new Error("IndexedDB 写入失败"))
  })
}

export async function idbDelete(key: string): Promise<void> {
  const db = await openDatabase()
  if (!db) return

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite")
    const request = tx.objectStore(STORE_NAME).delete(key)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

/** 列出所有键（用于自动快照的清理与展示） */
export async function idbKeys(): Promise<string[]> {
  const db = await openDatabase()
  if (!db) return []

  return new Promise((resolve, reject) => {
    let tx: IDBTransaction
    try {
      tx = db.transaction(STORE_NAME, "readonly")
    } catch (error) {
      reject(error)
      return
    }
    const request = tx.objectStore(STORE_NAME).getAllKeys()
    request.onsuccess = () => resolve(request.result.map((key) => String(key)))
    request.onerror = () => reject(request.error)
  })
}
