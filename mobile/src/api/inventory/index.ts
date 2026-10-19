/**
 * 收纳异步门面：读走 getDb()，写走 runWrite()，
 * 与记账、倒数日共用同一个 SQLite 数据库和持久化队列。
 */
import type { Database } from "sql.js"
import { getDb, runWrite } from "../bookkeeping/db"
import * as sql from "./sql"
import type {
  CreateItemInput,
  CreateLocationInput,
  CreateTagInput,
  InventoryBackup,
  InventoryFilters,
  InventoryItem,
  InventoryItemDetail,
  InventorySummary,
  InventoryTag,
  ItemListResult,
  MaintenanceEntry,
  MaintenanceInput,
  UpdateItemInput,
  UpdateLocationInput,
  UpdateTagInput,
} from "./types"

export * from "./types"

/** 收纳只支持本地 SQLite 模式（standalone 构建） */
export const isInventoryAvailable = import.meta.env.VITE_DATA_MODE !== "server"

function assertLocalMode(): void {
  if (!isInventoryAvailable) {
    throw new Error("收纳仅支持本地数据模式，请使用 standalone 构建")
  }
}

async function read<T>(fn: (db: Database) => T): Promise<T> {
  assertLocalMode()
  return fn(await getDb())
}

function write<T>(fn: (db: Database) => T): Promise<T> {
  assertLocalMode()
  return runWrite(fn)
}

// 位置 -----------------------------------------------------------------------

export function listLocations() {
  return read((db) => sql.listLocations(db))
}

export function getLocationTree() {
  return read((db) => sql.buildLocationTree(db))
}

export function getLocation(id: string) {
  return read((db) => sql.getLocation(db, id))
}

export function getLocationPath(id: string | null) {
  return read((db) => sql.getLocationPath(db, id))
}

export function createLocation(input: CreateLocationInput) {
  return write((db) => sql.createLocation(db, input))
}

export function updateLocation(id: string, patch: UpdateLocationInput) {
  return write((db) => sql.updateLocation(db, id, patch))
}

export function moveLocation(id: string, parentId: string | null) {
  return write((db) => sql.moveLocation(db, id, parentId))
}

export function deleteLocation(id: string) {
  return write((db) => sql.deleteLocation(db, id))
}

// 物品 -----------------------------------------------------------------------

export function listItems(filters: InventoryFilters = {}): Promise<ItemListResult> {
  return read((db) => sql.listItems(db, filters))
}

export function getItem(id: string): Promise<InventoryItem | null> {
  return read((db) => sql.getItem(db, id))
}

export function getItemDetail(id: string): Promise<InventoryItemDetail | null> {
  return read((db) => sql.getItemDetail(db, id))
}

export function findItemByIdOrCode(input: string): Promise<InventoryItem | null> {
  return read((db) => sql.findItemByIdOrCode(db, input))
}

export function createItem(input: CreateItemInput): Promise<InventoryItemDetail> {
  return write((db) => sql.createItem(db, input))
}

export function updateItem(id: string, input: UpdateItemInput): Promise<InventoryItemDetail> {
  return write((db) => sql.updateItem(db, id, input))
}

export function setItemArchived(id: string, archived: boolean): Promise<InventoryItem> {
  return write((db) => sql.setItemArchived(db, id, archived))
}

export function adjustQuantity(id: string, quantity: number): Promise<InventoryItem> {
  return write((db) => sql.adjustQuantity(db, id, quantity))
}

export function deleteItem(id: string): Promise<void> {
  return write((db) => sql.deleteItem(db, id))
}

export function getInventorySummary(): Promise<InventorySummary> {
  return read((db) => sql.getInventorySummary(db))
}

// 标签 -----------------------------------------------------------------------

export function listTags(): Promise<InventoryTag[]> {
  return read((db) => sql.listTags(db))
}

export function createTag(input: CreateTagInput): Promise<InventoryTag> {
  return write((db) => sql.createTag(db, input))
}

export function updateTag(id: string, patch: UpdateTagInput): Promise<InventoryTag> {
  return write((db) => sql.updateTag(db, id, patch))
}

export function deleteTag(id: string): Promise<void> {
  return write((db) => sql.deleteTag(db, id))
}

// 维护记录 -------------------------------------------------------------------

export function listMaintenance(itemId: string): Promise<MaintenanceEntry[]> {
  return read((db) => sql.listMaintenance(db, itemId))
}

export function createMaintenance(
  itemId: string,
  input: MaintenanceInput,
): Promise<MaintenanceEntry> {
  return write((db) => sql.createMaintenance(db, itemId, input))
}

export function updateMaintenance(id: string, input: MaintenanceInput): Promise<MaintenanceEntry> {
  return write((db) => sql.updateMaintenance(db, id, input))
}

export function deleteMaintenance(id: string): Promise<void> {
  return write((db) => sql.deleteMaintenance(db, id))
}

// 备份 -----------------------------------------------------------------------

export function exportInventoryBackup(): Promise<InventoryBackup> {
  return read((db) => sql.exportInventoryJson(db))
}

export function clearInventory(): Promise<void> {
  return write((db) => sql.clearInventoryAll(db))
}
