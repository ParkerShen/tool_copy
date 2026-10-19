/**
 * 倒数日 SQLite CRUD（纯 TS，便于 Node 测试）。
 *
 * 表在 bookkeeping/sql.ts 的 initSchema() 中创建；这里不 import 记账模块，
 * 避免循环依赖。
 */
import type { Database, SqlValue } from "sql.js"
import { generateId } from "../../utils/id"
import { daysBetweenKeys, isValidDateKey, isValidTimeKey } from "./date"
import {
  COUNTDOWN_CATEGORY_MAP,
  COUNTDOWN_REPEAT_MAP,
  getCategoryMeta,
  type CountdownCategory,
  type CountdownEvent,
  type CountdownInput,
  type CountdownMode,
  type CountdownRepeat,
  type CountdownUpdateInput,
} from "./types"

const MAX_TITLE_LENGTH = 60
const MAX_NOTE_LENGTH = 500

function queryAll(db: Database, sql: string, params: SqlValue[] = []): Record<string, SqlValue>[] {
  const stmt = db.prepare(sql)
  try {
    if (params.length > 0) stmt.bind(params)
    const rows: Record<string, SqlValue>[] = []
    while (stmt.step()) rows.push(stmt.getAsObject() as Record<string, SqlValue>)
    return rows
  } finally {
    stmt.free()
  }
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

function pad2(value: number): string {
  return String(value).padStart(2, "0")
}

function nowString(): string {
  const d = new Date()
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(
    d.getHours(),
  )}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
}

function isCategory(value: string): value is CountdownCategory {
  return Object.prototype.hasOwnProperty.call(COUNTDOWN_CATEGORY_MAP, value)
}

function isRepeat(value: string): value is CountdownRepeat {
  return Object.prototype.hasOwnProperty.call(COUNTDOWN_REPEAT_MAP, value)
}

function isMode(value: string): value is CountdownMode {
  return value === "countdown" || value === "countup"
}

function mapRow(row: Record<string, SqlValue>): CountdownEvent {
  const category = asString(row.category)
  return {
    id: asString(row.id),
    title: asString(row.title),
    anchorDate: asString(row.anchor_date),
    anchorTime: asString(row.anchor_time) || null,
    anchorEndDate: asString(row.anchor_end_date) || null,
    anchorEndTime: asString(row.anchor_end_time) || null,
    countupIncludeStart: asNumber(row.countup_include_start) === 1,
    mode: isMode(asString(row.mode)) ? (asString(row.mode) as CountdownMode) : "countdown",
    category: isCategory(category) ? category : "custom",
    repeatRule: isRepeat(asString(row.repeat_rule))
      ? (asString(row.repeat_rule) as CountdownRepeat)
      : "none",
    emoji: asString(row.emoji, "⭐"),
    color: asString(row.color, "#8f959e"),
    note: asString(row.note),
    remindDaysBefore: asNumber(row.remind_days_before, -1),
    pinned: asNumber(row.pinned) === 1,
    archived: asNumber(row.archived) === 1,
    createdAt: asString(row.created_at),
    updatedAt: asString(row.updated_at),
  }
}

interface EventFields {
  title: string
  anchorDate: string
  anchorTime: string | null
  anchorEndDate: string | null
  anchorEndTime: string | null
  countupIncludeStart: boolean
  mode: CountdownMode
  category: CountdownCategory
  repeatRule: CountdownRepeat
  emoji: string
  color: string
  note: string
  remindDaysBefore: number
  pinned: boolean
}

