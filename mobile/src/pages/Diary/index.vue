<!--
 * 日记首页：时间轴 / 日历 / 统计 / 更多 四个板块通过顶部导航切换。
 * 所有日记相关功能都收敛在本页及 pages/Diary 下的子页面中。
-->
<route lang="json5" type="page">
{
  layout: "default",
  style: {
    navigationBarTitleText: "日记",
    navigationBarBackgroundColor: "#FFFFFF",
  },
}
</route>

<template>
  <view class="diary-page">
    <!-- 顶部板块导航 -->
    <view class="section-tabs">
      <view
        v-for="tab in sectionTabs"
        :key="tab.key"
        class="section-tab"
        :class="{ active: activeSection === tab.key }"
        @click="activeSection = tab.key"
      >
        <text>{{ tab.label }}</text>
        <view v-if="activeSection === tab.key" class="section-tab-line" />
      </view>
    </view>

    <!-- ================= 时间轴 ================= -->
    <view v-show="activeSection === 'timeline'" class="panel">
      <view class="search-box">
        <wd-icon name="search" size="18px" color="#bbb" />
        <input
          v-model="keyword"
          class="search-input"
          placeholder="搜索标题、正文或标签"
          confirm-type="search"
        />
        <wd-icon
          v-if="keyword"
          name="close-circle"
          size="18px"
          color="#ccc"
          @click="keyword = ''"
        />
      </view>

      <scroll-view class="mood-filter" scroll-x :show-scrollbar="false">
        <view class="mood-filter-inner">
          <view
            class="mood-chip"
            :class="{ active: moodFilter === 'all' }"
            @click="moodFilter = 'all'"
          >
            全部
          </view>
          <view
            v-for="mood in moods"
            :key="mood.key"
            class="mood-chip"
            :class="{ active: moodFilter === mood.key }"
            @click="moodFilter = mood.key"
          >
            <text class="mood-chip-emoji">{{ mood.emoji }}</text>
            <text>{{ mood.label }}</text>
          </view>
        </view>
      </scroll-view>

      <view v-if="loading" class="empty">
        <text class="empty-text">正在读取日记…</text>
      </view>

      <view v-else-if="groupedEntries.length === 0" class="empty">
        <wd-icon name="note" size="48px" color="#ddd" />
        <text class="empty-text">
          {{ keyword || moodFilter !== "all" ? "没有匹配的日记" : "还没有写过日记" }}
        </text>
        <view v-if="!keyword && moodFilter === 'all'" class="empty-btn" @click="createEntry()">
          写下第一篇
        </view>
      </view>

      <view v-else class="timeline">
        <view v-for="group in groupedEntries" :key="group.date" class="day-group">
          <view class="day-header">
            <text class="day-title">{{ formatDayLabel(group.date) }}</text>
            <text class="day-count">{{ group.entries.length }} 篇</text>
          </view>

          <view
            v-for="entry in group.entries"
            :key="entry.id"
            class="entry-card"
            @click="openDetail(entry)"
          >
            <view class="entry-mood" :style="{ backgroundColor: moodColor(entry) + '18' }">
              <text class="entry-mood-emoji">{{ moodEmoji(entry) }}</text>
            </view>
            <view class="entry-main">
              <view class="entry-title-row">
                <text class="entry-title">{{ entryTitle(entry) }}</text>
                <wd-icon v-if="entry.pinned" name="pin" size="14px" color="#ff9f00" />
              </view>
              <text v-if="entryExcerpt(entry)" class="entry-excerpt">
                {{ entryExcerpt(entry) }}
              </text>
              <view class="entry-meta">
                <text class="entry-time">{{ formatTime(entry.createdAt) }}</text>
                <text v-if="weatherEmoji(entry)" class="entry-weather">
                  {{ weatherEmoji(entry) }}
                </text>
                <text v-for="tag in entry.tags.slice(0, 3)" :key="tag" class="entry-tag">
                  #{{ tag }}
                </text>
              </view>
            </view>
            <image
              v-if="entry.images && entry.images.length"
              class="entry-thumb"
              :src="entry.images[0]"
              mode="aspectFill"
            />
          </view>
        </view>
      </view>
    </view>

    <!-- ================= 日历 ================= -->
    <view v-show="activeSection === 'calendar'" class="panel">
      <view class="calendar-card">
        <view class="calendar-header">
          <view class="calendar-arrow" @click="changeCalendarMonth(-1)">
            <wd-icon name="chevron-left" size="18px" color="#666" />
          </view>
          <view class="calendar-title" @click="goToday">
            <text>{{ calendarMonth.format("YYYY年M月") }}</text>
            <text class="calendar-today-link">回到今天</text>
          </view>
          <view class="calendar-arrow" @click="changeCalendarMonth(1)">
            <wd-icon name="chevron-right" size="18px" color="#666" />
          </view>
        </view>

        <view class="calendar-weekdays">
          <text v-for="weekday in weekdays" :key="weekday" class="calendar-weekday">
            {{ weekday }}
          </text>
        </view>

        <view class="calendar-grid">
          <view
            v-for="(cell, index) in calendarCells"
            :key="index"
            class="calendar-cell"
            :class="{
              blank: !cell.date,
              today: cell.date === todayKey,
              selected: cell.date === selectedDate,
            }"
            @click="selectDate(cell)"
          >
            <text v-if="cell.date" class="calendar-day">{{ cell.day }}</text>
            <view v-if="cell.count" class="calendar-dot" />
          </view>
        </view>
      </view>

      <view class="day-panel">
        <view class="day-panel-header">
          <text class="day-panel-title">
            {{ formatDayLabel(selectedDate) }}
            <text class="day-panel-count">（{{ selectedDayEntries.length }} 篇）</text>
          </text>
          <text class="day-panel-add" @click="createEntry(selectedDate)">写一篇</text>
        </view>

        <view v-if="selectedDayEntries.length === 0" class="empty small">
          <text class="empty-text">这一天还没有记录</text>
        </view>

        <view
          v-for="entry in selectedDayEntries"
          :key="entry.id"
          class="entry-card"
          @click="openDetail(entry)"
        >
          <view class="entry-mood" :style="{ backgroundColor: moodColor(entry) + '18' }">
            <text class="entry-mood-emoji">{{ moodEmoji(entry) }}</text>
          </view>
          <view class="entry-main">
            <view class="entry-title-row">
              <text class="entry-title">{{ entryTitle(entry) }}</text>
              <wd-icon v-if="entry.pinned" name="pin" size="14px" color="#ff9f00" />
            </view>
            <text v-if="entryExcerpt(entry)" class="entry-excerpt">{{ entryExcerpt(entry) }}</text>
            <view class="entry-meta">
              <text class="entry-time">{{ formatTime(entry.createdAt) }}</text>
              <text v-if="weatherEmoji(entry)" class="entry-weather">
                {{ weatherEmoji(entry) }}
              </text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- ================= 统计 ================= -->
    <view v-show="activeSection === 'stats'" class="panel">
      <view class="stat-grid">
        <view class="stat-card">
          <text class="stat-value">{{ stats?.total ?? 0 }}</text>
          <text class="stat-label">日记总数</text>
        </view>
        <view class="stat-card">
          <text class="stat-value">{{ stats?.streak ?? 0 }}</text>
          <text class="stat-label">连续记录（天）</text>
        </view>
        <view class="stat-card">
          <text class="stat-value">{{ stats?.monthCount ?? 0 }}</text>
          <text class="stat-label">本月篇数</text>
        </view>
        <view class="stat-card">
          <text class="stat-value">{{ stats?.days ?? 0 }}</text>
          <text class="stat-label">记录天数</text>
        </view>
      </view>

      <view class="card">
        <text class="card-title">最近 12 周</text>
        <view class="heatmap">
          <view class="heatmap-weekdays">
            <text v-for="(weekday, index) in heatmapWeekdays" :key="index" class="heatmap-weekday">
              {{ weekday }}
            </text>
          </view>
          <view class="heatmap-weeks">
            <view v-for="(week, weekIndex) in heatmapWeeks" :key="weekIndex" class="heatmap-week">
              <view
                v-for="day in week"
                :key="day.date"
                class="heatmap-cell"
                :class="`level-${heatLevel(day.count)}`"
              />
            </view>
          </view>
        </view>
        <view class="heatmap-legend">
          <text>少</text>
          <view class="heatmap-cell level-0" />
          <view class="heatmap-cell level-1" />
          <view class="heatmap-cell level-2" />
          <view class="heatmap-cell level-3" />
          <view class="heatmap-cell level-4" />
          <text>多</text>
        </view>
      </view>

      <view class="card">
        <text class="card-title">心情分布</text>
        <view v-if="moodBars.length === 0" class="empty small">
          <text class="empty-text">记录几篇后就能看到心情分布了</text>
        </view>
        <view v-else class="mood-bars">
          <view v-for="item in moodBars" :key="item.key" class="mood-bar-row">
            <text class="mood-bar-emoji">{{ item.emoji }}</text>
            <text class="mood-bar-label">{{ item.label }}</text>
            <view class="mood-bar-track">
              <view
                class="mood-bar-fill"
                :style="{ width: `${item.percent}%`, backgroundColor: item.color }"
              />
            </view>
            <text class="mood-bar-count">{{ item.count }}</text>
          </view>
        </view>
      </view>

      <view class="card">
        <text class="card-title">常用标签</text>
        <view v-if="topTags.length === 0" class="empty small">
          <text class="empty-text">还没有添加过标签</text>
        </view>
        <view v-else class="tag-list">
          <view v-for="item in topTags" :key="item.tag" class="tag-chip">
            #{{ item.tag }}
            <text class="tag-count">{{ item.count }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- ================= 更多 ================= -->
    <view v-show="activeSection === 'more'" class="panel">
      <view class="card">
        <text class="card-title">功能汇总</text>
        <text class="card-sub">后续的提醒事项、倒数日、收纳等都会从这里进入</text>
        <view class="feature-grid">
          <view
            v-for="item in featureItems"
            :key="item.key"
            class="feature-item"
            :class="{ disabled: item.disabled }"
            @click="handleFeature(item)"
          >
            <view class="feature-icon" :style="{ backgroundColor: item.bg }">
              <wd-icon :name="item.icon" size="22px" :color="item.color" />
            </view>
            <text class="feature-label">{{ item.label }}</text>
            <text class="feature-desc">{{ item.desc }}</text>
          </view>
        </view>
      </view>

      <view class="card">
        <text class="card-title">数据管理</text>
        <view class="action-list">
          <view class="action-item" @click="handleExport">
            <view class="action-icon bg-blue">
              <wd-icon name="download" size="20px" color="#fff" />
            </view>
            <view class="action-info">
              <text class="action-title">导出日记备份</text>
              <text class="action-sub">JSON 文本，可随时导入恢复</text>
            </view>
            <wd-icon name="arrow-right" size="18px" color="#ccc" />
          </view>
          <view class="action-item" @click="handleImport">
            <view class="action-icon bg-green">
              <wd-icon name="upload" size="20px" color="#fff" />
            </view>
            <view class="action-info">
              <text class="action-title">导入日记备份</text>
              <text class="action-sub">导入会替换当前全部日记</text>
            </view>
            <wd-icon name="arrow-right" size="18px" color="#ccc" />
          </view>
        </view>
      </view>

      <view class="card about-card">
        <text class="card-title">关于日记</text>
        <text class="about-text">
          日记与图片都保存在这台设备上，不上传服务器。清理浏览器网站数据、更换访问地址或卸载应用
          都会导致数据不可见，建议定期导出备份。
        </text>
        <text class="about-text">
          心情、天气、标签参考自 moodiary；后续可以继续扩展提醒事项、倒数日、收纳等模块。
        </text>
      </view>
    </view>

    <!-- 新建按钮 -->
    <view class="fab" @click="createEntry()">
      <text class="fab-icon">+</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from "vue"
import { onShow } from "@dcloudio/uni-app"
import dayjs from "dayjs"
import "dayjs/locale/zh-cn"
import {
  collectDiaryTags,
  exportDiaryData,
  getDiaryStats,
  groupDiaryEntriesByDate,
  importDiaryData,
  listDiaryEntries,
  type DiaryEntry,
  type DiaryMoodKey,
  type DiaryStats,
} from "@/api/diary"
import {
  DIARY_MOODS,
  getMoodOption,
  getWeatherOption,
  type DiaryMoodOption,
} from "@/api/diary/types"
import { flushDiaryMailQueue } from "@/api/diary/mail"

dayjs.locale("zh-cn")

type SectionKey = "timeline" | "calendar" | "stats" | "more"

interface FeatureItem {
  key: string
  label: string
  desc: string
  icon: string
  color: string
  bg: string
  disabled?: boolean
  action?: () => void
}

const sectionTabs: Array<{ key: SectionKey; label: string }> = [
  { key: "timeline", label: "时间轴" },
  { key: "calendar", label: "日历" },
  { key: "stats", label: "统计" },
  { key: "more", label: "更多" },
]

const weekdays = ["一", "二", "三", "四", "五", "六", "日"]
const moods = DIARY_MOODS

const activeSection = ref<SectionKey>("timeline")
const entries = ref<DiaryEntry[]>([])
const stats = ref<DiaryStats | null>(null)
const loading = ref(true)
const keyword = ref("")
const moodFilter = ref<DiaryMoodKey | "all">("all")

const todayKey = dayjs().format("YYYY-MM-DD")
const calendarMonth = ref(dayjs().startOf("month"))
const selectedDate = ref(todayKey)

const filteredEntries = computed(() => {
  const value = keyword.value.trim().toLowerCase()
  return entries.value.filter((entry) => {
    if (moodFilter.value !== "all" && entry.mood !== moodFilter.value) return false
    if (!value) return true
    const text = `${entry.title} ${entry.content} ${entry.tags.join(" ")}`.toLowerCase()
    return text.includes(value)
  })
})

const groupedEntries = computed(() => groupDiaryEntriesByDate(filteredEntries.value))

const dayCountMap = computed(() => {
  const map: Record<string, number> = {}
  entries.value.forEach((entry) => {
    map[entry.date] = (map[entry.date] || 0) + 1
  })
  return map
})

interface CalendarCell {
  date: string
  day: number
  count: number
}

const calendarCells = computed<CalendarCell[]>(() => {
  const monthStart = calendarMonth.value.startOf("month")
  const daysInMonth = monthStart.daysInMonth()
  const offset = (monthStart.day() + 6) % 7
  const cells: CalendarCell[] = []
  for (let index = 0; index < offset; index++) {
    cells.push({ date: "", day: 0, count: 0 })
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const date = monthStart.date(day).format("YYYY-MM-DD")
    cells.push({ date, day, count: dayCountMap.value[date] || 0 })
  }
  while (cells.length % 7 !== 0) {
    cells.push({ date: "", day: 0, count: 0 })
  }
  return cells
})

const selectedDayEntries = computed(() =>
  entries.value
    .filter((entry) => entry.date === selectedDate.value)
    .sort((a, b) => b.createdAt - a.createdAt),
)

const heatmapWeekdays = ["一", "", "三", "", "五", "", "日"]

const heatmapWeeks = computed(() => {
  const days = stats.value?.heatmap || []
  const weeks: Array<Array<{ date: string; count: number }>> = []
  for (let index = 0; index < days.length; index += 7) {
    weeks.push(days.slice(index, index + 7))
  }
  return weeks
})

const moodBars = computed(() => {
  const counts = stats.value?.moodCounts
  if (!counts) return []
  const list: Array<DiaryMoodOption & { count: number }> = []
  let max = 0
  DIARY_MOODS.forEach((mood) => {
    const count = counts[mood.key] || 0
    if (count > 0) list.push({ ...mood, count })
    if (count > max) max = count
  })
  return list
    .sort((a, b) => b.count - a.count)
    .map((item) => ({
      ...item,
      percent: max > 0 ? Math.max(6, Math.round((item.count / max) * 100)) : 0,
    }))
})

const topTags = computed(() => collectDiaryTags(entries.value).slice(0, 12))

const featureItems = computed<FeatureItem[]>(() => [
  {
    key: "reminder",
    label: "提醒事项",
    desc: "即将上线",
    icon: "notification",
    color: "#4d80f0",
    bg: "#eef4ff",
    disabled: true,
  },
  {
    key: "countdown",
    label: "倒数日",
    desc: "去查看",
    icon: "hourglass",
    color: "#ff9f00",
    bg: "#fff7e0",
    action: () => uni.switchTab({ url: "/pages/DayMaster/index" }),
  },
  {
    key: "storage",
    label: "收纳",
    desc: "即将上线",
    icon: "folder",
    color: "#52c41a",
    bg: "#effaeb",
    disabled: true,
  },
  {
    key: "recycle",
    label: "回收站",
    desc: `${stats.value?.deleted || 0} 篇`,
    icon: "delete",
    color: "#f5222d",
    bg: "#fff1f0",
    action: () => goRecycle(),
  },
])

function moodOption(entry: DiaryEntry): DiaryMoodOption {
  return getMoodOption(entry.mood)
}

function moodEmoji(entry: DiaryEntry): string {
  return moodOption(entry).emoji
}

function moodColor(entry: DiaryEntry): string {
  return moodOption(entry).color
}

function weatherEmoji(entry: DiaryEntry): string {
  return getWeatherOption(entry.weather)?.emoji || ""
}

function entryTitle(entry: DiaryEntry): string {
  if (entry.title.trim()) return entry.title
  const firstLine = entry.content.trim().split("\n")[0] || ""
  return firstLine.slice(0, 20) || "无标题"
}

function entryExcerpt(entry: DiaryEntry): string {
  const title = entry.title.trim()
  if (!title) {
    // 标题由正文首行生成时，摘要从首行之后取，避免重复显示
    const lines = entry.content.trim().split("\n")
    const rest = lines.slice(1).join(" ").replace(/\s+/g, " ").trim()
    return rest ? rest.slice(0, 60) + (rest.length > 60 ? "…" : "") : ""
  }
  const text = entry.content.replace(/\s+/g, " ").trim()
  if (!text || text === title) return ""
  return text.slice(0, 60) + (text.length > 60 ? "…" : "")
}

function formatTime(timestamp: number): string {
  return dayjs(timestamp).format("HH:mm")
}

function formatDayLabel(date: string): string {
  const value = dayjs(date)
  const today = dayjs().startOf("day")
  const diff = value.startOf("day").diff(today, "day")
  const weekday = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][value.day()]
  if (diff === 0) return `今天 · ${weekday}`
  if (diff === -1) return `昨天 · ${weekday}`
  if (diff === 1) return `明天 · ${weekday}`
  if (value.year() === today.year()) return `${value.format("M月D日")} · ${weekday}`
  return `${value.format("YYYY年M月D日")} · ${weekday}`
}

