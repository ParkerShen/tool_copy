/**
 * 倒数日数据模型与固定枚举。
 *
 * 数据保存在记账同一个 SQLite 数据库里（mini_countdown_event），
 * 这样「我的」导出的 .sqlite 会天然包含倒数日。
 */

export type CountdownMode = "countdown" | "countup"

export type CountdownCategory =
  | "anniversary"
  | "birthday"
  | "festival"
  | "exam"
  | "travel"
  | "custom"

export type CountdownRepeat = "none" | "yearly" | "monthly" | "weekly"

export type CountdownStatus = "future" | "today" | "past" | "ongoing"

export type CountdownSort = "default" | "date" | "name"

export interface CountdownEvent {
  id: string
  title: string
  /** 原始锚点日期 YYYY-MM-DD；重复事件不会改写它 */
  anchorDate: string
  /** HH:mm；null 表示全天 */
  anchorTime: string | null
  /** YYYY-MM-DD；可跨天的结束日期，null 表示只有开始日 */
  anchorEndDate: string | null
  /** HH:mm；旧版时间段的结束时间，仅用于兼容已有数据 */
  anchorEndTime: string | null
  /** 正数日是否把起始日算作第 1 天 */
  countupIncludeStart: boolean
  mode: CountdownMode
  category: CountdownCategory
  repeatRule: CountdownRepeat
  emoji: string
  color: string
  note: string
  /** -1 不提醒；0 当天；N 提前 N 天 */
  remindDaysBefore: number
  pinned: boolean
  archived: boolean
  createdAt: string
  updatedAt: string
}

export interface CountdownInput {
  title: string
  anchorDate: string
  anchorTime?: string | null
  anchorEndDate?: string | null
  anchorEndTime?: string | null
  countupIncludeStart?: boolean
  mode?: CountdownMode
  category?: CountdownCategory
  repeatRule?: CountdownRepeat
  emoji?: string
  color?: string
  note?: string
  remindDaysBefore?: number
  pinned?: boolean
}

export interface CountdownUpdateInput extends Partial<CountdownInput> {
  archived?: boolean
}

export interface CountdownEventView {
  event: CountdownEvent
  /** 解析后的本次发生日期（重复事件是下一次） */
  occurrenceDate: string
  occurrenceTime: string | null
  occurrenceEndDate: string | null
  occurrenceEndTime: string | null
  /** 时间展示：单个时间「09:00」或旧版时间段「09:00–11:00」；全天为 null */
  timeLabel: string | null
  /** 距离今天的天数：未来为正、今天为 0、过去为负 */
  daysUntil: number
  /** 距离结束日期的天数；没有结束日期时为 null */
  daysUntilEnd: number | null
  /** 是否跨天（结束日期晚于开始日期） */
  isRange: boolean
  /** 跨天事件是否覆盖今天 */
  isRangeActive: boolean
  /** 跨天事件是否在今天结束 */
  isEndingToday: boolean
  status: CountdownStatus
  /** 卡片主文案，如「还有 128 天」「就是今天」「已经 30 天」 */
  statusLabel: string
  /** 主数字；今天为 0，正数日为已经过的天数 */
  numberLabel: string
  unitLabel: string
  /** 发生日期，如「2027年2月14日 周日」 */
  dateLabel: string
  /** 卡片上的短日期，如「2月14日」；跨年时带年份 */
  shortDateLabel: string
  /** 跨天时展示「10月1日–10月7日」，否则与 shortDateLabel 相同 */
  shortDateRangeLabel: string
  /** 结束日期的完整/短展示；没有结束日期时为 null */
  endDateLabel: string | null
  endShortDateLabel: string | null
  repeatLabel: string
  /** 周年纪念日的「已过 N 天」；不适用时为 null */
  daysSinceAnchor: number | null
  /** 是否今天发生 */
  isToday: boolean
  /** 是否过去（一次性倒计时已过） */
  isPast: boolean
  isRecurring: boolean
}

export interface CountdownCategoryMeta {
  value: CountdownCategory
  label: string
  emoji: string
  color: string
}

export const COUNTDOWN_CATEGORIES: CountdownCategoryMeta[] = [
  { value: "anniversary", label: "纪念日", emoji: "💞", color: "#ff5a5f" },
  { value: "birthday", label: "生日", emoji: "🎂", color: "#ff9f43" },
  { value: "festival", label: "节日", emoji: "🎉", color: "#7c5cfc" },
  { value: "exam", label: "考试", emoji: "📚", color: "#4d80f0" },
  { value: "travel", label: "旅行", emoji: "✈️", color: "#2ba471" },
  { value: "custom", label: "自定义", emoji: "⭐", color: "#8f959e" },
]

export const COUNTDOWN_CATEGORY_MAP: Record<CountdownCategory, CountdownCategoryMeta> =
  COUNTDOWN_CATEGORIES.reduce(
    (map, item) => {
      map[item.value] = item
      return map
    },
    {} as Record<CountdownCategory, CountdownCategoryMeta>,
  )

export const COUNTDOWN_EMOJIS = [
  "💞",
  "🎂",
  "🎉",
  "📚",
  "✈️",
  "⭐",
  "❤️",
  "🎓",
  "🏠",
  "💼",
  "🎵",
  "🏃",
  "🍰",
  "🌏",
  "🐱",
  "🎯",
]

export const COUNTDOWN_COLORS = [
  "#ff5a5f",
  "#ff9f43",
  "#f7b731",
  "#2ba471",
  "#4d80f0",
  "#7c5cfc",
  "#eb2f96",
  "#8f959e",
]

export const COUNTDOWN_REPEAT_OPTIONS: Array<{ value: CountdownRepeat; label: string }> = [
  { value: "none", label: "不重复" },
  { value: "yearly", label: "每年" },
  { value: "monthly", label: "每月" },
  { value: "weekly", label: "每周" },
]

export const COUNTDOWN_REPEAT_MAP: Record<CountdownRepeat, string> = {
  none: "不重复",
  yearly: "每年",
  monthly: "每月",
  weekly: "每周",
}

export const COUNTDOWN_REMIND_OPTIONS: Array<{ value: number; label: string }> = [
  { value: -1, label: "不提醒" },
  { value: 0, label: "当天" },
  { value: 1, label: "提前 1 天" },
  { value: 3, label: "提前 3 天" },
  { value: 7, label: "提前 7 天" },
  { value: 30, label: "提前 30 天" },
]

export function getCategoryMeta(category: CountdownCategory): CountdownCategoryMeta {
  return COUNTDOWN_CATEGORY_MAP[category] || COUNTDOWN_CATEGORY_MAP.custom
}
