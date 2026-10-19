/**
 * 收纳模块的公共类型。
 *
 * 物品与位置分表存储：位置是严格的树（房间 → 柜子 → 抽屉 → 箱子），
 * 物品只挂在某一个位置上，不做物品嵌套物品，移动端交互更直观。
 */

/** 单件物品最多照片数 */
export const MAX_ITEM_PHOTOS = 5
/** 单件物品最多自定义属性数 */
export const MAX_ITEM_FIELDS = 10
/** 位置层级上限（房间算第 1 层） */
export const MAX_LOCATION_DEPTH = 6
/** 资产编号上限，展示为 000-001 */
export const MAX_ASSET_NO = 999_999
/** 列表默认每页数量 */
export const DEFAULT_PAGE_SIZE = 30
/** 单张图片 data URL 长度上限，约 1.5 MB */
export const MAX_INVENTORY_IMAGE_LENGTH = 2_000_000

export interface InventoryLocation {
  id: string
  parentId: string | null
  name: string
  icon: string
  color: string
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface LocationPathItem {
  id: string
  name: string
}

export interface LocationNode extends InventoryLocation {
  /** 直接放在该位置的物品数（不含归档、不含子位置） */
  itemCount: number
  /** 该位置及所有子位置的物品数 */
  totalItemCount: number
  children: LocationNode[]
}

export interface InventoryTag {
  id: string
  name: string
  color: string
  createdAt: string
  /** 关联物品数，仅在标签列表中返回 */
  itemCount?: number
}

export interface InventoryPhoto {
  id: string
  itemId: string
  dataUrl: string
  thumbUrl: string
  sortOrder: number
}

export interface InventoryField {
  id: string
  itemId: string
  name: string
  value: string
  sortOrder: number
}

export interface MaintenanceEntry {
  id: string
  itemId: string
  name: string
  completedOn: string
  scheduledOn: string
  costCents: number
  description: string
  createdAt: string
}

export interface InventoryItem {
  id: string
  assetNo: number
  /** 展示用编号，例如 000-123 */
  assetCode: string
  name: string
  description: string
  quantity: number
  unit: string
  locationId: string | null
  serialNumber: string
  modelNumber: string
  manufacturer: string
  purchasePriceCents: number
  purchaseDate: string
  purchaseFrom: string
  warrantyExpiresOn: string
  lifetimeWarranty: boolean
  warrantyNote: string
  archived: boolean
  createdAt: string
  updatedAt: string
}

export interface InventoryItemSummary extends InventoryItem {
  /** 列表用缩略图；没有照片时为空字符串 */
  thumbUrl: string
  locationName: string
  /** 从顶层到直接位置的完整路径 */
  locationPath: string
  tags: InventoryTag[]
}

export interface InventoryItemDetail extends InventoryItem {
  photos: InventoryPhoto[]
  tags: InventoryTag[]
  fields: InventoryField[]
  maintenance: MaintenanceEntry[]
  locationPath: LocationPathItem[]
  /** 直接位置完整文本，例如 客厅 / 电视柜 / 抽屉 */
  locationText: string
}

export interface ItemPhotoInput {
  dataUrl: string
  thumbUrl: string
}

export interface ItemFieldInput {
  name: string
  value: string
}

export interface CreateLocationInput {
  name: string
  parentId?: string | null
  icon?: string
  color?: string
  sortOrder?: number
}

export interface UpdateLocationInput {
  name?: string
  icon?: string
  color?: string
  sortOrder?: number
}

export interface CreateItemInput {
  name: string
  description?: string
  quantity?: number
  unit?: string
  locationId?: string | null
  serialNumber?: string
  modelNumber?: string
  manufacturer?: string
  purchasePriceCents?: number
  purchaseDate?: string
  purchaseFrom?: string
  warrantyExpiresOn?: string
  lifetimeWarranty?: boolean
  warrantyNote?: string
  photos?: ItemPhotoInput[]
  tagIds?: string[]
  fields?: ItemFieldInput[]
}

/** 编辑时整表覆盖，与新增使用同一份输入 */
export type UpdateItemInput = CreateItemInput

export interface CreateTagInput {
  name: string
  color?: string
}

export interface UpdateTagInput {
  name?: string
  color?: string
}

export interface MaintenanceInput {
  name: string
  completedOn?: string
  scheduledOn?: string
  costCents?: number
  description?: string
}

export type InventorySort = "updated" | "name" | "assetNo" | "priceDesc"

export interface InventoryFilters {
  /** 关键词，多个空格分词后必须全部命中 */
  keyword?: string
  /** 位置筛选，包含所有后代位置 */
  locationId?: string
  /** 只看未指定位置的物品 */
  onlyUnassigned?: boolean
  /** 标签筛选，命中任意一个即可 */
  tagIds?: string[]
  includeArchived?: boolean
  /** 只看 30 天内保修到期 */
  warrantyExpiring?: boolean
  /** 只看有照片 */
  hasPhoto?: boolean
  sort?: InventorySort
  page?: number
  pageSize?: number
}

export interface ItemListResult {
  items: InventoryItemSummary[]
  total: number
  totalValueCents: number
  page: number
  pageSize: number
}

export interface InventorySummary {
  itemCount: number
  locationCount: number
  totalValueCents: number
  warrantyExpiringCount: number
  maintenanceDueCount: number
}

export interface InventoryBackupPhoto {
  dataUrl: string
  thumbUrl?: string
}

export interface InventoryBackupItem {
  id: string
  assetNo?: number
  name: string
  description?: string
  quantity?: number
  unit?: string
  locationId?: string | null
  serialNumber?: string
  modelNumber?: string
  manufacturer?: string
  purchasePriceCents?: number
  purchaseDate?: string
  purchaseFrom?: string
  warrantyExpiresOn?: string
  lifetimeWarranty?: boolean
  warrantyNote?: string
  archived?: boolean
  createdAt?: string
  updatedAt?: string
  photos?: InventoryBackupPhoto[]
  tagIds?: string[]
  fields?: ItemFieldInput[]
  maintenance?: Array<MaintenanceInput & { id?: string; createdAt?: string }>
}

export interface InventoryBackup {
  locations: InventoryLocation[]
  tags: InventoryTag[]
  items: InventoryBackupItem[]
}
