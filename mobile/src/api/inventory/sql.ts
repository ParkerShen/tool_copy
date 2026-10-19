/**
 * 收纳 SQLite 层。
 *
 * 纯 TypeScript + sql.js，不依赖浏览器 API，便于在 Node 中直接测试。
 * 所有函数接收一个已打开的 Database；写操作不自行开启最外层事务，
 * 由调用方（runWrite / importJson）决定事务边界。
 */
import type { Database, SqlValue } from "sql.js"
import { MAX_AMOUNT_CENTS } from "../bookkeeping/money"
import { generateId } from "../../utils/id"
import {
  DEFAULT_PAGE_SIZE,
  MAX_ASSET_NO,
  MAX_INVENTORY_IMAGE_LENGTH,
  MAX_ITEM_FIELDS,
  MAX_ITEM_PHOTOS,
  MAX_LOCATION_DEPTH,
  type CreateItemInput,
  type CreateLocationInput,
  type CreateTagInput,
  type InventoryBackup,
  type InventoryBackupItem,
  type InventoryField,
  type InventoryFilters,
  type InventoryItem,
  type InventoryItemDetail,
  type InventoryItemSummary,
  type InventoryLocation,
  type InventoryPhoto,
  type InventorySort,
  type InventorySummary,
  type InventoryTag,
  type ItemFieldInput,
  type ItemListResult,
  type ItemPhotoInput,
  type LocationNode,
  type LocationPathItem,
  type MaintenanceEntry,
  type MaintenanceInput,
  type UpdateItemInput,
  type UpdateLocationInput,
  type UpdateTagInput,
} from "./types"

const MAX_LOCATION_NAME = 20
const MAX_ITEM_NAME = 60
const MAX_DESCRIPTION = 1000
const MAX_IDENTIFIER = 100
const MAX_NOTE = 1000
const MAX_FIELD_NAME = 20
const MAX_FIELD_VALUE = 200
const MAX_TAG_NAME = 12
const MAX_QUANTITY = 999_999
const MAX_KEYWORD_TOKENS = 6
const WARRANTY_SOON_DAYS = 30
const MAINTENANCE_SOON_DAYS = 30

function pad2(value: number): string {
  return String(value).padStart(2, "0")
}

function formatDate(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

function nowString(): string {
  const d = new Date()
  return `${formatDate(d)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
}

function dateOffset(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return formatDate(date)
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
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function normalizeText(value: unknown, max: number, label: string): string {
  const text = String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
  if (text.length > max) throw new Error(`${label}不能超过 ${max} 个字`)
  return text
}

function normalizeMultiline(value: unknown, max: number, label: string): string {
  const text = String(value ?? "").trim()
  if (text.length > max) throw new Error(`${label}不能超过 ${max} 个字`)
  return text
}

function normalizeDate(value: unknown, label: string): string {
  const text = String(value ?? "").trim()
  if (!text) return ""
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new Error(`${label}格式应为 YYYY-MM-DD`)
  const date = new Date(`${text}T00:00:00`)
  if (Number.isNaN(date.getTime())) throw new Error(`${label}不正确`)
  return text
}

function normalizeQuantity(value: unknown): number {
  if (value === undefined || value === null || value === "") return 1
  const quantity = Number(value)
  if (!Number.isFinite(quantity)) throw new Error("数量不正确")
  if (quantity < 0) throw new Error("数量不能为负数")
  if (quantity > MAX_QUANTITY) throw new Error("数量过大")
  return Math.round(quantity * 1000) / 1000
}

function normalizeCents(value: unknown, label: string): number {
  if (value === undefined || value === null || value === "") return 0
  const cents = Number(value)
  if (!Number.isFinite(cents) || !Number.isInteger(cents)) throw new Error(`${label}不正确`)
  if (cents < 0) throw new Error(`${label}不能为负数`)
  if (cents > MAX_AMOUNT_CENTS) throw new Error(`${label}过大`)
  return cents
}

function escapeLike(token: string): string {
  return token.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_")
}

function tokenize(keyword: string | undefined): string[] {
  return String(keyword ?? "")
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .slice(0, MAX_KEYWORD_TOKENS)
}

function formatAssetNo(assetNo: number): string {
  const value = Math.trunc(Number(assetNo) || 0)
  if (value <= 0 || value > MAX_ASSET_NO) return ""
  return String(value)
    .padStart(6, "0")
    .replace(/^(\d{3})(\d{3})$/, "$1-$2")
}

function parseAssetNo(input: unknown): number {
  const text = String(input ?? "")
    .trim()
    .replace(/["']/g, "")
  const digits = text.replace(/-/g, "")
  if (!/^\d{1,6}$/.test(digits)) return 0
  const value = Number(digits)
  return value > 0 && value <= MAX_ASSET_NO ? value : 0
}

function mapLocation(row: Record<string, SqlValue>): InventoryLocation {
  return {
    id: asString(row.id),
    parentId: asString(row.parent_id) || null,
    name: asString(row.name),
    icon: asString(row.icon, "folder"),
    color: asString(row.color, "#2ba471"),
    sortOrder: asNumber(row.sort_order),
    createdAt: asString(row.created_at),
    updatedAt: asString(row.updated_at),
  }
}

function mapTag(row: Record<string, SqlValue>): InventoryTag {
  return {
    id: asString(row.id),
    name: asString(row.name),
    color: asString(row.color, "#2ba471"),
    createdAt: asString(row.created_at),
    itemCount: row.item_count === undefined ? undefined : asNumber(row.item_count),
  }
}

function mapItem(row: Record<string, SqlValue>): InventoryItem {
  const assetNo = asNumber(row.asset_no)
  return {
    id: asString(row.id),
    assetNo,
    assetCode: formatAssetNo(assetNo),
    name: asString(row.name),
    description: asString(row.description),
    quantity: asNumber(row.quantity, 1),
    unit: asString(row.unit),
    locationId: asString(row.location_id) || null,
    serialNumber: asString(row.serial_number),
    modelNumber: asString(row.model_number),
    manufacturer: asString(row.manufacturer),
    purchasePriceCents: asNumber(row.purchase_price_cents),
    purchaseDate: asString(row.purchase_date),
    purchaseFrom: asString(row.purchase_from),
    warrantyExpiresOn: asString(row.warranty_expires_on),
    lifetimeWarranty: asNumber(row.lifetime_warranty) === 1,
    warrantyNote: asString(row.warranty_note),
    archived: asNumber(row.archived) === 1,
    createdAt: asString(row.created_at),
    updatedAt: asString(row.updated_at),
  }
}

function mapPhoto(row: Record<string, SqlValue>): InventoryPhoto {
  return {
    id: asString(row.id),
    itemId: asString(row.item_id),
    dataUrl: asString(row.data_url),
    thumbUrl: asString(row.thumb_url),
    sortOrder: asNumber(row.sort_order),
  }
}

function mapField(row: Record<string, SqlValue>): InventoryField {
  return {
    id: asString(row.id),
    itemId: asString(row.item_id),
    name: asString(row.name),
    value: asString(row.value),
    sortOrder: asNumber(row.sort_order),
  }
}

function mapMaintenance(row: Record<string, SqlValue>): MaintenanceEntry {
  return {
    id: asString(row.id),
    itemId: asString(row.item_id),
    name: asString(row.name),
    completedOn: asString(row.completed_on),
    scheduledOn: asString(row.scheduled_on),
    costCents: asNumber(row.cost_cents),
    description: asString(row.description),
    createdAt: asString(row.created_at),
  }
}

// ---------------------------------------------------------------------------
// 位置
// ---------------------------------------------------------------------------

export function listLocations(db: Database): InventoryLocation[] {
  return queryAll(
    db,
    `SELECT * FROM mini_inventory_location
     ORDER BY sort_order ASC, name COLLATE NOCASE ASC, created_at ASC`,
  ).map(mapLocation)
}

export function getLocation(db: Database, id: string): InventoryLocation | null {
  const row = queryOne(db, "SELECT * FROM mini_inventory_location WHERE id = ?", [id])
  return row ? mapLocation(row) : null
}

function locationDepth(db: Database, id: string): number {
  let depth = 0
  let current: string | null = id
  const visited = new Set<string>()
  while (current && visited.size < MAX_LOCATION_DEPTH + 2) {
    if (visited.has(current)) throw new Error("位置层级存在循环")
    visited.add(current)
    const row = queryOne(db, "SELECT parent_id FROM mini_inventory_location WHERE id = ?", [
      current,
    ])
    if (!row) break
    depth += 1
    current = asString(row.parent_id) || null
  }
  return depth
}

function locationSubtreeHeight(db: Database, id: string): number {
  const rows = queryAll(db, "SELECT id, parent_id FROM mini_inventory_location")
  const children = new Map<string, string[]>()
  for (const row of rows) {
    const parentId = asString(row.parent_id)
    if (!parentId) continue
    const list = children.get(parentId) || []
    list.push(asString(row.id))
    children.set(parentId, list)
  }

  const visiting = new Set<string>()
  function walk(current: string): number {
    if (visiting.has(current)) throw new Error("位置层级存在循环")
    visiting.add(current)
    const list = children.get(current) || []
    let height = 1
    for (const child of list) {
      height = Math.max(height, 1 + walk(child))
    }
    visiting.delete(current)
    return height
  }
  return walk(id)
}

function assertSiblingName(
  db: Database,
  parentId: string | null,
  name: string,
  excludeId = "",
): void {
  const row = queryOne(
    db,
    `SELECT id FROM mini_inventory_location
     WHERE LOWER(name) = LOWER(?)
       AND COALESCE(parent_id, '') = COALESCE(?, '')
       AND id <> ?`,
    [name, parentId, excludeId],
  )
  if (row) throw new Error("同一层级下已有同名位置")
}

function assertLocationExists(db: Database, id: string): InventoryLocation {
  const location = getLocation(db, id)
  if (!location) throw new Error("位置不存在")
  return location
}

export function createLocation(db: Database, input: CreateLocationInput): InventoryLocation {
  const name = normalizeText(input.name, MAX_LOCATION_NAME, "位置名称")
  if (!name) throw new Error("请输入位置名称")
  const parentId = input.parentId || null
  if (parentId) {
    assertLocationExists(db, parentId)
    if (locationDepth(db, parentId) + 1 > MAX_LOCATION_DEPTH) {
      throw new Error(`位置最多 ${MAX_LOCATION_DEPTH} 层`)
    }
  }
  assertSiblingName(db, parentId, name)

  const id = generateId()
  const now = nowString()
  const sortOrder =
    input.sortOrder === undefined
      ? asNumber(
          queryOne(
            db,
            `SELECT COALESCE(MAX(sort_order), 0) + 1 AS next
             FROM mini_inventory_location
             WHERE COALESCE(parent_id, '') = COALESCE(?, '')`,
            [parentId],
          )?.next,
        )
      : Math.trunc(Number(input.sortOrder) || 0)

  db.run(
    `INSERT INTO mini_inventory_location
      (id, parent_id, name, icon, color, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, parentId, name, input.icon || "folder", input.color || "#2ba471", sortOrder, now, now],
  )
  return assertLocationExists(db, id)
}