function heatLevel(count: number): number {
  if (count <= 0) return 0
  if (count === 1) return 1
  if (count === 2) return 2
  if (count === 3) return 3
  return 4
}

function changeCalendarMonth(delta: number): void {
  const next = calendarMonth.value.add(delta, "month").startOf("month")
  calendarMonth.value = next
  const current = dayjs()
  if (next.isSame(current, "month")) {
    selectedDate.value = current.format("YYYY-MM-DD")
  } else {
    selectedDate.value = next.format("YYYY-MM-01")
  }
}

function goToday(): void {
  calendarMonth.value = dayjs().startOf("month")
  selectedDate.value = todayKey
}

function selectDate(cell: CalendarCell): void {
  if (!cell.date) return
  selectedDate.value = cell.date
}

function openDetail(entry: DiaryEntry): void {
  uni.navigateTo({ url: `/pages/Diary/detail?id=${entry.id}` })
}

function createEntry(date?: string): void {
  const query = date ? `?date=${date}` : ""
  uni.navigateTo({ url: `/pages/Diary/edit${query}` })
}

function goRecycle(): void {
  uni.navigateTo({ url: "/pages/Diary/recycle" })
}

function handleFeature(item: FeatureItem): void {
  if (item.disabled) {
    uni.showToast({ title: "功能开发中，敬请期待", icon: "none" })
    return
  }
  item.action?.()
}