function sanitizeFields(input: CountdownInput): EventFields {
  const title = typeof input.title === "string" ? input.title.trim() : ""
  if (!title) throw new Error("请填写标题")
  if (title.length > MAX_TITLE_LENGTH) throw new Error(`标题不能超过 ${MAX_TITLE_LENGTH} 个字`)

  if (!isValidDateKey(input.anchorDate)) throw new Error("日期格式不正确")

  const anchorTime = input.anchorTime ? String(input.anchorTime).trim() : null
  if (anchorTime && !isValidTimeKey(anchorTime)) throw new Error("时间格式不正确")

  const anchorEndTime = input.anchorEndTime ? String(input.anchorEndTime).trim() : null
  if (anchorEndTime) {
    if (!isValidTimeKey(anchorEndTime)) throw new Error("结束时间格式不正确")
    if (!anchorTime) throw new Error("设置时间段需要先填写开始时间")
    if (anchorEndTime < anchorTime) throw new Error("结束时间不能早于开始时间")
  }

  const mode = input.mode || "countdown"
  if (!isMode(mode)) throw new Error("类型不正确")
  // 只有正数日才有「包含起始日」的概念
  const countupIncludeStart = mode === "countup" ? Boolean(input.countupIncludeStart) : false

  // 结束日期只用于倒计时；正数日即使旧备份带了也会被清空
  let anchorEndDate = input.anchorEndDate ? String(input.anchorEndDate).trim() : null
  if (mode === "countup") {
    anchorEndDate = null
  } else if (anchorEndDate) {
    if (!isValidDateKey(anchorEndDate)) throw new Error("结束日期格式不正确")
    if (anchorEndDate < input.anchorDate) throw new Error("结束日期不能早于目标日")
    if (anchorEndDate === input.anchorDate) {
      // 同一天不算跨天范围，保留开始时间即可
      anchorEndDate = null
    }
  }

  const category = input.category || "custom"
  if (!isCategory(category)) throw new Error("分类不正确")

  const repeatRule = input.repeatRule || "none"
  if (!isRepeat(repeatRule)) throw new Error("重复规则不正确")
  if (mode === "countup" && repeatRule !== "none") {
    throw new Error("正数日不能设置重复")
  }

  // 重复事件的范围不能超过一个重复周期，避免多次发生互相重叠
  if (anchorEndDate && repeatRule !== "none") {
    const duration = daysBetweenKeys(input.anchorDate, anchorEndDate)
    const maxDuration = repeatRule === "weekly" ? 6 : repeatRule === "monthly" ? 27 : 364
    if (duration > maxDuration) {
      throw new Error("重复事件的结束日期不能超过一个重复周期")
    }
  }

  const meta = getCategoryMeta(category)
  const emoji = input.emoji ? String(input.emoji).trim() : meta.emoji
  if (!emoji || Array.from(emoji).length > 4) throw new Error("图标不正确")

  const color = input.color ? String(input.color).trim() : meta.color
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) throw new Error("颜色格式不正确")

  const note = input.note ? String(input.note) : ""
  if (note.length > MAX_NOTE_LENGTH) throw new Error(`备注不能超过 ${MAX_NOTE_LENGTH} 个字`)

  const remindDaysBefore =
    input.remindDaysBefore === undefined ? -1 : Number(input.remindDaysBefore)
  if (!Number.isInteger(remindDaysBefore) || remindDaysBefore < -1 || remindDaysBefore > 365) {
    throw new Error("提醒设置不正确")
  }

  return {
    title,
    anchorDate: input.anchorDate,
    anchorTime,
    anchorEndDate,
    anchorEndTime,
    countupIncludeStart,
    mode,
    category,
    repeatRule,
    emoji,
    color,
    note,
    remindDaysBefore,
    pinned: Boolean(input.pinned),
  }
}

const SELECT_COLUMNS = `id, title, anchor_date, anchor_time, anchor_end_date,
  anchor_end_time, countup_include_start, mode, category, repeat_rule, emoji, color, note,
  remind_days_before, pinned, archived, created_at, updated_at`

/** 列出事件；默认不含归档 */
export function listEvents(db: Database, includeArchived = false): CountdownEvent[] {
  const rows = queryAll(
    db,
    `SELECT ${SELECT_COLUMNS} FROM mini_countdown_event
     ${includeArchived ? "" : "WHERE archived = 0"}
     ORDER BY pinned DESC, anchor_date ASC, created_at ASC`,
  )
  return rows.map(mapRow)
}

export function getEvent(db: Database, id: string): CountdownEvent | null {
  const rows = queryAll(db, `SELECT ${SELECT_COLUMNS} FROM mini_countdown_event WHERE id = ?`, [id])
  return rows.length > 0 ? mapRow(rows[0]) : null
}

export function countEvents(db: Database): number {
  const result = db.exec("SELECT COUNT(*) FROM mini_countdown_event")
  return Number(result[0]?.values?.[0]?.[0] || 0)
}