export function updateLocation(
  db: Database,
  id: string,
  patch: UpdateLocationInput,
): InventoryLocation {
  const current = assertLocationExists(db, id)
  const name =
    patch.name === undefined
      ? current.name
      : normalizeText(patch.name, MAX_LOCATION_NAME, "位置名称")
  if (!name) throw new Error("请输入位置名称")
  if (patch.name !== undefined) {
    assertSiblingName(db, current.parentId, name, id)
  }

  db.run(
    `UPDATE mini_inventory_location
     SET name = ?, icon = ?, color = ?, sort_order = ?, updated_at = ?
     WHERE id = ?`,
    [
      name,
      patch.icon === undefined ? current.icon : String(patch.icon || "folder"),
      patch.color === undefined ? current.color : String(patch.color || "#2ba471"),
      patch.sortOrder === undefined ? current.sortOrder : Math.trunc(Number(patch.sortOrder) || 0),
      nowString(),
      id,
    ],
  )
  return assertLocationExists(db, id)
}

export function moveLocation(db: Database, id: string, parentId: string | null): InventoryLocation {
  const current = assertLocationExists(db, id)
  const target = parentId || null
  if (target === id) throw new Error("不能把位置移动到自身下面")
  if (target) {
    assertLocationExists(db, target)
    const descendants = listDescendantLocationIds(db, id)
    if (descendants.includes(target)) throw new Error("不能把位置移动到自己的子位置下面")
    if (locationDepth(db, target) + locationSubtreeHeight(db, id) > MAX_LOCATION_DEPTH) {
      throw new Error(`位置最多 ${MAX_LOCATION_DEPTH} 层`)
    }
    assertSiblingName(db, target, current.name, id)
  } else {
    assertSiblingName(db, null, current.name, id)
  }

  db.run("UPDATE mini_inventory_location SET parent_id = ?, updated_at = ? WHERE id = ?", [
    target,
    nowString(),
    id,
  ])
  return assertLocationExists(db, id)
}

export function deleteLocation(db: Database, id: string): void {
  assertLocationExists(db, id)
  const now = nowString()
  db.run(
    "UPDATE mini_inventory_location SET parent_id = NULL, updated_at = ? WHERE parent_id = ?",
    [now, id],
  )
  db.run(
    "UPDATE mini_inventory_item SET location_id = NULL, updated_at = ? WHERE location_id = ?",
    [now, id],
  )
  db.run("DELETE FROM mini_inventory_location WHERE id = ?", [id])
}

export function listDescendantLocationIds(db: Database, id: string): string[] {
  const rows = queryAll(db, "SELECT id, parent_id FROM mini_inventory_location")
  const children = new Map<string, string[]>()
  for (const row of rows) {
    const parentId = asString(row.parent_id)
    if (!parentId) continue
    const list = children.get(parentId) || []
    list.push(asString(row.id))
    children.set(parentId, list)
  }

  const result: string[] = []
  const queue = [id]
  const visited = new Set<string>()
  while (queue.length > 0) {
    const current = queue.shift() as string
    if (visited.has(current)) continue
    visited.add(current)
    result.push(current)
    queue.push(...(children.get(current) || []))
  }
  return result
}