async function loadData(): Promise<void> {
  loading.value = true
  try {
    entries.value = await listDiaryEntries()
    stats.value = await getDiaryStats()
  } catch (error) {
    console.error("[diary] 读取失败:", error)
    uni.showToast({ title: "日记读取失败", icon: "none" })
  } finally {
    loading.value = false
  }
}

function confirmModal(title: string, content: string, confirmText = "确定"): Promise<boolean> {
  return new Promise((resolve) => {
    uni.showModal({
      title,
      content,
      confirmText,
      success: (result) => resolve(!!result.confirm),
      fail: () => resolve(false),
    })
  })
}

function downloadJson(text: string, filename: string): void {
  // #ifdef H5
  const blob = new Blob([text], { type: "application/json;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.style.display = "none"
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  setTimeout(() => URL.revokeObjectURL(url), 2000)
  // #endif
  // #ifndef H5
  uni.setClipboardData({
    data: text,
    success: () => uni.showToast({ title: "已复制到剪贴板", icon: "none" }),
  })
  // #endif
}

async function handleExport(): Promise<void> {
  try {
    const payload = await exportDiaryData()
    const text = JSON.stringify(payload, null, 2)
    downloadJson(text, `diary-backup-${dayjs().format("YYYYMMDD-HHmmss")}.json`)
    uni.showToast({ title: "已导出", icon: "success" })
  } catch (error) {
    console.error("[diary] 导出失败:", error)
    uni.showToast({ title: "导出失败", icon: "none" })
  }
}

async function importFromFile(file: File): Promise<void> {
  const confirmed = await confirmModal(
    "导入日记备份",
    "导入会整体替换当前全部日记，建议先导出一份备份。确定继续吗？",
    "导入",
  )
  if (!confirmed) return

  try {
    const text = await file.text()
    const payload = JSON.parse(text)
    const count = await importDiaryData(payload)
    await loadData()
    uni.showToast({ title: `已导入 ${count} 篇`, icon: "success" })
  } catch (error) {
    console.error("[diary] 导入失败:", error)
    uni.showToast({
      title: error instanceof Error ? error.message : "导入失败",
      icon: "none",
    })
  }
}

function handleImport(): void {
  // #ifdef H5
  const input = document.createElement("input")
  input.type = "file"
  input.accept = ".json,application/json"
  input.style.display = "none"
  input.onchange = () => {
    const file = input.files?.[0]
    if (input.parentNode) input.parentNode.removeChild(input)
    if (file) importFromFile(file)
  }
  document.body.appendChild(input)
  input.click()
  // #endif
  // #ifndef H5
  uni.showToast({ title: "请在 H5 页面中导入备份", icon: "none" })
  // #endif
}

onShow(() => {
  loadData()
  // 补发之前离线/失败时积压的日记邮件
  flushDiaryMailQueue()
})
</script>

<style scoped lang="scss">
.diary-page {
  min-height: 100vh;
  padding: 0 30rpx 180rpx;
  background: #f6f7f9;
}

.section-tabs {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  margin: 0 -30rpx;
  background: #fff;
  box-shadow: 0 2rpx 10rpx rgb(0 0 0 / 3%);
}

.section-tab {
  position: relative;
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  height: 92rpx;
  font-size: 28rpx;
  color: #666;

  &.active {
    font-weight: 600;
    color: #222;
  }
}

.section-tab-line {
  position: absolute;
  bottom: 0;
  left: 50%;
  width: 44rpx;
  height: 6rpx;
  background: #2f88ff;
  border-radius: 6rpx;
  transform: translateX(-50%);
}

.panel {
  padding-top: 24rpx;
}

.search-box {
  display: flex;
  align-items: center;
  padding: 0 24rpx;
  background: #fff;
  border-radius: 20rpx;
}

.search-input {
  flex: 1;
  height: 84rpx;
  padding: 0 16rpx;
  font-size: 28rpx;
  color: #333;
}

.mood-filter {
  flex: none;
  width: 100%;
  height: 84rpx;
  margin-top: 20rpx;
  white-space: nowrap;
}

.mood-filter-inner {
  display: inline-flex;
  gap: 14rpx;
  align-items: center;
  height: 84rpx;
  padding: 0 2rpx;
}

.mood-chip {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  padding: 12rpx 24rpx;
  font-size: 26rpx;
  color: #666;
  white-space: nowrap;
  background: #fff;
  border-radius: 999rpx;

  &.active {
    color: #fff;
    background: #2f88ff;
  }
}

.mood-chip-emoji {
  margin-right: 8rpx;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 0 60rpx;
}

.empty.small {
  padding: 40rpx 0;
}

.empty-text {
  margin-top: 20rpx;
  font-size: 26rpx;
  color: #999;
}

.empty-btn {
  padding: 18rpx 46rpx;
  margin-top: 32rpx;
  font-size: 28rpx;
  color: #fff;
  background: #2f88ff;
  border-radius: 999rpx;
}

.timeline {
  padding-top: 10rpx;
}

.day-group {
  margin-top: 24rpx;
}

.day-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 8rpx 16rpx;
}

.day-title {
  font-size: 26rpx;
  font-weight: 600;
  color: #666;
}

.day-count {
  font-size: 22rpx;
  color: #aaa;
}

.entry-card {
  display: flex;
  align-items: flex-start;
  padding: 26rpx;
  margin-bottom: 18rpx;
  background: #fff;
  border-radius: 24rpx;
}

.entry-mood {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 76rpx;
  height: 76rpx;
  border-radius: 24rpx;
}

.entry-mood-emoji {
  font-size: 38rpx;
}

.entry-main {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  margin-left: 20rpx;
}

.entry-title-row {
  display: flex;
  gap: 8rpx;
  align-items: center;
}

.entry-title {
  overflow: hidden;
  font-size: 30rpx;
  font-weight: 600;
  color: #222;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.entry-excerpt {
  display: -webkit-box;
  margin-top: 10rpx;
  overflow: hidden;
  font-size: 26rpx;
  line-height: 1.5;
  color: #888;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.entry-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  align-items: center;
  margin-top: 14rpx;
  font-size: 22rpx;
  color: #aaa;
}

.entry-tag {
  color: #7aa7e8;
}

.entry-thumb {
  flex-shrink: 0;
  width: 110rpx;
  height: 110rpx;
  margin-left: 18rpx;
  border-radius: 16rpx;
}

.calendar-card {
  padding: 26rpx;
  background: #fff;
  border-radius: 24rpx;
}

.calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 20rpx;
}