export function createEvent(db: Database, input: CountdownInput): CountdownEvent {
  const fields = sanitizeFields(input)
  const id = generateId()
  const now = nowString()

  db.run(
    `INSERT INTO mini_countdown_event
      (id, title, anchor_date, anchor_time, anchor_end_date, anchor_end_time,
       countup_include_start, mode, category, repeat_rule, emoji, color, note,
       remind_days_before, pinned, archived, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
    [
      id,
      fields.title,
      fields.anchorDate,
      fields.anchorTime,
      fields.anchorEndDate,
      fields.anchorEndTime,
      fields.countupIncludeStart ? 1 : 0,
      fields.mode,
      fields.category,
      fields.repeatRule,
      fields.emoji,
      fields.color,
      fields.note,
      fields.remindDaysBefore,
      fields.pinned ? 1 : 0,
      now,
      now,
    ],
  )

  const created = getEvent(db, id)
  if (!created) throw new Error("保存倒数日失败")
  return created
}

export function updateEvent(db: Database, id: string, patch: CountdownUpdateInput): CountdownEvent {
  const existing = getEvent(db, id)
  if (!existing) throw new Error("倒数日不存在")

  const merged: CountdownInput = {
    title: patch.title ?? existing.title,
    anchorDate: patch.anchorDate ?? existing.anchorDate,
    anchorTime: "anchorTime" in patch ? patch.anchorTime : existing.anchorTime,
    anchorEndDate: "anchorEndDate" in patch ? patch.anchorEndDate : existing.anchorEndDate,
    anchorEndTime: "anchorEndTime" in patch ? patch.anchorEndTime : existing.anchorEndTime,
    countupIncludeStart: patch.countupIncludeStart ?? existing.countupIncludeStart,
    mode: patch.mode ?? existing.mode,
    category: patch.category ?? existing.category,
    repeatRule: patch.repeatRule ?? existing.repeatRule,
    emoji: patch.emoji ?? existing.emoji,
    color: patch.color ?? existing.color,
    note: patch.note ?? existing.note,
    remindDaysBefore: patch.remindDaysBefore ?? existing.remindDaysBefore,
    pinned: patch.pinned ?? existing.pinned,
  }
  const fields = sanitizeFields(merged)
  const archived = patch.archived ?? existing.archived

  db.run(
    `UPDATE mini_countdown_event SET
       title = ?, anchor_date = ?, anchor_time = ?, anchor_end_date = ?, anchor_end_time = ?,
       countup_include_start = ?, mode = ?, category = ?, repeat_rule = ?, emoji = ?, color = ?,
       note = ?, remind_days_before = ?, pinned = ?, archived = ?, updated_at = ?
     WHERE id = ?`,
    [
      fields.title,
      fields.anchorDate,
      fields.anchorTime,
      fields.anchorEndDate,
      fields.anchorEndTime,
      fields.countupIncludeStart ? 1 : 0,
      fields.mode,
      fields.category,
      fields.repeatRule,
      fields.emoji,
      fields.color,
      fields.note,
      fields.remindDaysBefore,
      fields.pinned ? 1 : 0,
      archived ? 1 : 0,
      nowString(),
      id,
    ],
  )

  const updated = getEvent(db, id)
  if (!updated) throw new Error("更新倒数日失败")
  return updated
}

export function deleteEvent(db: Database, id: string): void {
  db.run("DELETE FROM mini_countdown_event WHERE id = ?", [id])
}

export function togglePinned(db: Database, id: string): CountdownEvent {
  const existing = getEvent(db, id)
  if (!existing) throw new Error("倒数日不存在")
  return updateEvent(db, id, { pinned: !existing.pinned })
}

export function setArchived(db: Database, id: string, archived: boolean): CountdownEvent {
  return updateEvent(db, id, { archived })
}

/** 校验 JSON 备份里的 countdownEvents，并补齐默认值 */
export function validateCountdownBackup(value: unknown): CountdownEvent[] {
  if (!Array.isArray(value)) throw new Error("备份文件中的 countdownEvents 格式不正确")

  const ids = new Set<string>()
  return value.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new Error(`第 ${index + 1} 个倒数日格式不正确`)
    }
    const raw = item as Partial<CountdownEvent>
    const id = String(raw.id || "")
    if (!id) throw new Error(`第 ${index + 1} 个倒数日缺少 id`)
    if (ids.has(id)) throw new Error("倒数日 id 重复")
    ids.add(id)

    const fields = sanitizeFields({
      title: String(raw.title || ""),
      anchorDate: String(raw.anchorDate || ""),
      anchorTime: raw.anchorTime ?? null,
      anchorEndDate: raw.anchorEndDate ?? null,
      anchorEndTime: raw.anchorEndTime ?? null,
      countupIncludeStart: raw.countupIncludeStart ?? false,
      mode: raw.mode,
      category: raw.category,
      repeatRule: raw.repeatRule,
      emoji: raw.emoji,
      color: raw.color,
      note: raw.note,
      remindDaysBefore: raw.remindDaysBefore,
      pinned: raw.pinned,
    })

    return {
      id,
      ...fields,
      archived: Boolean(raw.archived),
      createdAt: raw.createdAt || nowString(),
      updatedAt: raw.updatedAt || nowString(),
    }
  })
}

/** 导入 JSON 备份时批量写入（调用方负责事务） */
export function insertImportedEvents(db: Database, events: CountdownEvent[]): void {
  if (events.length === 0) return
  const stmt = db.prepare(`
    INSERT INTO mini_countdown_event
      (id, title, anchor_date, anchor_time, anchor_end_date, anchor_end_time,
       countup_include_start, mode, category, repeat_rule, emoji, color, note,
       remind_days_before, pinned, archived, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  try {
    for (const event of events) {
      stmt.run([
        event.id,
        event.title,
        event.anchorDate,
        event.anchorTime,
        event.anchorEndDate,
        event.anchorEndTime,
        event.countupIncludeStart ? 1 : 0,
        event.mode,
        event.category,
        event.repeatRule,
        event.emoji,
        event.color,
        event.note,
        event.remindDaysBefore,
        event.pinned ? 1 : 0,
        event.archived ? 1 : 0,
        event.createdAt,
        event.updatedAt,
      ])
    }
  } finally {
    stmt.free()
  }
}