export function getLocationPath(db: Database, id: string | null): LocationPathItem[] {
  if (!id) return []
  const path: LocationPathItem[] = []
  const visited = new Set<string>()
  let current: string | null = id
  while (current) {
    if (visited.has(current)) break
    visited.add(current)
    const row = queryOne(
      db,
      "SELECT id, name, parent_id FROM mini_inventory_location WHERE id = ?",
      [current],
    )
    if (!row) break
    path.push({ id: asString(row.id), name: asString(row.name) })
    current = asString(row.parent_id) || null
  }
  return path.reverse()
}

export function buildLocationTree(db: Database): LocationNode[] {
  const locations = listLocations(db)
  const counts = new Map<string, number>()
  const countRows = queryAll(
    db,
    `SELECT location_id, COUNT(*) AS total
     FROM mini_inventory_item
     WHERE archived = 0 AND location_id IS NOT NULL AND location_id <> ''
     GROUP BY location_id`,
  )
  for (const row of countRows) {
    counts.set(asString(row.location_id), asNumber(row.total))
  }

  const nodes = new Map<string, LocationNode>()
  for (const location of locations) {
    nodes.set(location.id, {
      ...location,
      itemCount: counts.get(location.id) || 0,
      totalItemCount: counts.get(location.id) || 0,
      children: [],
    })
  }

  const roots: LocationNode[] = []
  for (const node of nodes.values()) {
    const parent = node.parentId ? nodes.get(node.parentId) : undefined
    if (parent) {
      parent.children.push(node)
    } else {
      roots.push(node)
    }
  }

  function accumulate(node: LocationNode, visited: Set<string>): number {
    if (visited.has(node.id)) return 0
    visited.add(node.id)
    let total = node.itemCount
    for (const child of node.children) {
      total += accumulate(child, visited)
    }
    node.totalItemCount = total
    return total
  }

  for (const root of roots) accumulate(root, new Set())
  return roots
}

// ---------------------------------------------------------------------------
// 标签
// ---------------------------------------------------------------------------

export function listTags(db: Database): InventoryTag[] {
  return queryAll(
    db,
    `SELECT t.*, COUNT(it.item_id) AS item_count
     FROM mini_inventory_tag t
     LEFT JOIN mini_inventory_item_tag it ON it.tag_id = t.id
     GROUP BY t.id
     ORDER BY t.name COLLATE NOCASE ASC`,
  ).map(mapTag)
}

function assertTagNameUnique(db: Database, name: string, excludeId = ""): void {
  const row = queryOne(
    db,
    "SELECT id FROM mini_inventory_tag WHERE LOWER(name) = LOWER(?) AND id <> ?",
    [name, excludeId],
  )
  if (row) throw new Error("标签已存在")
}

export function createTag(db: Database, input: CreateTagInput): InventoryTag {
  const name = normalizeText(input.name, MAX_TAG_NAME, "标签名称")
  if (!name) throw new Error("请输入标签名称")
  assertTagNameUnique(db, name)

  const id = generateId()
  db.run("INSERT INTO mini_inventory_tag (id, name, color, created_at) VALUES (?, ?, ?, ?)", [
    id,
    name,
    input.color || "#2ba471",
    nowString(),
  ])
  const created = queryOne(db, "SELECT * FROM mini_inventory_tag WHERE id = ?", [id])
  if (!created) throw new Error("标签创建失败")
  return mapTag(created)
}

export function updateTag(db: Database, id: string, patch: UpdateTagInput): InventoryTag {
  const row = queryOne(db, "SELECT * FROM mini_inventory_tag WHERE id = ?", [id])
  if (!row) throw new Error("标签不存在")
  const current = mapTag(row)
  const name =
    patch.name === undefined ? current.name : normalizeText(patch.name, MAX_TAG_NAME, "标签名称")
  if (!name) throw new Error("请输入标签名称")
  if (patch.name !== undefined) assertTagNameUnique(db, name, id)

  db.run("UPDATE mini_inventory_tag SET name = ?, color = ? WHERE id = ?", [
    name,
    patch.color === undefined ? current.color : String(patch.color || "#2ba471"),
    id,
  ])
  const updated = queryOne(db, "SELECT * FROM mini_inventory_tag WHERE id = ?", [id])
  if (!updated) throw new Error("标签更新失败")
  return mapTag(updated)
}

export function deleteTag(db: Database, id: string): void {
  const row = queryOne(db, "SELECT id FROM mini_inventory_tag WHERE id = ?", [id])
  if (!row) throw new Error("标签不存在")
  db.run("DELETE FROM mini_inventory_item_tag WHERE tag_id = ?", [id])
  db.run("DELETE FROM mini_inventory_tag WHERE id = ?", [id])
}

function normalizeTagIds(db: Database, tagIds: string[] | undefined): string[] {
  if (tagIds === undefined) return []
  if (!Array.isArray(tagIds)) throw new Error("标签格式不正确")
  const unique: string[] = []
  for (const raw of tagIds) {
    const id = String(raw ?? "").trim()
    if (id && !unique.includes(id)) unique.push(id)
  }
  if (unique.length === 0) return []
  const placeholders = unique.map(() => "?").join(",")
  const rows = queryAll(
    db,
    `SELECT id FROM mini_inventory_tag WHERE id IN (${placeholders})`,
    unique,
  )
  if (rows.length !== unique.length) throw new Error("包含不存在的标签")
  return unique
}

// ---------------------------------------------------------------------------
// 物品
// ---------------------------------------------------------------------------

function normalizePhotos(photos: ItemPhotoInput[] | undefined): ItemPhotoInput[] {
  if (photos === undefined) return []
  if (!Array.isArray(photos)) throw new Error("照片格式不正确")
  if (photos.length > MAX_ITEM_PHOTOS) throw new Error(`每件物品最多 ${MAX_ITEM_PHOTOS} 张照片`)
  const result: ItemPhotoInput[] = []
  for (const photo of photos) {
    const dataUrl = String(photo?.dataUrl ?? "").trim()
    if (!dataUrl) continue
    if (!/^data:image\/[\w.+-]+;base64,/i.test(dataUrl)) {
      throw new Error("照片格式不支持，请重新选择")
    }
    if (dataUrl.length > MAX_INVENTORY_IMAGE_LENGTH) throw new Error("照片太大，请重新选择")
    const thumbUrl = String(photo?.thumbUrl ?? "").trim() || dataUrl
    if (thumbUrl.length > MAX_INVENTORY_IMAGE_LENGTH) throw new Error("照片太大，请重新选择")
    result.push({ dataUrl, thumbUrl })
  }
  return result
}

function normalizeFields(fields: ItemFieldInput[] | undefined): ItemFieldInput[] {
  if (fields === undefined) return []
  if (!Array.isArray(fields)) throw new Error("自定义属性格式不正确")
  const result: ItemFieldInput[] = []
  for (const field of fields) {
    const name = normalizeText(field?.name, MAX_FIELD_NAME, "属性名称")
    const value = normalizeMultiline(field?.value, MAX_FIELD_VALUE, "属性值")
    if (!name && !value) continue
    if (!name) throw new Error("请填写属性名称")
    result.push({ name, value })
  }
  if (result.length > MAX_ITEM_FIELDS) throw new Error(`最多 ${MAX_ITEM_FIELDS} 条自定义属性`)
  return result
}

function normalizeLocationId(db: Database, locationId: string | null | undefined): string | null {
  const id = String(locationId ?? "").trim()
  if (!id) return null
  assertLocationExists(db, id)
  return id
}