.calendar-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64rpx;
  height: 64rpx;
  background: #f6f7f9;
  border-radius: 50%;
}

.calendar-title {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 32rpx;
  font-weight: 600;
  color: #222;
}

.calendar-today-link {
  margin-top: 4rpx;
  font-size: 20rpx;
  font-weight: 400;
  color: #2f88ff;
}

.calendar-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  padding: 10rpx 0;
}

.calendar-weekday {
  font-size: 22rpx;
  color: #aaa;
  text-align: center;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8rpx;
}

.calendar-cell {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 84rpx;
  border-radius: 16rpx;

  &.blank {
    background: transparent;
  }

  &.today {
    background: #eef4ff;
  }

  &.selected {
    background: #2f88ff;
  }
}

.calendar-day {
  font-size: 26rpx;
  color: #333;
}

.calendar-cell.selected .calendar-day {
  font-weight: 600;
  color: #fff;
}

.calendar-dot {
  width: 10rpx;
  height: 10rpx;
  margin-top: 6rpx;
  background: #2f88ff;
  border-radius: 50%;
}

.calendar-cell.selected .calendar-dot {
  background: #fff;
}

.day-panel {
  margin-top: 24rpx;
}

.day-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 8rpx 16rpx;
}

.day-panel-title {
  font-size: 26rpx;
  font-weight: 600;
  color: #666;
}

