/**
 * 倒数日表结构。
 *
 * 这个文件刻意不 import 任何业务模块，避免和 bookkeeping/sql.ts 形成循环依赖。
 */
import type { Database } from "sql.js"

export const COUNTDOWN_TABLE = "mini_countdown_event"

export const COUNTDOWN_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS mini_countdown_event (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    anchor_date TEXT NOT NULL,
    anchor_time TEXT,
    anchor_end_date TEXT,
    anchor_end_time TEXT,
    countup_include_start INTEGER NOT NULL DEFAULT 0,
    mode TEXT NOT NULL DEFAULT 'countdown',
    category TEXT NOT NULL DEFAULT 'custom',
    repeat_rule TEXT NOT NULL DEFAULT 'none',
    emoji TEXT NOT NULL DEFAULT '⭐',
    color TEXT NOT NULL DEFAULT '#8f959e',
    note TEXT NOT NULL DEFAULT '',
    remind_days_before INTEGER NOT NULL DEFAULT -1,
    pinned INTEGER NOT NULL DEFAULT 0,
    archived INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_countdown_anchor ON mini_countdown_event(anchor_date);
  CREATE INDEX IF NOT EXISTS idx_countdown_pinned ON mini_countdown_event(pinned);
  CREATE INDEX IF NOT EXISTS idx_countdown_archived ON mini_countdown_event(archived);
`

/** 幂等建表；旧库打开、.sqlite 导入时都会执行 */
export function initCountdownSchema(db: Database): void {
  db.run(COUNTDOWN_TABLE_SQL)
  // 旧库缺少后加的列时按需补上（SQLite 不支持 ADD COLUMN IF NOT EXISTS）
  const columns = db.exec(`PRAGMA table_info(${COUNTDOWN_TABLE})`)
  const names = (columns[0]?.values || []).map((row) => String(row[1]))
  if (!names.includes("anchor_end_date")) {
    db.run(`ALTER TABLE ${COUNTDOWN_TABLE} ADD COLUMN anchor_end_date TEXT`)
  }
  if (!names.includes("anchor_end_time")) {
    db.run(`ALTER TABLE ${COUNTDOWN_TABLE} ADD COLUMN anchor_end_time TEXT`)
  }
  if (!names.includes("countup_include_start")) {
    db.run(
      `ALTER TABLE ${COUNTDOWN_TABLE} ADD COLUMN countup_include_start INTEGER NOT NULL DEFAULT 0`,
    )
  }
}
