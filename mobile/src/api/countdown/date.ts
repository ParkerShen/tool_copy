/**
 * 倒数日的纯日期/重复规则。
 *
 * 所有「天数」按 UTC 日历日计算（Date.UTC 只用来数天数，不参与展示），
 * 避免本地时区/DST 导致 ceil/diff 少一天。展示日期仍按本地今天判断。
 */
import type { CountdownEvent, CountdownEventView, CountdownSort, CountdownStatus } from "./types"
import { COUNTDOWN_REPEAT_MAP } from "./types"

const DAY_MS = 24 * 60 * 60 * 1000
const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"]

function pad2(value: number): string {
  return String(value).padStart(2, "0")
}

/** 本地日期 key（YYYY-MM-DD） */
export function formatDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

/** 本地时间 key（HH:mm） */
export function formatTimeKey(date: Date): string {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`
}

export function todayKey(now: Date = new Date()): string {
  return formatDateKey(now)
}

export function currentTimeKey(now: Date = new Date()): string {
  return formatTimeKey(now)
}

export function isValidDateKey(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split("-").map(Number)
  // uni-h5 日期选择器固定从「当前年份 - 150」开始（2026 年即 1876），
  // 且 start 只能往外扩、不能收窄；这里放宽到 1800 以免用户选到却被校验拒绝。
  if (year < 1800 || year > 2200 || month < 1 || month > 12) return false
  return day >= 1 && day <= daysInMonth(year, month)
}

export function isValidTimeKey(value: unknown): value is string {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
}

/** month 为 1-12 */
export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

export function clampDay(year: number, month: number, day: number): number {
  return Math.min(Math.max(1, day), daysInMonth(year, month))
}

export function makeDateKey(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`
}

export function parseDateKey(key: string): { year: number; month: number; day: number } {
  if (!isValidDateKey(key)) throw new Error("日期格式应为 YYYY-MM-DD")
  const [year, month, day] = key.split("-").map(Number)
  return { year, month, day }
}

/** 把日历日转成 UTC 毫秒，仅用于做差 */
export function dateKeyToUtcMs(key: string): number {
  const { year, month, day } = parseDateKey(key)
  return Date.UTC(year, month - 1, day)
}

/** 从 from 到 to 的日历天数，未来为正 */
export function daysBetweenKeys(from: string, to: string): number {
  return Math.round((dateKeyToUtcMs(to) - dateKeyToUtcMs(from)) / DAY_MS)
}

export function addDaysToKey(key: string, days: number): string {
  const { year, month, day } = parseDateKey(key)
  const date = new Date(Date.UTC(year, month - 1, day + days))
  return makeDateKey(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate())
}

function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const index = year * 12 + (month - 1) + delta
  return { year: Math.floor(index / 12), month: (index % 12) + 1 }
}

export function weekdayLabel(key: string): string {
  const { year, month, day } = parseDateKey(key)
  return `周${WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()]}`
}

export function formatDateLabel(key: string): string {
  const { year, month, day } = parseDateKey(key)
  return `${year}年${month}月${day}日 ${weekdayLabel(key)}`
}

/** 卡片短日期：今年不显示年份 */
export function formatShortDateLabel(key: string, now: Date = new Date()): string {
  const { year, month, day } = parseDateKey(key)
  return year === now.getFullYear() ? `${month}月${day}日` : `${year}年${month}月${day}日`
}

interface Occurrence {
  dateKey: string
  time: string | null
  endDate: string | null
  endTime: string | null
}

/**
 * 某次发生的结束日期。
 * 一次性事件直接用 anchorEndDate；重复事件按锚点跨度顺延，保证每次持续同样天数。
 */
function occurrenceEndDate(event: CountdownEvent, startDate: string): string | null {
  if (!event.anchorEndDate) return null
  if (event.anchorEndDate === event.anchorDate) return startDate
  const duration = daysBetweenKeys(event.anchorDate, event.anchorEndDate)
  return addDaysToKey(startDate, duration)
}

/** 这次发生是否已经完全结束（跨天事件要等结束日过完） */
function occurrenceAlreadyPassed(
  dateKey: string,
  time: string | null,
  endDate: string | null,
  endTime: string | null,
  today: string,
  nowTime: string,
): boolean {
  const spansDays = !!endDate && endDate > dateKey
  if (spansDays) return endDate < today
  if (dateKey !== today) return dateKey < today
  if (endTime) return nowTime >= endTime
  return !!time && time < nowTime
}

