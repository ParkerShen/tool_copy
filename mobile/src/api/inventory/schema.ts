/**
 * 收纳表结构。
 *
 * 与倒数日相同的做法：这个文件不 import 任何业务模块，
 * 由 bookkeeping/sql.ts::initSchema 调用，避免循环依赖。
 * 所有语句都是幂等的，旧库打开、.sqlite 导入时都会执行。
 */
import type { Database } from "sql.js"

export const INVENTORY_TABLES = [
  "mini_inventory_location",
  "mini_inventory_item",
  "mini_inventory_tag",
  "mini_inventory_item_tag",
  "mini_inventory_photo",
  "mini_inventory_field",
  "mini_inventory_maintenance",
] as const

const INVENTORY_SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS mini_inventory_location (
    id TEXT PRIMARY KEY,
    parent_id TEXT,
    name TEXT NOT NULL,
    icon TEXT DEFAULT 'folder',
    color TEXT DEFAULT '#2ba471',
    sort_order INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_inv_location_parent ON mini_inventory_location(parent_id);

  CREATE TABLE IF NOT EXISTS mini_inventory_item (
    id TEXT PRIMARY KEY,
    asset_no INTEGER NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    quantity REAL NOT NULL DEFAULT 1,
    unit TEXT DEFAULT '',
    location_id TEXT,
    serial_number TEXT DEFAULT '',
    model_number TEXT DEFAULT '',
    manufacturer TEXT DEFAULT '',
    purchase_price_cents INTEGER NOT NULL DEFAULT 0,
    purchase_date TEXT DEFAULT '',
    purchase_from TEXT DEFAULT '',
    warranty_expires_on TEXT DEFAULT '',
    lifetime_warranty INTEGER NOT NULL DEFAULT 0,
    warranty_note TEXT DEFAULT '',
    archived INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_inv_item_location ON mini_inventory_item(location_id);
  CREATE INDEX IF NOT EXISTS idx_inv_item_updated ON mini_inventory_item(updated_at);
  CREATE INDEX IF NOT EXISTS idx_inv_item_archived ON mini_inventory_item(archived);
  CREATE INDEX IF NOT EXISTS idx_inv_item_name ON mini_inventory_item(name);

  CREATE TABLE IF NOT EXISTS mini_inventory_tag (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE COLLATE NOCASE,
    color TEXT DEFAULT '#2ba471',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS mini_inventory_item_tag (
    item_id TEXT NOT NULL,
    tag_id TEXT NOT NULL,
    PRIMARY KEY (item_id, tag_id)
  );
  CREATE INDEX IF NOT EXISTS idx_inv_item_tag_tag ON mini_inventory_item_tag(tag_id);

  CREATE TABLE IF NOT EXISTS mini_inventory_photo (
    id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL,
    data_url TEXT NOT NULL,
    thumb_url TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_inv_photo_item ON mini_inventory_photo(item_id, sort_order);

  CREATE TABLE IF NOT EXISTS mini_inventory_field (
    id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL,
    name TEXT NOT NULL,
    value TEXT NOT NULL DEFAULT '',
    sort_order INTEGER DEFAULT 0,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_inv_field_item ON mini_inventory_field(item_id, sort_order);

  CREATE TABLE IF NOT EXISTS mini_inventory_maintenance (
    id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL,
    name TEXT NOT NULL,
    completed_on TEXT DEFAULT '',
    scheduled_on TEXT DEFAULT '',
    cost_cents INTEGER NOT NULL DEFAULT 0,
    description TEXT DEFAULT '',
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_inv_maintenance_item ON mini_inventory_maintenance(item_id);
  CREATE INDEX IF NOT EXISTS idx_inv_maintenance_due ON mini_inventory_maintenance(scheduled_on);
`

/** 幂等建表；旧库打开、.sqlite 导入时都会执行 */
export function initInventorySchema(db: Database): void {
  db.run(INVENTORY_SCHEMA_SQL)
}
