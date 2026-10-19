/**
 * 倒数日异步门面：读走 getDb()，写走 runWrite()，
 * 和记账模块共用同一个 SQLite 数据库与持久化队列。
 */
import { getDb, runWrite } from "../bookkeeping/db"
import { getEventView, sortEventViews } from "./date"
import * as sql from "./sql"
import type {
  CountdownEvent,
  CountdownEventView,
  CountdownInput,
  CountdownSort,
  CountdownUpdateInput,
} from "./types"

export type {
  CountdownCategory,
  CountdownEvent,
  CountdownEventView,
  CountdownInput,
  CountdownMode,
  CountdownRepeat,
  CountdownSort,
  CountdownStatus,
  CountdownUpdateInput,
} from "./types"

export interface CountdownSummary {
  total: number
  todayCount: number
  /** 最近一个今天/未来事件 */
  next: CountdownEventView | null
  /** 命中的应用内提醒 */
  reminder: CountdownEventView | null
}

export async function listEvents(includeArchived = false): Promise<CountdownEvent[]> {
  return sql.listEvents(await getDb(), includeArchived)
}

export async function listEventViews(
  now: Date = new Date(),
  includeArchived = false,
): Promise<CountdownEventView[]> {
  const events = await listEvents(includeArchived)
  return sortEventViews(
    events.map((event) => getEventView(event, now)),
    "default",
  )
}

export async function getEventById(id: string): Promise<CountdownEvent | null> {
  return sql.getEvent(await getDb(), id)
}

export function createEvent(input: CountdownInput): Promise<CountdownEvent> {
  return runWrite((db) => sql.createEvent(db, input))
}

export function updateEvent(id: string, patch: CountdownUpdateInput): Promise<CountdownEvent> {
  return runWrite((db) => sql.updateEvent(db, id, patch))
}

export function deleteEvent(id: string): Promise<void> {
  return runWrite((db) => sql.deleteEvent(db, id))
}

export function togglePinned(id: string): Promise<CountdownEvent> {
  return runWrite((db) => sql.togglePinned(db, id))
}

export function setArchived(id: string, archived: boolean): Promise<CountdownEvent> {
  return runWrite((db) => sql.setArchived(db, id, archived))
}

function isReminderDue(view: CountdownEventView): boolean {
  const days = view.event.remindDaysBefore
  if (days < 0) return false
  if (view.status !== "future" && view.status !== "today") return false
  return view.daysUntil >= 0 && view.daysUntil <= days
}

function byNearest(a: CountdownEventView, b: CountdownEventView): number {
  if (a.daysUntil !== b.daysUntil) return a.daysUntil - b.daysUntil
  return a.event.title.localeCompare(b.event.title, "zh-Hans-CN")
}

/** 首页/主页面摘要；任何事件都没填日期时也不会抛错 */
export async function getCountdownSummary(now: Date = new Date()): Promise<CountdownSummary> {
  const events = await listEvents()
  const views = events.map((event) => getEventView(event, now))
  const upcoming = views
    .filter((view) => (view.status === "future" || view.status === "today") && view.daysUntil >= 0)
    .sort(byNearest)[0]
  // 没有更近的未开始事件时，用进行中的跨天事件兜底
  const activeRange = views
    .filter((view) => view.isRangeActive && view.daysUntilEnd !== null && view.daysUntilEnd >= 0)
    .sort((a, b) => (a.daysUntilEnd ?? 0) - (b.daysUntilEnd ?? 0))[0]
  const reminder = views.filter(isReminderDue).sort(byNearest)[0]
  return {
    total: views.length,
    todayCount: views.filter((view) => view.isToday || view.isEndingToday).length,
    next: upcoming || activeRange || null,
    reminder: reminder || null,
  }
}

/** 打开应用时的提醒候选，已按最近优先排序 */
export async function getReminderViews(now: Date = new Date()): Promise<CountdownEventView[]> {
  const events = await listEvents()
  return events
    .map((event) => getEventView(event, now))
    .filter(isReminderDue)
    .sort(byNearest)
}

/** 按分类/搜索/归档过滤；排序默认置顶优先 */
export async function queryEventViews(
  options: {
    now?: Date
    category?: string
    search?: string
    sort?: CountdownSort
    archived?: boolean
  } = {},
): Promise<CountdownEventView[]> {
  const now = options.now || new Date()
  const events = await listEvents(Boolean(options.archived))
  const keyword = (options.search || "").trim().toLowerCase()

  const views = events
    .filter((event) => Boolean(event.archived) === Boolean(options.archived))
    .filter((event) => !options.category || event.category === options.category)
    .filter((event) => {
      if (!keyword) return true
      return (
        event.title.toLowerCase().includes(keyword) || event.note.toLowerCase().includes(keyword)
      )
    })
    .map((event) => getEventView(event, now))

  return sortEventViews(views, options.sort || "default")
}