/** 时间展示：单个时间「09:00」或时间段「09:00–11:00」 */
export function formatOccurrenceTime(time: string | null, endTime: string | null): string | null {
  if (!time) return null
  return endTime ? `${time}–${endTime}` : time
}

/** 解析一次性事件的本次发生日期 */
function resolveOnce(event: CountdownEvent): Occurrence {
  return {
    dateKey: event.anchorDate,
    time: event.anchorTime,
    endDate: event.anchorEndDate,
    endTime: event.anchorEndTime,
  }
}

/** 解析重复事件的本次发生日期（永远不早于今天） */
function resolveRepeating(event: CountdownEvent, today: string, nowTime: string): Occurrence {
  const anchor = parseDateKey(event.anchorDate)
  const now = parseDateKey(today)
  const time = event.anchorTime
  const endTime = event.anchorEndTime

  if (event.repeatRule === "weekly") {
    const diff = daysBetweenKeys(event.anchorDate, today)
    let dateKey = event.anchorDate
    if (diff > 0) {
      // 从锚点开始每 7 天一次；取不晚于今天的最近一次，再判断是否已结束
      dateKey = addDaysToKey(event.anchorDate, Math.floor(diff / 7) * 7)
    }
    for (let i = 0; i < 4; i += 1) {
      const endDate = occurrenceEndDate(event, dateKey)
      if (!occurrenceAlreadyPassed(dateKey, time, endDate, endTime, today, nowTime)) break
      dateKey = addDaysToKey(dateKey, 7)
    }
    return { dateKey, time, endDate: occurrenceEndDate(event, dateKey), endTime }
  }

  if (event.repeatRule === "yearly") {
    // 从上一年开始找，兼容「去年开始、今年结束」的跨年范围
    let year = Math.max(anchor.year, now.year - 1)
    let dateKey = makeDateKey(year, anchor.month, clampDay(year, anchor.month, anchor.day))
    // 锚点当年但候选日早于锚点：说明今年还没到第一次发生
    if (dateKey < event.anchorDate) {
      year += 1
      dateKey = makeDateKey(year, anchor.month, clampDay(year, anchor.month, anchor.day))
    }
    for (let i = 0; i < 4; i += 1) {
      const endDate = occurrenceEndDate(event, dateKey)
      if (!occurrenceAlreadyPassed(dateKey, time, endDate, endTime, today, nowTime)) break
      year += 1
      dateKey = makeDateKey(year, anchor.month, clampDay(year, anchor.month, anchor.day))
    }
    return { dateKey, time, endDate: occurrenceEndDate(event, dateKey), endTime }
  }

  // monthly：从上个月开始找，兼容跨月的范围
  let cursor = addMonths(now.year, now.month, -1)
  if (cursor.year < anchor.year || (cursor.year === anchor.year && cursor.month < anchor.month)) {
    cursor = { year: anchor.year, month: anchor.month }
  }
  let dateKey = makeDateKey(
    cursor.year,
    cursor.month,
    clampDay(cursor.year, cursor.month, anchor.day),
  )
  if (dateKey < event.anchorDate) {
    cursor = addMonths(cursor.year, cursor.month, 1)
    dateKey = makeDateKey(
      cursor.year,
      cursor.month,
      clampDay(cursor.year, cursor.month, anchor.day),
    )
  }
  for (let i = 0; i < 24; i += 1) {
    const endDate = occurrenceEndDate(event, dateKey)
    if (!occurrenceAlreadyPassed(dateKey, time, endDate, endTime, today, nowTime)) break
    cursor = addMonths(cursor.year, cursor.month, 1)
    dateKey = makeDateKey(
      cursor.year,
      cursor.month,
      clampDay(cursor.year, cursor.month, anchor.day),
    )
  }
  return { dateKey, time, endDate: occurrenceEndDate(event, dateKey), endTime }
}

function resolveOccurrence(event: CountdownEvent, now: Date): Occurrence {
  if (event.repeatRule === "none" || event.mode === "countup") {
    return resolveOnce(event)
  }
  return resolveRepeating(event, todayKey(now), currentTimeKey(now))
}