.day-panel-count {
  font-size: 22rpx;
  font-weight: 400;
  color: #aaa;
}

.day-panel-add {
  font-size: 24rpx;
  color: #2f88ff;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 18rpx;
}

.stat-card {
  display: flex;
  flex-direction: column;
  padding: 30rpx;
  background: #fff;
  border-radius: 24rpx;
}

.stat-value {
  font-size: 46rpx;
  font-weight: 600;
  color: #222;
}

.stat-label {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #999;
}

.card {
  padding: 30rpx;
  margin-top: 24rpx;
  background: #fff;
  border-radius: 24rpx;
}

.card-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #222;
}

.card-sub {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #999;
}

.heatmap {
  display: flex;
  margin-top: 24rpx;
}

.heatmap-weekdays {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  margin-right: 12rpx;
}

.heatmap-weekday {
  width: 24rpx;
  height: 24rpx;
  font-size: 18rpx;
  line-height: 24rpx;
  color: #bbb;
  text-align: center;
}

.heatmap-weeks {
  display: flex;
  flex: 1;
  gap: 8rpx;
}

.heatmap-week {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 8rpx;
}

.heatmap-cell {
  width: 100%;
  height: 24rpx;
  border-radius: 5rpx;
}

.level-0 {
  background: #f1f3f5;
}