function nextAssetNo(db: Database): number {
  const row = queryOne(db, "SELECT COALESCE(MAX(asset_no), 0) + 1 AS next FROM mini_inventory_item")
  const next = asNumber(row?.next, 1)
  if (next > MAX_ASSET_NO) throw new Error("物品编号已用完")
  return next
}

export function createItem(db: Database, input: CreateItemInput): InventoryItemDetail {
  const name = normalizeText(input.name, MAX_ITEM_NAME, "物品名称")
  if (!name) throw new Error("请输入物品名称")
  const quantity = normalizeQuantity(input.quantity)
  const locationId = normalizeLocationId(db, input.locationId)
  const photos = normalizePhotos(input.photos)
  const tagIds = normalizeTagIds(db, input.tagIds)
  const fields = normalizeFields(input.fields)
  const purchasePriceCents = normalizeCents(input.purchasePriceCents, "购买价格")
  const now = nowString()

  let itemId = ""
  db.run("BEGIN TRANSACTION")
  try {
    itemId = generateId()
    db.run(
      `INSERT INTO mini_inventory_item
        (id, asset_no, name, description, quantity, unit, location_id,
         serial_number, model_number, manufacturer,
         purchase_price_cents, purchase_date, purchase_from,
         warranty_expires_on, lifetime_warranty, warranty_note,
         archived, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      [
        itemId,
        nextAssetNo(db),
        name,
        normalizeMultiline(input.description, MAX_DESCRIPTION, "描述"),
        quantity,
        normalizeText(input.unit, 10, "单位"),
        locationId,
        normalizeText(input.serialNumber, MAX_IDENTIFIER, "序列号"),
        normalizeText(input.modelNumber, MAX_IDENTIFIER, "型号"),
        normalizeText(input.manufacturer, MAX_IDENTIFIER, "厂商"),
        purchasePriceCents,
        normalizeDate(input.purchaseDate, "购买日期"),
        normalizeText(input.purchaseFrom, MAX_IDENTIFIER, "购买渠道"),
        normalizeDate(input.warrantyExpiresOn, "保修到期日"),
        input.lifetimeWarranty ? 1 : 0,
        normalizeMultiline(input.warrantyNote, MAX_NOTE, "保修说明"),
        now,
        now,
      ],
    )
    replaceItemPhotos(db, itemId, photos, now)
    replaceItemFields(db, itemId, fields, now)
    replaceItemTags(db, itemId, tagIds)
    db.run("COMMIT")
  } catch (error) {
    try {
      db.run("ROLLBACK")
    } catch {
      // 保留原始错误
    }
    throw error
  }

  const detail = getItemDetail(db, itemId)
  if (!detail) throw new Error("物品创建失败")
  return detail
}

export function updateItem(db: Database, id: string, input: UpdateItemInput): InventoryItemDetail {
  const existing = getItem(db, id)
  if (!existing) throw new Error("物品不存在")
  const name = normalizeText(input.name, MAX_ITEM_NAME, "物品名称")
  if (!name) throw new Error("请输入物品名称")
  const quantity = normalizeQuantity(input.quantity)
  const locationId = normalizeLocationId(db, input.locationId)
  const photos = normalizePhotos(input.photos)
  const tagIds = normalizeTagIds(db, input.tagIds)
  const fields = normalizeFields(input.fields)
  const purchasePriceCents = normalizeCents(input.purchasePriceCents, "购买价格")
  const now = nowString()

  db.run("BEGIN TRANSACTION")
  try {
    db.run(
      `UPDATE mini_inventory_item
       SET name = ?, description = ?, quantity = ?, unit = ?, location_id = ?,
           serial_number = ?, model_number = ?, manufacturer = ?,
           purchase_price_cents = ?, purchase_date = ?, purchase_from = ?,
           warranty_expires_on = ?, lifetime_warranty = ?, warranty_note = ?,
           updated_at = ?
       WHERE id = ?`,
      [
        name,
        normalizeMultiline(input.description, MAX_DESCRIPTION, "描述"),
        quantity,
        normalizeText(input.unit, 10, "单位"),
        locationId,
        normalizeText(input.serialNumber, MAX_IDENTIFIER, "序列号"),
        normalizeText(input.modelNumber, MAX_IDENTIFIER, "型号"),
        normalizeText(input.manufacturer, MAX_IDENTIFIER, "厂商"),
        purchasePriceCents,
        normalizeDate(input.purchaseDate, "购买日期"),
        normalizeText(input.purchaseFrom, MAX_IDENTIFIER, "购买渠道"),
        normalizeDate(input.warrantyExpiresOn, "保修到期日"),
        input.lifetimeWarranty ? 1 : 0,
        normalizeMultiline(input.warrantyNote, MAX_NOTE, "保修说明"),
        now,
        id,
      ],
    )
    replaceItemPhotos(db, id, photos, now)
    replaceItemFields(db, id, fields, now)
    replaceItemTags(db, id, tagIds)
    db.run("COMMIT")
  } catch (error) {
    try {
      db.run("ROLLBACK")
    } catch {
      // 保留原始错误
    }
    throw error
  }

  const detail = getItemDetail(db, id)
  if (!detail) throw new Error("物品保存失败")
  return detail
}

function replaceItemPhotos(
  db: Database,
  itemId: string,
  photos: ItemPhotoInput[],
  now: string,
): void {
  db.run("DELETE FROM mini_inventory_photo WHERE item_id = ?", [itemId])
  photos.forEach((photo, index) => {
    db.run(
      `INSERT INTO mini_inventory_photo
        (id, item_id, data_url, thumb_url, sort_order, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [generateId(), itemId, photo.dataUrl, photo.thumbUrl, index, now],
    )
  })
}