function buildStatus(
  event: CountdownEvent,
  occurrence: Occurrence,
  now: Date,
): {
  daysUntil: number
  status: CountdownStatus
  statusLabel: string
  numberLabel: string
  daysSinceAnchor: number | null
  daysUntilEnd: number | null
  isRange: boolean
  isRangeActive: boolean
  isEndingToday: boolean
} {
  const today = todayKey(now)
  const nowTime = currentTimeKey(now)
  const daysUntil = daysBetweenKeys(today, occurrence.dateKey)
  const isRange = !!occurrence.endDate && occurrence.endDate > occurrence.dateKey
  const daysUntilEnd = occurrence.endDate ? daysBetweenKeys(today, occurrence.endDate) : null
  const isEndingToday = isRange && occurrence.endDate === today
  const isRangeActive = isRange && daysUntil <= 0 && (daysUntilEnd ?? 0) >= 0
  const sinceAnchor = daysBetweenKeys(event.anchorDate, today)
  const yearlyExtra = event.repeatRule === "yearly" && sinceAnchor > 0 ? sinceAnchor : null

  if (event.mode === "countup") {
    const includeStart = event.countupIncludeStart ? 1 : 0
    if (daysUntil > 0) {
      return {
        daysUntil,
        status: "future",
        statusLabel: `还有 ${daysUntil} 天`,
        numberLabel: String(daysUntil),
        daysSinceAnchor: null,
        daysUntilEnd: null,
        isRange: false,
        isRangeActive: false,
        isEndingToday: false,
      }
    }
    if (daysUntil === 0) {
      if (includeStart) {
        return {
          daysUntil,
          status: "today",
          statusLabel: "已经 1 天",
          numberLabel: "1",
          daysSinceAnchor: null,
          daysUntilEnd: null,
          isRange: false,
          isRangeActive: false,
          isEndingToday: false,
        }
      }
      return {
        daysUntil,
        status: "today",
        statusLabel: "就是今天",
        numberLabel: "0",
        daysSinceAnchor: null,
        daysUntilEnd: null,
        isRange: false,
        isRangeActive: false,
        isEndingToday: false,
      }
    }
    const total = Math.abs(daysUntil) + includeStart
    return {
      daysUntil,
      status: "ongoing",
      statusLabel: `已经 ${total} 天`,
      numberLabel: String(total),
      daysSinceAnchor: null,
      daysUntilEnd: null,
      isRange: false,
      isRangeActive: false,
      isEndingToday: false,
    }
  }

  // 跨天事件：开始日之前看「还有」；进行中看「还剩」；结束后看「已结束」
  if (isRange && daysUntilEnd !== null) {
    if (daysUntil > 0) {
      return {
        daysUntil,
        status: "future",
        statusLabel: `还有 ${daysUntil} 天`,
        numberLabel: String(daysUntil),
        daysSinceAnchor: yearlyExtra,
        daysUntilEnd,
        isRange: true,
        isRangeActive: false,
        isEndingToday: false,
      }
    }
    if (daysUntilEnd < 0) {
      const passed = Math.abs(daysUntilEnd)
      return {
        daysUntil,
        status: "past",
        statusLabel: `已结束 ${passed} 天`,
        numberLabel: String(passed),
        daysSinceAnchor: yearlyExtra,
        daysUntilEnd,
        isRange: true,
        isRangeActive: false,
        isEndingToday: false,
      }
    }
    if (daysUntilEnd === 0) {
      return {
        daysUntil,
        status: "ongoing",
        statusLabel: "今天结束",
        numberLabel: "0",
        daysSinceAnchor: yearlyExtra,
        daysUntilEnd,
        isRange: true,
        isRangeActive: true,
        isEndingToday: true,
      }
    }
    if (daysUntil === 0 && occurrence.time && nowTime < occurrence.time) {
      return {
        daysUntil,
        status: "today",
        statusLabel: `今天 ${occurrence.time} 开始`,
        numberLabel: "0",
        daysSinceAnchor: yearlyExtra,
        daysUntilEnd,
        isRange: true,
        isRangeActive: true,
        isEndingToday: false,
      }
    }
    return {
      daysUntil,
      status: "ongoing",
      statusLabel: `进行中 · 还有 ${daysUntilEnd} 天结束`,
      numberLabel: String(daysUntilEnd),
      daysSinceAnchor: yearlyExtra,
      daysUntilEnd,
      isRange: true,
      isRangeActive: true,
      isEndingToday: false,
    }
  }

  if (daysUntil > 0) {
    return {
      daysUntil,
      status: "future",
      statusLabel: `还有 ${daysUntil} 天`,
      numberLabel: String(daysUntil),
      daysSinceAnchor: yearlyExtra,
      daysUntilEnd: null,
      isRange: false,
      isRangeActive: false,
      isEndingToday: false,
    }
  }

  if (daysUntil === 0) {
    if (occurrence.time) {
      const start = occurrence.time
      const end = occurrence.endTime
      if (end) {
        // 旧版时间段：未开始 / 进行中 / 已结束
        if (nowTime < start) {
          return {
            daysUntil,
            status: "today",
            statusLabel: `今天 ${start}–${end}`,
            numberLabel: "0",
            daysSinceAnchor: yearlyExtra,
            daysUntilEnd: null,
            isRange: false,
            isRangeActive: false,
            isEndingToday: false,
          }
        }
        if (nowTime < end) {
          return {
            daysUntil,
            status: "today",
            statusLabel: `进行中 · ${end} 结束`,
            numberLabel: "0",
            daysSinceAnchor: yearlyExtra,
            daysUntilEnd: null,
            isRange: false,
            isRangeActive: false,
            isEndingToday: false,
          }
        }
        return {
          daysUntil,
          status: "past",
          statusLabel: `今天 · 已结束 ${end}`,
          numberLabel: "0",
          daysSinceAnchor: yearlyExtra,
          daysUntilEnd: null,
          isRange: false,
          isRangeActive: false,
          isEndingToday: false,
        }
      }

      const passed = start < nowTime
      return {
        daysUntil,
        status: passed ? "past" : "today",
        statusLabel: passed ? `今天 · 已过 ${start}` : `今天 ${start}`,
        numberLabel: "0",
        daysSinceAnchor: yearlyExtra,
        daysUntilEnd: null,
        isRange: false,
        isRangeActive: false,
        isEndingToday: false,
      }
    }
    return {
      daysUntil,
      status: "today",
      statusLabel: "就是今天",
      numberLabel: "0",
      daysSinceAnchor: yearlyExtra,
      daysUntilEnd: null,
      isRange: false,
      isRangeActive: false,
      isEndingToday: false,
    }
  }

  return {
    daysUntil,
    status: "past",
    statusLabel: `已过 ${Math.abs(daysUntil)} 天`,
    numberLabel: String(Math.abs(daysUntil)),
    daysSinceAnchor: yearlyExtra,
    daysUntilEnd: null,
    isRange: false,
    isRangeActive: false,
    isEndingToday: false,
  }
}