.level-1 {
  background: #d8e9ff;
}

.level-2 {
  background: #a9ccff;
}

.level-3 {
  background: #6aa6ff;
}

.level-4 {
  background: #2f88ff;
}

.heatmap-legend {
  display: flex;
  gap: 8rpx;
  align-items: center;
  justify-content: flex-end;
  margin-top: 18rpx;
  font-size: 20rpx;
  color: #bbb;

  .heatmap-cell {
    width: 22rpx;
    height: 22rpx;
  }
}

.mood-bars {
  margin-top: 20rpx;
}

.mood-bar-row {
  display: flex;
  align-items: center;
  padding: 12rpx 0;
}

.mood-bar-emoji {
  width: 48rpx;
  font-size: 30rpx;
}

.mood-bar-label {
  width: 76rpx;
  font-size: 24rpx;
  color: #666;
}

.mood-bar-track {
  flex: 1;
  height: 16rpx;
  overflow: hidden;
  background: #f1f3f5;
  border-radius: 999rpx;
}

.mood-bar-fill {
  height: 100%;
  border-radius: 999rpx;
  transition: width 0.3s ease;
}

.mood-bar-count {
  width: 50rpx;
  font-size: 22rpx;
  color: #999;
  text-align: right;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 14rpx;
  margin-top: 20rpx;
}