function replaceItemFields(
  db: Database,
  itemId: string,
  fields: ItemFieldInput[],
  now: string,
): void {
  db.run("DELETE FROM mini_inventory_field WHERE item_id = ?", [itemId])
  fields.forEach((field, index) => {
    db.run(
      `INSERT INTO mini_inventory_field (id, item_id, name, value, sort_order, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [generateId(), itemId, field.name, field.value, index, now],
    )
  })
}

function replaceItemTags(db: Database, itemId: string, tagIds: string[]): void {
  db.run("DELETE FROM mini_inventory_item_tag WHERE item_id = ?", [itemId])
  for (const tagId of tagIds) {
    db.run("INSERT OR IGNORE INTO mini_inventory_item_tag (item_id, tag_id) VALUES (?, ?)", [
      itemId,
      tagId,
    ])
  }
}

export function getItem(db: Database, id: string): InventoryItem | null {
  const row = queryOne(db, "SELECT * FROM mini_inventory_item WHERE id = ?", [id])
  return row ? mapItem(row) : null
}

export function getItemDetail(db: Database, id: string): InventoryItemDetail | null {
  const item = getItem(db, id)
  if (!item) return null

  const photos = queryAll(
    db,
    "SELECT * FROM mini_inventory_photo WHERE item_id = ? ORDER BY sort_order ASC, created_at ASC",
    [id],
  ).map(mapPhoto)
  const tags = queryAll(
    db,
    `SELECT t.* FROM mini_inventory_tag t
     JOIN mini_inventory_item_tag it ON it.tag_id = t.id
     WHERE it.item_id = ?
     ORDER BY t.name COLLATE NOCASE ASC`,
    [id],
  ).map(mapTag)
  const fields = queryAll(
    db,
    "SELECT * FROM mini_inventory_field WHERE item_id = ? ORDER BY sort_order ASC, created_at ASC",
    [id],
  ).map(mapField)
  const maintenance = queryAll(
    db,
    `SELECT * FROM mini_inventory_maintenance
     WHERE item_id = ?
     ORDER BY COALESCE(NULLIF(completed_on, ''), scheduled_on) DESC, created_at DESC`,
    [id],
  ).map(mapMaintenance)
  const locationPath = getLocationPath(db, item.locationId)

  return {
    ...item,
    photos,
    tags,
    fields,
    maintenance,
    locationPath,
    locationText: locationPath.map((part) => part.name).join(" / "),
  }
}

export function findByAssetNo(db: Database, assetNo: number | string): InventoryItem | null {
  const value = typeof assetNo === "number" ? assetNo : parseAssetNo(assetNo)
  if (!value) return null
  const row = queryOne(db, "SELECT * FROM mini_inventory_item WHERE asset_no = ?", [value])
  return row ? mapItem(row) : null
}

export function findItemByIdOrCode(db: Database, input: string): InventoryItem | null {
  const text = String(input ?? "").trim()
  if (!text) return null
  const byId = getItem(db, text)
  if (byId) return byId
  return findByAssetNo(db, text)
}

export function setItemArchived(db: Database, id: string, archived: boolean): InventoryItem {
  const item = getItem(db, id)
  if (!item) throw new Error("物品不存在")
  db.run("UPDATE mini_inventory_item SET archived = ?, updated_at = ? WHERE id = ?", [
    archived ? 1 : 0,
    nowString(),
    id,
  ])
  return getItem(db, id) as InventoryItem
}

export function adjustQuantity(db: Database, id: string, quantity: number): InventoryItem {
  const item = getItem(db, id)
  if (!item) throw new Error("物品不存在")
  const next = normalizeQuantity(quantity)
  db.run("UPDATE mini_inventory_item SET quantity = ?, updated_at = ? WHERE id = ?", [
    next,
    nowString(),
    id,
  ])
  return getItem(db, id) as InventoryItem
}

export function deleteItem(db: Database, id: string): void {
  const item = getItem(db, id)
  if (!item) throw new Error("物品不存在")
  db.run("BEGIN TRANSACTION")
  try {
    db.run("DELETE FROM mini_inventory_photo WHERE item_id = ?", [id])
    db.run("DELETE FROM mini_inventory_field WHERE item_id = ?", [id])
    db.run("DELETE FROM mini_inventory_item_tag WHERE item_id = ?", [id])
    db.run("DELETE FROM mini_inventory_maintenance WHERE item_id = ?", [id])
    db.run("DELETE FROM mini_inventory_item WHERE id = ?", [id])
    db.run("COMMIT")
  } catch (error) {
    try {
      db.run("ROLLBACK")
    } catch {
      // 保留原始错误
    }
    throw error
  }
}

// ---------------------------------------------------------------------------
// 搜索 / 列表
// ---------------------------------------------------------------------------

function buildItemWhere(
  db: Database,
  filters: InventoryFilters,
): { clause: string; params: SqlValue[] } {
  const conditions: string[] = []
  const params: SqlValue[] = []

  if (!filters.includeArchived) conditions.push("i.archived = 0")

  if (filters.onlyUnassigned) {
    conditions.push("(i.location_id IS NULL OR i.location_id = '')")
  } else if (filters.locationId) {
    const ids = listDescendantLocationIds(db, filters.locationId)
    if (ids.length === 0) {
      conditions.push("1 = 0")
    } else {
      conditions.push(`i.location_id IN (${ids.map(() => "?").join(",")})`)
      params.push(...ids)
    }
  }

  const tagIds = (filters.tagIds || []).filter(Boolean)
  if (tagIds.length > 0) {
    conditions.push(
      `EXISTS (
         SELECT 1 FROM mini_inventory_item_tag it
         WHERE it.item_id = i.id AND it.tag_id IN (${tagIds.map(() => "?").join(",")})
       )`,
    )
    params.push(...tagIds)
  }

  if (filters.hasPhoto) {
    conditions.push("EXISTS (SELECT 1 FROM mini_inventory_photo p WHERE p.item_id = i.id)")
  }

  if (filters.warrantyExpiring) {
    conditions.push(
      `i.lifetime_warranty = 0
       AND i.warranty_expires_on <> ''
       AND i.warranty_expires_on >= ?
       AND i.warranty_expires_on <= ?`,
    )
    params.push(dateOffset(0), dateOffset(WARRANTY_SOON_DAYS))
  }

  for (const token of tokenize(filters.keyword)) {
    const pattern = `%${escapeLike(token)}%`
    conditions.push(
      `(
        LOWER(i.name) LIKE ? ESCAPE '\\'
        OR LOWER(i.description) LIKE ? ESCAPE '\\'
        OR LOWER(i.serial_number) LIKE ? ESCAPE '\\'
        OR LOWER(i.model_number) LIKE ? ESCAPE '\\'
        OR LOWER(i.manufacturer) LIKE ? ESCAPE '\\'
        OR EXISTS (
          SELECT 1 FROM mini_inventory_location l
          WHERE l.id = i.location_id AND LOWER(l.name) LIKE ? ESCAPE '\\'
        )
        OR EXISTS (
          SELECT 1 FROM mini_inventory_item_tag it
          JOIN mini_inventory_tag t ON t.id = it.tag_id
          WHERE it.item_id = i.id AND LOWER(t.name) LIKE ? ESCAPE '\\'
        )
        OR EXISTS (
          SELECT 1 FROM mini_inventory_field f
          WHERE f.item_id = i.id AND LOWER(f.value) LIKE ? ESCAPE '\\'
        )
      )`,
    )
    params.push(pattern, pattern, pattern, pattern, pattern, pattern, pattern, pattern)
  }

  return {
    clause: conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "",
    params,
  }
}

function orderByClause(sort: InventorySort | undefined): string {
  switch (sort) {
    case "name":
      return "i.name COLLATE NOCASE ASC, i.asset_no ASC"
    case "assetNo":
      return "i.asset_no ASC"
    case "priceDesc":
      return "i.purchase_price_cents DESC, i.updated_at DESC"
    default:
      return "i.updated_at DESC, i.id DESC"
  }
}

export function listItems(db: Database, filters: InventoryFilters = {}): ItemListResult {
  const page = Math.max(1, Math.trunc(Number(filters.page) || 1))
  const pageSize = Math.min(
    100,
    Math.max(1, Math.trunc(Number(filters.pageSize) || DEFAULT_PAGE_SIZE)),
  )
  const { clause, params } = buildItemWhere(db, filters)

  const total = asNumber(
    queryOne(db, `SELECT COUNT(*) AS total FROM mini_inventory_item i ${clause}`, params)?.total,
  )
  const totalValueCents = asNumber(
    queryOne(
      db,
      `SELECT COALESCE(SUM(i.purchase_price_cents), 0) AS total
       FROM mini_inventory_item i ${clause}`,
      params,
    )?.total,
  )

  const rows = queryAll(
    db,
    `SELECT i.*,
       (SELECT p.thumb_url FROM mini_inventory_photo p
        WHERE p.item_id = i.id ORDER BY p.sort_order ASC, p.created_at ASC LIMIT 1) AS thumb_url
     FROM mini_inventory_item i
     ${clause}
     ORDER BY ${orderByClause(filters.sort)}
     LIMIT ? OFFSET ?`,
    [...params, pageSize, (page - 1) * pageSize],
  )

  const locations = listLocations(db)
  const locationMap = new Map(locations.map((location) => [location.id, location]))
  const items: InventoryItemSummary[] = rows.map((row) => {
    const item = mapItem(row)
    const path: string[] = []
    let current = item.locationId
    const visited = new Set<string>()
    while (current && !visited.has(current)) {
      visited.add(current)
      const location = locationMap.get(current)
      if (!location) break
      path.unshift(location.name)
      current = location.parentId
    }
    return {
      ...item,
      thumbUrl: asString(row.thumb_url),
      locationName: path.length > 0 ? path[path.length - 1] : "",
      locationPath: path.join(" / "),
      tags: [],
    }
  })

  if (items.length > 0) {
    const itemIds = items.map((item) => item.id)
    const placeholders = itemIds.map(() => "?").join(",")
    const tagRows = queryAll(
      db,
      `SELECT it.item_id, t.*
       FROM mini_inventory_item_tag it
       JOIN mini_inventory_tag t ON t.id = it.tag_id
       WHERE it.item_id IN (${placeholders})
       ORDER BY t.name COLLATE NOCASE ASC`,
      itemIds,
    )
    const tagMap = new Map<string, InventoryTag[]>()
    for (const row of tagRows) {
      const itemId = asString(row.item_id)
      const list = tagMap.get(itemId) || []
      list.push(mapTag(row))
      tagMap.set(itemId, list)
    }
    for (const item of items) item.tags = tagMap.get(item.id) || []
  }

  return { items, total, totalValueCents, page, pageSize }
}

export function countItems(db: Database, includeArchived = false): number {
  return asNumber(
    queryOne(
      db,
      `SELECT COUNT(*) AS total FROM mini_inventory_item ${includeArchived ? "" : "WHERE archived = 0"}`,
    )?.total,
  )
}

export function getInventorySummary(db: Database): InventorySummary {
  const itemCount = countItems(db, false)
  const locationCount = asNumber(
    queryOne(db, "SELECT COUNT(*) AS total FROM mini_inventory_location")?.total,
  )
  const totalValueCents = asNumber(
    queryOne(
      db,
      "SELECT COALESCE(SUM(purchase_price_cents), 0) AS total FROM mini_inventory_item WHERE archived = 0",
    )?.total,
  )
  const warrantyExpiringCount = asNumber(
    queryOne(
      db,
      `SELECT COUNT(*) AS total FROM mini_inventory_item
       WHERE archived = 0
         AND lifetime_warranty = 0
         AND warranty_expires_on <> ''
         AND warranty_expires_on >= ?
         AND warranty_expires_on <= ?`,
      [dateOffset(0), dateOffset(WARRANTY_SOON_DAYS)],
    )?.total,
  )
  const maintenanceDueCount = asNumber(
    queryOne(
      db,
      `SELECT COUNT(*) AS total
       FROM mini_inventory_maintenance m
       JOIN mini_inventory_item i ON i.id = m.item_id
       WHERE i.archived = 0
         AND m.scheduled_on <> ''
         AND m.scheduled_on <= ?`,
      [dateOffset(MAINTENANCE_SOON_DAYS)],
    )?.total,
  )

  return {
    itemCount,
    locationCount,
    totalValueCents,
    warrantyExpiringCount,
    maintenanceDueCount,
  }
}

// ---------------------------------------------------------------------------
// 维护记录
// ---------------------------------------------------------------------------

export function listMaintenance(db: Database, itemId: string): MaintenanceEntry[] {
  return queryAll(
    db,
    `SELECT * FROM mini_inventory_maintenance
     WHERE item_id = ?
     ORDER BY COALESCE(NULLIF(completed_on, ''), scheduled_on) DESC, created_at DESC`,
    [itemId],
  ).map(mapMaintenance)
}

function normalizeMaintenance(input: MaintenanceInput): {
  name: string
  completedOn: string
  scheduledOn: string
  costCents: number
  description: string
} {
  const name = normalizeText(input.name, MAX_ITEM_NAME, "维护名称")
  if (!name) throw new Error("请输入维护名称")
  const completedOn = normalizeDate(input.completedOn, "完成日期")
  const scheduledOn = normalizeDate(input.scheduledOn, "下次日期")
  if (!completedOn && !scheduledOn) throw new Error("完成日期和下次日期至少填一个")
  return {
    name,
    completedOn,
    scheduledOn,
    costCents: normalizeCents(input.costCents, "维护费用"),
    description: normalizeMultiline(input.description, MAX_NOTE, "维护说明"),
  }
}

export function createMaintenance(
  db: Database,
  itemId: string,
  input: MaintenanceInput,
): MaintenanceEntry {
  if (!getItem(db, itemId)) throw new Error("物品不存在")
  const data = normalizeMaintenance(input)
  const id = generateId()
  db.run(
    `INSERT INTO mini_inventory_maintenance
      (id, item_id, name, completed_on, scheduled_on, cost_cents, description, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      itemId,
      data.name,
      data.completedOn,
      data.scheduledOn,
      data.costCents,
      data.description,
      nowString(),
    ],
  )
  const created = queryOne(db, "SELECT * FROM mini_inventory_maintenance WHERE id = ?", [id])
  if (!created) throw new Error("维护记录创建失败")
  return mapMaintenance(created)
}

export function updateMaintenance(
  db: Database,
  id: string,
  input: MaintenanceInput,
): MaintenanceEntry {
  const row = queryOne(db, "SELECT * FROM mini_inventory_maintenance WHERE id = ?", [id])
  if (!row) throw new Error("维护记录不存在")
  const data = normalizeMaintenance(input)
  db.run(
    `UPDATE mini_inventory_maintenance
     SET name = ?, completed_on = ?, scheduled_on = ?, cost_cents = ?, description = ?
     WHERE id = ?`,
    [data.name, data.completedOn, data.scheduledOn, data.costCents, data.description, id],
  )
  const updated = queryOne(db, "SELECT * FROM mini_inventory_maintenance WHERE id = ?", [id])
  if (!updated) throw new Error("维护记录更新失败")
  return mapMaintenance(updated)
}

export function deleteMaintenance(db: Database, id: string): void {
  const row = queryOne(db, "SELECT id FROM mini_inventory_maintenance WHERE id = ?", [id])
  if (!row) throw new Error("维护记录不存在")
  db.run("DELETE FROM mini_inventory_maintenance WHERE id = ?", [id])
}

// ---------------------------------------------------------------------------
// 备份
// ---------------------------------------------------------------------------

export function exportInventoryJson(db: Database): InventoryBackup {
  const locations = listLocations(db)
  const tags = listTags(db).map((tag) => ({ ...tag, itemCount: undefined }))
  const itemRows = queryAll(db, "SELECT * FROM mini_inventory_item ORDER BY asset_no ASC")
  const photoRows = queryAll(
    db,
    "SELECT * FROM mini_inventory_photo ORDER BY item_id ASC, sort_order ASC",
  )
  const fieldRows = queryAll(
    db,
    "SELECT * FROM mini_inventory_field ORDER BY item_id ASC, sort_order ASC",
  )
  const tagRows = queryAll(db, "SELECT * FROM mini_inventory_item_tag")
  const maintenanceRows = queryAll(
    db,
    "SELECT * FROM mini_inventory_maintenance ORDER BY item_id ASC, created_at ASC",
  )

  const photos = new Map<string, Array<{ dataUrl: string; thumbUrl: string }>>()
  for (const row of photoRows) {
    const itemId = asString(row.item_id)
    const list = photos.get(itemId) || []
    list.push({ dataUrl: asString(row.data_url), thumbUrl: asString(row.thumb_url) })
    photos.set(itemId, list)
  }

  const fields = new Map<string, ItemFieldInput[]>()
  for (const row of fieldRows) {
    const itemId = asString(row.item_id)
    const list = fields.get(itemId) || []
    list.push({ name: asString(row.name), value: asString(row.value) })
    fields.set(itemId, list)
  }

  const itemTags = new Map<string, string[]>()
  for (const row of tagRows) {
    const itemId = asString(row.item_id)
    const list = itemTags.get(itemId) || []
    list.push(asString(row.tag_id))
    itemTags.set(itemId, list)
  }

  const maintenance = new Map<string, InventoryBackupItem["maintenance"]>()
  for (const row of maintenanceRows) {
    const itemId = asString(row.item_id)
    const list = maintenance.get(itemId) || []
    list.push({
      id: asString(row.id),
      name: asString(row.name),
      completedOn: asString(row.completed_on),
      scheduledOn: asString(row.scheduled_on),
      costCents: asNumber(row.cost_cents),
      description: asString(row.description),
      createdAt: asString(row.created_at),
    })
    maintenance.set(itemId, list)
  }

  return {
    locations,
    tags,
    items: itemRows.map((row) => {
      const item = mapItem(row)
      return {
        id: item.id,
        assetNo: item.assetNo,
        name: item.name,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        locationId: item.locationId,
        serialNumber: item.serialNumber,
        modelNumber: item.modelNumber,
        manufacturer: item.manufacturer,
        purchasePriceCents: item.purchasePriceCents,
        purchaseDate: item.purchaseDate,
        purchaseFrom: item.purchaseFrom,
        warrantyExpiresOn: item.warrantyExpiresOn,
        lifetimeWarranty: item.lifetimeWarranty,
        warrantyNote: item.warrantyNote,
        archived: item.archived,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        photos: photos.get(item.id) || [],
        tagIds: itemTags.get(item.id) || [],
        fields: fields.get(item.id) || [],
        maintenance: maintenance.get(item.id) || [],
      }
    }),
  }
}

export function validateInventoryBackup(input: unknown): InventoryBackup {
  if (!input || typeof input !== "object") throw new Error("收纳备份格式不正确")
  const data = input as Partial<InventoryBackup>
  if (!Array.isArray(data.locations) || !Array.isArray(data.tags) || !Array.isArray(data.items)) {
    throw new Error("收纳备份缺少 locations / tags / items")
  }

  const now = nowString()
  const locationIds = new Set<string>()
  const locations: InventoryLocation[] = data.locations.map((raw) => {
    if (!raw || typeof raw !== "object") throw new Error("位置数据格式不正确")
    const id = String(raw.id || "")
    if (!id) throw new Error("位置缺少 id")
    if (locationIds.has(id)) throw new Error("位置 id 重复")
    locationIds.add(id)
    const name = normalizeText(raw.name, MAX_LOCATION_NAME, "位置名称")
    if (!name) throw new Error("位置缺少名称")
    return {
      id,
      parentId: raw.parentId ? String(raw.parentId) : null,
      name,
      icon: String(raw.icon || "folder"),
      color: String(raw.color || "#2ba471"),
      sortOrder: Math.trunc(Number(raw.sortOrder) || 0),
      createdAt: String(raw.createdAt || now),
      updatedAt: String(raw.updatedAt || now),
    }
  })

  // 父子引用必须存在，且不能形成环
  const locationMap = new Map(locations.map((location) => [location.id, location]))
  for (const location of locations) {
    if (location.parentId && !locationMap.has(location.parentId)) {
      location.parentId = null
    }
    const visited = new Set<string>([location.id])
    let current = location.parentId
    let depth = 1
    while (current) {
      if (visited.has(current)) throw new Error("位置层级存在循环")
      visited.add(current)
      const parent = locationMap.get(current)
      if (!parent) break
      depth += 1
      if (depth > MAX_LOCATION_DEPTH) throw new Error(`位置最多 ${MAX_LOCATION_DEPTH} 层`)
      current = parent.parentId
    }
  }

  const tagIds = new Set<string>()
  const tagNames = new Set<string>()
  const tags: InventoryTag[] = data.tags.map((raw) => {
    if (!raw || typeof raw !== "object") throw new Error("标签数据格式不正确")
    const id = String(raw.id || "")
    if (!id) throw new Error("标签缺少 id")
    if (tagIds.has(id)) throw new Error("标签 id 重复")
    tagIds.add(id)
    const name = normalizeText(raw.name, MAX_TAG_NAME, "标签名称")
    if (!name) throw new Error("标签缺少名称")
    const key = name.toLowerCase()
    if (tagNames.has(key)) throw new Error("标签名称重复")
    tagNames.add(key)
    return {
      id,
      name,
      color: String(raw.color || "#2ba471"),
      createdAt: String(raw.createdAt || now),
    }
  })

  const itemIds = new Set<string>()
  const usedAssetNos = new Set<number>()
  const items: InventoryBackupItem[] = data.items.map((raw) => {
    if (!raw || typeof raw !== "object") throw new Error("物品数据格式不正确")
    const id = String(raw.id || "")
    if (!id) throw new Error("物品缺少 id")
    if (itemIds.has(id)) throw new Error("物品 id 重复")
    itemIds.add(id)
    const name = normalizeText(raw.name, MAX_ITEM_NAME, "物品名称")
    if (!name) throw new Error("物品缺少名称")

    let assetNo: number | undefined
    if (raw.assetNo !== undefined && raw.assetNo !== null) {
      const parsed = Number(raw.assetNo)
      if (!Number.isInteger(parsed) || parsed <= 0 || parsed > MAX_ASSET_NO) {
        throw new Error("物品编号不正确")
      }
      if (usedAssetNos.has(parsed)) throw new Error("物品编号重复")
      usedAssetNos.add(parsed)
      assetNo = parsed
    }

    const locationId = raw.locationId ? String(raw.locationId) : null
    if (locationId && !locationIds.has(locationId)) throw new Error("物品引用了不存在的位置")

    const references = Array.isArray(raw.tagIds) ? raw.tagIds.map(String) : []
    for (const tagId of references) {
      if (!tagIds.has(tagId)) throw new Error("物品引用了不存在的标签")
    }

    const photos = normalizePhotos(
      Array.isArray(raw.photos)
        ? raw.photos.map((photo) => ({
            dataUrl: String(photo?.dataUrl || ""),
            thumbUrl: String(photo?.thumbUrl || photo?.dataUrl || ""),
          }))
        : [],
    )
    const fields = normalizeFields(Array.isArray(raw.fields) ? raw.fields : [])
    const maintenance = Array.isArray(raw.maintenance)
      ? raw.maintenance.map((entry) => {
          const data = normalizeMaintenance(entry)
          return {
            id: String(entry.id || generateId()),
            name: data.name,
            completedOn: data.completedOn,
            scheduledOn: data.scheduledOn,
            costCents: data.costCents,
            description: data.description,
            createdAt: String(entry.createdAt || now),
          }
        })
      : []

    return {
      id,
      assetNo,
      name,
      description: normalizeMultiline(raw.description, MAX_DESCRIPTION, "描述"),
      quantity: normalizeQuantity(raw.quantity),
      unit: normalizeText(raw.unit, 10, "单位"),
      locationId,
      serialNumber: normalizeText(raw.serialNumber, MAX_IDENTIFIER, "序列号"),
      modelNumber: normalizeText(raw.modelNumber, MAX_IDENTIFIER, "型号"),
      manufacturer: normalizeText(raw.manufacturer, MAX_IDENTIFIER, "厂商"),
      purchasePriceCents: normalizeCents(raw.purchasePriceCents, "购买价格"),
      purchaseDate: normalizeDate(raw.purchaseDate, "购买日期"),
      purchaseFrom: normalizeText(raw.purchaseFrom, MAX_IDENTIFIER, "购买渠道"),
      warrantyExpiresOn: normalizeDate(raw.warrantyExpiresOn, "保修到期日"),
      lifetimeWarranty: Boolean(raw.lifetimeWarranty),
      warrantyNote: normalizeMultiline(raw.warrantyNote, MAX_NOTE, "保修说明"),
      archived: Boolean(raw.archived),
      createdAt: String(raw.createdAt || now),
      updatedAt: String(raw.updatedAt || now),
      photos,
      tagIds: references,
      fields,
      maintenance,
    }
  })

  return { locations, tags, items }
}

/** 删除全部收纳数据；不自带事务，供 importJson 复用 */
export function deleteInventoryRows(db: Database): void {
  db.run("DELETE FROM mini_inventory_maintenance")
  db.run("DELETE FROM mini_inventory_field")
  db.run("DELETE FROM mini_inventory_photo")
  db.run("DELETE FROM mini_inventory_item_tag")
  db.run("DELETE FROM mini_inventory_item")
  db.run("DELETE FROM mini_inventory_tag")
  db.run("DELETE FROM mini_inventory_location")
}

/** 独立清空收纳数据（保留记账/倒数日/日记） */
export function clearInventoryAll(db: Database): void {
  db.run("BEGIN TRANSACTION")
  try {
    deleteInventoryRows(db)
    db.run("COMMIT")
  } catch (error) {
    try {
      db.run("ROLLBACK")
    } catch {
      // 保留原始错误
    }
    throw error
  }
}

/** 导入收纳数据；调用方负责事务 */
export function insertImportedInventory(db: Database, backup: InventoryBackup): void {
  deleteInventoryRows(db)

  for (const location of backup.locations) {
    db.run(
      `INSERT INTO mini_inventory_location
        (id, parent_id, name, icon, color, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        location.id,
        location.parentId,
        location.name,
        location.icon,
        location.color,
        location.sortOrder,
        location.createdAt,
        location.updatedAt,
      ],
    )
  }

  for (const tag of backup.tags) {
    db.run("INSERT INTO mini_inventory_tag (id, name, color, created_at) VALUES (?, ?, ?, ?)", [
      tag.id,
      tag.name,
      tag.color,
      tag.createdAt,
    ])
  }

  const usedAssetNos = new Set<number>()
  for (const item of backup.items) {
    if (item.assetNo && item.assetNo > 0) usedAssetNos.add(item.assetNo)
  }
  let nextAvailableNo =
    usedAssetNos.size > 0 ? Math.max(...Array.from(usedAssetNos)) + 1 : nextAssetNoForEmpty(db)

  for (const item of backup.items) {
    let assetNo = item.assetNo && item.assetNo > 0 ? item.assetNo : 0
    if (!assetNo) {
      while (usedAssetNos.has(nextAvailableNo) && nextAvailableNo <= MAX_ASSET_NO) {
        nextAvailableNo += 1
      }
      if (nextAvailableNo > MAX_ASSET_NO) throw new Error("物品编号已用完")
      assetNo = nextAvailableNo
      usedAssetNos.add(assetNo)
      nextAvailableNo += 1
    }

    const now = item.createdAt || nowString()
    db.run(
      `INSERT INTO mini_inventory_item
        (id, asset_no, name, description, quantity, unit, location_id,
         serial_number, model_number, manufacturer,
         purchase_price_cents, purchase_date, purchase_from,
         warranty_expires_on, lifetime_warranty, warranty_note,
         archived, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item.id,
        assetNo,
        item.name || "",
        item.description || "",
        item.quantity === undefined ? 1 : item.quantity,
        item.unit || "",
        item.locationId || null,
        item.serialNumber || "",
        item.modelNumber || "",
        item.manufacturer || "",
        item.purchasePriceCents || 0,
        item.purchaseDate || "",
        item.purchaseFrom || "",
        item.warrantyExpiresOn || "",
        item.lifetimeWarranty ? 1 : 0,
        item.warrantyNote || "",
        item.archived ? 1 : 0,
        now,
        item.updatedAt || now,
      ],
    )

    insertBackupPhotos(db, item.id, item.photos || [], now)
    insertBackupFields(db, item.id, item.fields || [], now)
    for (const tagId of item.tagIds || []) {
      db.run("INSERT OR IGNORE INTO mini_inventory_item_tag (item_id, tag_id) VALUES (?, ?)", [
        item.id,
        tagId,
      ])
    }
    for (const entry of item.maintenance || []) {
      db.run(
        `INSERT INTO mini_inventory_maintenance
          (id, item_id, name, completed_on, scheduled_on, cost_cents, description, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          entry.id || generateId(),
          item.id,
          entry.name || "",
          entry.completedOn || "",
          entry.scheduledOn || "",
          entry.costCents || 0,
          entry.description || "",
          entry.createdAt || now,
        ],
      )
    }
  }
}

function nextAssetNoForEmpty(db: Database): number {
  return asNumber(
    queryOne(db, "SELECT COALESCE(MAX(asset_no), 0) + 1 AS next FROM mini_inventory_item")?.next,
    1,
  )
}

function insertBackupPhotos(
  db: Database,
  itemId: string,
  photos: Array<{ dataUrl: string; thumbUrl?: string }>,
  now: string,
): void {
  photos.forEach((photo, index) => {
    db.run(
      `INSERT INTO mini_inventory_photo
        (id, item_id, data_url, thumb_url, sort_order, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [generateId(), itemId, photo.dataUrl, photo.thumbUrl || photo.dataUrl, index, now],
    )
  })
}

function insertBackupFields(
  db: Database,
  itemId: string,
  fields: ItemFieldInput[],
  now: string,
): void {
  fields.forEach((field, index) => {
    db.run(
      `INSERT INTO mini_inventory_field (id, item_id, name, value, sort_order, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [generateId(), itemId, field.name, field.value, index, now],
    )
  })
}

/** 供测试与页面使用 */
export const __internal = {
  formatAssetNo,
  parseAssetNo,
  tokenize,
  locationDepth,
}