/** 生成列表/卡片所需的完整视图 */
export function getEventView(event: CountdownEvent, now: Date = new Date()): CountdownEventView {
  const occurrence = resolveOccurrence(event, now)
  const status = buildStatus(event, occurrence, now)
  const today = todayKey(now)
  const shortDateLabel = formatShortDateLabel(occurrence.dateKey, now)
  const endShortDateLabel = occurrence.endDate
    ? formatShortDateLabel(occurrence.endDate, now)
    : null

  return {
    event,
    occurrenceDate: occurrence.dateKey,
    occurrenceTime: occurrence.time,
    occurrenceEndDate: occurrence.endDate,
    occurrenceEndTime: occurrence.endTime,
    timeLabel: formatOccurrenceTime(occurrence.time, occurrence.endTime),
    daysUntil: status.daysUntil,
    daysUntilEnd: status.daysUntilEnd,
    isRange: status.isRange,
    isRangeActive: status.isRangeActive,
    isEndingToday: status.isEndingToday,
    status: status.status,
    statusLabel: status.statusLabel,
    numberLabel: status.numberLabel,
    unitLabel: "天",
    dateLabel: formatDateLabel(occurrence.dateKey),
    shortDateLabel,
    shortDateRangeLabel:
      status.isRange && endShortDateLabel
        ? `${shortDateLabel}–${endShortDateLabel}`
        : shortDateLabel,
    endDateLabel: occurrence.endDate ? formatDateLabel(occurrence.endDate) : null,
    endShortDateLabel,
    repeatLabel: COUNTDOWN_REPEAT_MAP[event.repeatRule],
    daysSinceAnchor: status.daysSinceAnchor,
    isToday: occurrence.dateKey === today,
    isPast: status.status === "past",
    isRecurring: event.repeatRule !== "none",
  }
}