.tag-chip {
  padding: 12rpx 22rpx;
  font-size: 24rpx;
  color: #4d80f0;
  background: #eef4ff;
  border-radius: 999rpx;
}

.tag-count {
  margin-left: 8rpx;
  color: #8fb2e8;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16rpx;
  margin-top: 24rpx;
}

.feature-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 22rpx 8rpx;
  background: #fafbfc;
  border-radius: 20rpx;

  &.disabled {
    opacity: 0.55;
  }
}

.feature-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72rpx;
  height: 72rpx;
  border-radius: 22rpx;
}

.feature-label {
  margin-top: 12rpx;
  font-size: 24rpx;
  color: #333;
}

.feature-desc {
  margin-top: 4rpx;
  font-size: 20rpx;
  color: #aaa;
}

.action-list {
  display: flex;
  flex-direction: column;
  margin-top: 12rpx;
}

.action-item {
  display: flex;
  align-items: center;
  padding: 24rpx 0;
  border-top: 1rpx solid #f5f5f5;

  &:first-child {
    border-top: none;
  }
}

.action-icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 72rpx;
  height: 72rpx;
  border-radius: 20rpx;
}

.bg-blue {
  background: #4d80f0;
}

.bg-green {
  background: #52c41a;
}

.action-info {
  display: flex;
  flex: 1;
  flex-direction: column;
  margin-left: 20rpx;
}

.action-title {
  font-size: 28rpx;
  color: #333;
}

.action-sub {
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #999;
}

.about-card {
  display: flex;
  flex-direction: column;
}

.about-text {
  margin-top: 16rpx;
  font-size: 24rpx;
  line-height: 1.7;
  color: #999;
}

.fab {
  position: fixed;
  right: 40rpx;
  bottom: calc(40rpx + env(safe-area-inset-bottom));
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 104rpx;
  height: 104rpx;
  background: linear-gradient(135deg, #4d94ff 0%, #2f88ff 100%);
  border-radius: 50%;
  box-shadow: 0 8rpx 24rpx rgb(47 136 255 / 35%);

  &:active {
    transform: scale(0.96);
  }
}

.fab-icon {
  margin-top: -4rpx;
  font-size: 56rpx;
  font-weight: 300;
  color: #fff;
}
</style>
