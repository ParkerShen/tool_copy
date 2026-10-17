/**
 * 日记模块的本地数据结构。
 * 参考 moodiary 的日记模型，保留最常用的字段：心情、天气、标签、图片。
 */

export type DiaryMoodKey =
  | "happy"
  | "calm"
  | "love"
  | "excited"
  | "tired"
  | "sad"
  | "angry"
  | "anxious"
  | "sick"
  | "neutral"

export interface DiaryMoodOption {
  key: DiaryMoodKey
  label: string
  emoji: string
  color: string
}

export const DIARY_MOODS: DiaryMoodOption[] = [
  { key: "happy", label: "开心", emoji: "😄", color: "#ffb020" },
  { key: "calm", label: "平静", emoji: "😌", color: "#52c41a" },
  { key: "love", label: "喜欢", emoji: "🥰", color: "#ff6b9a" },
  { key: "excited", label: "兴奋", emoji: "🤩", color: "#fa8c16" },
  { key: "tired", label: "疲惫", emoji: "😮‍💨", color: "#8c8c8c" },
  { key: "sad", label: "难过", emoji: "😢", color: "#4d80f0" },
  { key: "angry", label: "生气", emoji: "😠", color: "#f5222d" },
  { key: "anxious", label: "焦虑", emoji: "😰", color: "#722ed1" },
  { key: "sick", label: "生病", emoji: "🤒", color: "#13c2c2" },
  { key: "neutral", label: "一般", emoji: "😐", color: "#8c8c8c" },
]

export type DiaryWeatherKey = "sunny" | "cloudy" | "overcast" | "rain" | "snow" | "wind"

export interface DiaryWeatherOption {
  key: DiaryWeatherKey
  label: string
  emoji: string
}

export const DIARY_WEATHERS: DiaryWeatherOption[] = [
  { key: "sunny", label: "晴", emoji: "☀️" },
  { key: "cloudy", label: "多云", emoji: "⛅" },
  { key: "overcast", label: "阴", emoji: "☁️" },
  { key: "rain", label: "雨", emoji: "🌧️" },
  { key: "snow", label: "雪", emoji: "❄️" },
  { key: "wind", label: "风", emoji: "🌬️" },
]

export interface DiaryEntry {
  id: string
  title: string
  content: string
  /** 记录日期，格式 YYYY-MM-DD */
  date: string
  mood: DiaryMoodKey
  weather: DiaryWeatherKey | ""
  tags: string[]
  /** 图片：H5 下为压缩后的 data URL，其他平台为本地临时路径 */
  images: string[]
  pinned: boolean
  createdAt: number
  updatedAt: number
  /** 非空表示在回收站中 */
  deletedAt: number | null
}

export interface DiaryEntryInput {
  id?: string
  title?: string
  content?: string
  date?: string
  mood?: DiaryMoodKey
  weather?: DiaryWeatherKey | ""
  tags?: string[]
  images?: string[]
  pinned?: boolean
}

export interface DiaryEntryFilter {
  keyword?: string
  mood?: DiaryMoodKey | "all"
  tag?: string
  includeDeleted?: boolean
}

export interface DiaryDayGroup {
  date: string
  entries: DiaryEntry[]
}

export interface DiaryHeatmapDay {
  date: string
  count: number
}

export interface DiaryTagCount {
  tag: string
  count: number
}

export interface DiaryStats {
  total: number
  /** 有记录的天数 */
  days: number
  /** 连续记录天数 */
  streak: number
  /** 本月篇数 */
  monthCount: number
  /** 回收站篇数 */
  deleted: number
  moodCounts: Record<DiaryMoodKey, number>
  tagCounts: DiaryTagCount[]
  heatmap: DiaryHeatmapDay[]
}

export interface DiaryExportPayload {
  version: 1
  exportedAt: string
  entries: DiaryEntry[]
}

export function getMoodOption(key: DiaryMoodKey): DiaryMoodOption {
  return DIARY_MOODS.find((item) => item.key === key) || DIARY_MOODS[DIARY_MOODS.length - 1]
}

export function getWeatherOption(key: DiaryWeatherKey | ""): DiaryWeatherOption | undefined {
  if (!key) return undefined
  return DIARY_WEATHERS.find((item) => item.key === key)
}