/** 排序：置顶优先 → 今天/未来升序 → 进行中/过去降序 → 标题 */
export function sortEventViews(
  views: CountdownEventView[],
  sort: CountdownSort = "default",
): CountdownEventView[] {
  const list = [...views]
  if (sort === "name") {
    return list.sort((a, b) => a.event.title.localeCompare(b.event.title, "zh-Hans-CN"))
  }
  if (sort === "date") {
    return list.sort((a, b) => a.occurrenceDate.localeCompare(b.occurrenceDate))
  }
  return list.sort((a, b) => {
    if (a.event.pinned !== b.event.pinned) return a.event.pinned ? -1 : 1
    const group = (view: CountdownEventView): number => {
      if (view.status === "ongoing" || view.status === "past") return 1
      return 0
    }
    const groupDiff = group(a) - group(b)
    if (groupDiff !== 0) return groupDiff
    if (group(a) === 0) {
      if (a.daysUntil !== b.daysUntil) return a.daysUntil - b.daysUntil
    } else if (a.daysUntil !== b.daysUntil) {
      return b.daysUntil - a.daysUntil
    }
    return a.event.title.localeCompare(b.event.title, "zh-Hans-CN")
  })
}

export interface OccurrenceItem {
  event: CountdownEvent
  dateKey: string
  time: string | null
  endDate: string | null
  endTime: string | null
  daysUntil: number
  daysUntilEnd: number | null
  isToday: boolean
}

/**
 * 展开某个事件在指定年月的所有发生日。
 * 用于月历打点和「选中日期」面板。
 */
export function occurrencesInMonth(
  event: CountdownEvent,
  year: number,
  month: number,
  now: Date = new Date(),
): OccurrenceItem[] {
  const today = todayKey(now)
  const anchor = parseDateKey(event.anchorDate)
  const result: OccurrenceItem[] = []
  const push = (dateKey: string): void => {
    const endDate =
      event.repeatRule === "none" ? event.anchorEndDate : occurrenceEndDate(event, dateKey)
    result.push({
      event,
      dateKey,
      time: event.anchorTime,
      endDate,
      endTime: event.anchorEndTime,
      daysUntil: daysBetweenKeys(today, dateKey),
      daysUntilEnd: endDate ? daysBetweenKeys(today, endDate) : null,
      isToday: dateKey === today,
    })
  }

  if (event.repeatRule === "none") {
    if (anchor.year === year && anchor.month === month) push(event.anchorDate)
    return result
  }

  if (event.repeatRule === "yearly") {
    if (anchor.month !== month) return result
    const dateKey = makeDateKey(year, month, clampDay(year, month, anchor.day))
    if (dateKey >= event.anchorDate) push(dateKey)
    return result
  }

  if (event.repeatRule === "monthly") {
    const anchorIndex = anchor.year * 12 + (anchor.month - 1)
    const targetIndex = year * 12 + (month - 1)
    if (targetIndex < anchorIndex) return result
    push(makeDateKey(year, month, clampDay(year, month, anchor.day)))
    return result
  }

  // weekly：从锚点开始按 7 天步进，只收集本月且不早于锚点的日期
  const monthStart = makeDateKey(year, month, 1)
  const monthEnd = makeDateKey(year, month, daysInMonth(year, month))
  let cursor = event.anchorDate
  if (cursor < monthStart) {
    const diff = daysBetweenKeys(event.anchorDate, monthStart)
    cursor = addDaysToKey(event.anchorDate, Math.ceil(diff / 7) * 7)
  }
  for (let i = 0; i < 6 && cursor <= monthEnd; i += 1) {
    push(cursor)
    cursor = addDaysToKey(cursor, 7)
  }
  return result
}

export interface MonthCell {
  dateKey: string | null
  day: number | null
  isToday: boolean
  occurrences: OccurrenceItem[]
}

/** 周一起始的月历网格，前面补空格 */
export function buildMonthCells(
  year: number,
  month: number,
  events: CountdownEvent[],
  now: Date = new Date(),
): MonthCell[] {
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay()
  const offset = (firstWeekday + 6) % 7
  const total = daysInMonth(year, month)
  const today = todayKey(now)
  const byDate = new Map<string, OccurrenceItem[]>()

  for (const event of events) {
    for (const item of occurrencesInMonth(event, year, month, now)) {
      const list = byDate.get(item.dateKey) || []
      list.push(item)
      byDate.set(item.dateKey, list)
    }
  }

  const cells: MonthCell[] = []
  for (let i = 0; i < offset; i += 1) {
    cells.push({ dateKey: null, day: null, isToday: false, occurrences: [] })
  }
  for (let day = 1; day <= total; day += 1) {
    const dateKey = makeDateKey(year, month, day)
    cells.push({
      dateKey,
      day,
      isToday: dateKey === today,
      occurrences: byDate.get(dateKey) || [],
    })
  }
  while (cells.length % 7 !== 0) {
    cells.push({ dateKey: null, day: null, isToday: false, occurrences: [] })
  }
  return cells
}
