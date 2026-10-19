<!--
 * 倒数日主页面：列表 / 日历双视图。
 * 视觉参考 Days Matter：蓝色顶栏、纸卡 Hero、白底彩色数字条、左侧抽屉。
 * 数据来自本地 SQLite（与记账同一个数据库文件）。
-->
<route lang="json5" type="page">
{
  layout: "default",
  style: {
    navigationBarTitleText: "倒数日",
    navigationBarBackgroundColor: "#0B83D6",
  },
}
</route>

<template>
  <view class="dm-page">
    <!-- 蓝色顶栏 -->
    <view class="dm-header">
      <view class="dm-header-btn" @click="drawerOpen = true">
        <wd-icon name="list" size="22px" color="#fff" />
      </view>
      <view class="dm-header-title">
        <wd-icon name="cloud" size="20px" color="#fff" />
        <text class="dm-header-text">倒数日 · {{ currentBookLabel }}</text>
      </view>
      <view class="dm-header-actions">
        <view class="dm-header-btn" @click="toggleSearch">
          <wd-icon name="search" size="20px" color="#fff" />
        </view>
        <view class="dm-header-btn" @click="goCreate">
          <wd-icon name="add" size="23px" color="#fff" />
        </view>
      </view>
    </view>

    <!-- 搜索 -->
    <view v-if="searchOpen" class="dm-search">
      <wd-icon name="search" size="16px" color="#8f959e" />
      <input
        v-model="keyword"
        class="dm-search-input"
        placeholder="搜索标题或备注"
        confirm-type="search"
        @blur="keyword = keyword.trim()"
      />
      <view v-if="keyword" class="dm-search-clear" @click="keyword = ''">
        <wd-icon name="close" size="14px" color="#8f959e" />
      </view>
    </view>

    <view class="dm-content">
      <page-state v-if="loading" state="loading" />
      <page-state v-else-if="error" state="error" :description="error" @retry="load" />

      <template v-else>
        <!-- 应用内提醒 -->
        <view v-if="reminderView" class="dm-reminder" @click="openEdit(reminderView.event.id)">
          <wd-icon name="notification" size="16px" color="#0b7fd1" />
          <text class="dm-reminder-text">
            {{ reminderView.statusLabel }} · {{ reminderView.event.title }}
          </text>
          <wd-icon name="chevron-right" size="14px" color="#7fb9e6" />
        </view>

        <!-- Hero：首页事件 / 最近的重要日子 -->
        <view v-if="heroView" class="dm-hero" @click="openEdit(heroView.event.id)">
          <view class="paper-clip" />
          <view class="dm-hero-main">
            <view class="dm-hero-copy">
              <text class="dm-hero-title">{{ heroView.event.title }}{{ heroSuffix }}</text>
              <text class="dm-hero-sub">{{ heroSubLabel }}</text>
            </view>
            <view class="dm-hero-number-wrap">
              <text class="dm-hero-number cd-number">{{ heroView.numberLabel }}</text>
              <text class="dm-hero-badge">Days</text>
            </view>
          </view>
        </view>

        <!-- 工具栏 -->
        <view class="dm-toolbar">
          <view class="dm-view-switch">
            <view
              class="dm-view-item"
              :class="{ active: viewMode === 'list' }"
              @click="viewMode = 'list'"
            >
              列表
            </view>
            <view
              class="dm-view-item"
              :class="{ active: viewMode === 'calendar' }"
              @click="viewMode = 'calendar'"
            >
              日历
            </view>
          </view>
          <view class="dm-sort" @click="openSort">
            {{ sortLabel }}
            <wd-icon name="chevron-down" size="13px" color="#8f959e" />
          </view>
        </view>

        <!-- 列表 -->
        <template v-if="viewMode === 'list'">
          <view v-if="views.length > 0" class="dm-list">
            <view
              v-for="view in views"
              :key="view.event.id"
              class="dm-row"
              :class="{ archived: view.event.archived }"
              @click="openEdit(view.event.id)"
              @longpress.stop="openActions(view)"
            >
              <view class="dm-row-left">
                <view class="dm-row-title-line">
                  <wd-icon
                    v-if="view.event.pinned"
                    name="star-filled"
                    size="15px"
                    color="#f7b731"
                  />
                  <text class="dm-row-title">{{ view.event.title }}{{ rowSuffix(view) }}</text>
                </view>
                <text class="dm-row-meta">{{ rowMeta(view) }}</text>
              </view>
              <view class="dm-row-value" :class="rowTone(view)">
                <text class="dm-row-number" :class="{ text: view.isToday || view.isEndingToday }">
                  {{ rowNumber(view) }}
                </text>
                <text v-if="!view.isToday && !view.isEndingToday" class="dm-row-unit">天</text>
              </view>
            </view>
          </view>

          <page-state
            v-else-if="allEvents.length === 0"
            state="empty"
            title="还没有倒数日"
            description="把生日、纪念日、考试和旅行放进来，重要日子不再错过。"
          >
            <view class="dm-empty-btn" @click="goCreate">添加第一个倒数日</view>
          </page-state>

          <view v-else class="dm-filter-empty">
            <text class="dm-filter-empty-text">没有符合条件的倒数日</text>
            <view class="dm-filter-empty-btn" @click="resetFilters">清除筛选</view>
          </view>
        </template>

        <!-- 日历 -->
        <template v-else>
          <view class="dm-calendar">
            <view class="dm-calendar-head">
              <view class="dm-month-nav" @click="changeMonth(-1)">
                <wd-icon name="chevron-left" size="18px" color="#5f6670" />
              </view>
              <text class="dm-month-title">{{ calendarYear }}年{{ calendarMonth }}月</text>
              <view class="dm-month-nav" @click="changeMonth(1)">
                <wd-icon name="chevron-right" size="18px" color="#5f6670" />
              </view>
              <view class="dm-today-btn" @click="goToday">今天</view>
            </view>

            <view class="dm-weekday-row">
              <text v-for="day in WEEKDAYS" :key="day" class="dm-weekday">{{ day }}</text>
            </view>

            <view class="dm-calendar-grid">
              <view
                v-for="(cell, index) in monthCells"
                :key="cell.dateKey || `blank-${index}`"
                class="dm-day-cell"
                :class="{
                  blank: !cell.dateKey,
                  today: cell.isToday,
                  selected: cell.dateKey && cell.dateKey === selectedDate,
                  'has-event': cell.occurrences.length > 0,
                }"
                @click="selectDay(cell)"
              >
                <text v-if="cell.day" class="dm-day-number">{{ cell.day }}</text>
                <view v-if="cell.occurrences.length > 0" class="dm-day-dots">
                  <view
                    v-for="(color, dotIndex) in cellColors(cell)"
                    :key="dotIndex"
                    class="dm-day-dot"
                    :style="{ backgroundColor: color }"
                  />
                </view>
              </view>
            </view>

            <view class="dm-selected-panel">
              <text class="dm-selected-title">
                {{ selectedDate ? selectedDateLabel : "选择一个日期" }}
              </text>
              <view v-if="selectedOccurrences.length === 0" class="dm-selected-empty">
                这天没有安排
              </view>
              <view
                v-for="item in selectedOccurrences"
                :key="item.event.id + item.dateKey"
                class="dm-selected-item"
                @click="openEdit(item.event.id)"
              >
                <view
                  class="dm-selected-emoji"
                  :style="{ backgroundColor: item.event.color + '1c' }"
                >
                  {{ item.event.emoji }}
                </view>
                <view class="dm-selected-copy">
                  <text class="dm-selected-event-title">{{ item.event.title }}</text>
                  <text class="dm-selected-meta">
                    {{ occurrenceLabel(item) }}
                    <text v-if="formatOccurrenceTime(item.time, item.endTime)">
                      · {{ formatOccurrenceTime(item.time, item.endTime) }}
                    </text>
                  </text>
                </view>
                <wd-icon name="chevron-right" size="14px" color="#c5c8ce" />
              </view>
            </view>
          </view>
        </template>
      </template>
    </view>

    <!-- 左侧抽屉 -->
    <view v-if="drawerOpen" class="dm-drawer-mask" @click="drawerOpen = false">
      <view class="dm-drawer" @click.stop>
        <view class="dm-drawer-group">
          <view
            class="dm-drawer-item"
            :class="{ active: activeCategory === 'pinned' }"
            @click="selectCategory('pinned')"
          >
            <wd-icon name="star-filled" size="19px" color="#fff" />
            <text>首页事件</text>
            <wd-icon v-if="activeCategory === 'pinned'" name="check" size="17px" color="#fff" />
          </view>
          <view
            class="dm-drawer-item"
            :class="{ active: activeCategory === 'all' }"
            @click="selectCategory('all')"
          >
            <wd-icon name="internet" size="19px" color="#fff" />
            <text>全部</text>
            <wd-icon v-if="activeCategory === 'all'" name="check" size="17px" color="#fff" />
          </view>
        </view>

        <view class="dm-drawer-group">
          <view
            v-for="item in COUNTDOWN_CATEGORIES"
            :key="item.value"
            class="dm-drawer-item"
            :class="{ active: activeCategory === item.value }"
            @click="selectCategory(item.value)"
          >
            <text class="dm-drawer-emoji">{{ item.emoji }}</text>
            <text>{{ item.label }}</text>
            <wd-icon v-if="activeCategory === item.value" name="check" size="17px" color="#fff" />
          </view>
        </view>

        <view class="dm-drawer-group">
          <view
            class="dm-drawer-item"
            :class="{ active: activeCategory === 'archived' }"
            @click="selectCategory('archived')"
          >
            <wd-icon name="folder" size="19px" color="#fff" />
            <text>已归档</text>
            <text v-if="archivedCount > 0" class="dm-drawer-count">{{ archivedCount }}</text>
            <wd-icon v-if="activeCategory === 'archived'" name="check" size="17px" color="#fff" />
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue"
import { onShow } from "@dcloudio/uni-app"
import PageState from "@/components/page-state/page-state.vue"
import { deleteEvent, listEvents, setArchived, togglePinned } from "@/api/countdown"
import {
  buildMonthCells,
  formatDateLabel,
  formatOccurrenceTime,
  getEventView,
  sortEventViews,
  todayKey,
  type MonthCell,
  type OccurrenceItem,
} from "@/api/countdown/date"
import {
  COUNTDOWN_CATEGORIES,
  type CountdownCategory,
  type CountdownEvent,
  type CountdownEventView,
  type CountdownSort,
} from "@/api/countdown/types"

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"]
const SORT_OPTIONS: Array<{ value: CountdownSort; label: string }> = [
  { value: "default", label: "默认排序" },
  { value: "date", label: "按日期" },
  { value: "name", label: "按名称" },
]

type CategoryFilter = "all" | "pinned" | "archived" | CountdownCategory

const loading = ref(true)
const error = ref("")
const allEvents = ref<CountdownEvent[]>([])
const now = ref(new Date())

const searchOpen = ref(false)
const keyword = ref("")
const activeCategory = ref<CategoryFilter>("all")
const sort = ref<CountdownSort>("default")
const viewMode = ref<"list" | "calendar">("list")
const drawerOpen = ref(false)

const calendarYear = ref(now.value.getFullYear())
const calendarMonth = ref(now.value.getMonth() + 1)
const selectedDate = ref(todayKey(now.value))

const activeEvents = computed(() => allEvents.value.filter((event) => !event.archived))
const archivedCount = computed(() => allEvents.value.filter((event) => event.archived).length)

const sortLabel = computed(
  () => SORT_OPTIONS.find((item) => item.value === sort.value)?.label || "默认排序",
)

const currentBookLabel = computed(() => {
  if (activeCategory.value === "all") return "全部"
  if (activeCategory.value === "pinned") return "首页事件"
  if (activeCategory.value === "archived") return "已归档"
  return COUNTDOWN_CATEGORIES.find((item) => item.value === activeCategory.value)?.label || "全部"
})

function matchesFilter(event: CountdownEvent): boolean {
  if (activeCategory.value === "archived") return event.archived
  if (event.archived) return false
  if (activeCategory.value === "pinned" && !event.pinned) return false
  if (
    activeCategory.value !== "all" &&
    activeCategory.value !== "pinned" &&
    event.category !== activeCategory.value
  ) {
    return false
  }
  const text = keyword.value.trim().toLowerCase()
  if (!text) return true
  return event.title.toLowerCase().includes(text) || event.note.toLowerCase().includes(text)
}

const filteredEvents = computed(() => allEvents.value.filter(matchesFilter))

const views = computed(() =>
  sortEventViews(
    filteredEvents.value.map((event) => getEventView(event, now.value)),
    sort.value,
  ),
)

/** Hero 只在「全部 / 首页事件」且未搜索时展示；优先展示置顶事件 */
const heroView = computed<CountdownEventView | null>(() => {
  if (keyword.value.trim()) return null
  if (activeCategory.value !== "all" && activeCategory.value !== "pinned") return null
  const list = views.value
  const pinned = list.find((view) => view.event.pinned)
  if (pinned) return pinned
  return (
    list.find(
      (view) => (view.status === "future" || view.status === "today") && view.daysUntil >= 0,
    ) || null
  )
})

const heroSuffix = computed(() => {
  const view = heroView.value
  if (!view) return ""
  if (view.event.mode === "countup") return "已经"
  if (view.isRange && view.status === "ongoing") return "还剩"
  if (view.isRange && view.status === "past") return "已结束"
  if (view.status === "past") return "已过"
  return "还有"
})

const heroSubLabel = computed(() => {
  const view = heroView.value
  if (!view) return ""
  const prefix = view.event.mode === "countup" ? "起始日:" : "目标日:"
  const dateText = view.isRange ? `${view.dateLabel} 至 ${view.endDateLabel}` : view.dateLabel
  const extras = [view.timeLabel, view.isRecurring ? view.repeatLabel : ""].filter(Boolean)
  return `${prefix} ${dateText}${extras.length ? ` · ${extras.join(" · ")}` : ""}`
})

const reminderView = computed<CountdownEventView | null>(() => {
  const list = sortEventViews(
    activeEvents.value.map((event) => getEventView(event, now.value)),
    "default",
  )
  return (
    list.find((view) => {
      const days = view.event.remindDaysBefore
      if (days < 0) return false
      if (view.status !== "future" && view.status !== "today") return false
      return view.daysUntil >= 0 && view.daysUntil <= days
    }) || null
  )
})

const monthCells = computed(() =>
  buildMonthCells(calendarYear.value, calendarMonth.value, filteredEvents.value, now.value),
)

const selectedCell = computed<MonthCell | null>(() => {
  if (!selectedDate.value) return null
  return monthCells.value.find((cell) => cell.dateKey === selectedDate.value) || null
})

const selectedOccurrences = computed<OccurrenceItem[]>(() => selectedCell.value?.occurrences || [])

const selectedDateLabel = computed(() => {
  if (!selectedDate.value) return ""
  try {
    return formatDateLabel(selectedDate.value)
  } catch {
    return selectedDate.value
  }
})

function rowSuffix(view: CountdownEventView): string {
  if (view.isToday || view.isEndingToday) return ""
  if (view.event.mode === "countup") return "已经"
  if (view.isRange && view.status === "ongoing") return "还剩"
  if (view.isRange && view.status === "past") return "已结束"
  if (view.status === "past") return "已过"
  return "还有"
}

function rowNumber(view: CountdownEventView): string {
  return view.isToday || view.isEndingToday ? "今天" : view.numberLabel
}

function rowTone(view: CountdownEventView): string {
  if (view.event.mode === "countup") return "countup"
  if (view.isPast) return "past"
  return "countdown"
}

function rowMeta(view: CountdownEventView): string {
  const parts: string[] = []
  if (view.event.archived) parts.push("已归档")
  parts.push(view.shortDateRangeLabel)
  if (view.timeLabel) parts.push(view.timeLabel)
  if (view.isRecurring) parts.push(view.repeatLabel)
  return parts.join(" · ")
}

async function load(): Promise<void> {
  try {
    error.value = ""
    now.value = new Date()
    allEvents.value = await listEvents(true)
    if (selectedDate.value === todayKey(new Date())) {
      calendarYear.value = now.value.getFullYear()
      calendarMonth.value = now.value.getMonth() + 1
    }
  } catch (err) {
    console.error("[countdown] 加载失败:", err)
    error.value = err instanceof Error ? err.message : "倒数日加载失败"
  } finally {
    loading.value = false
  }
}

onShow(() => {
  load()
})

onMounted(() => {
  uni.$on("refreshCountdownData", load)
})

onUnmounted(() => {
  uni.$off("refreshCountdownData", load)
})

function toggleSearch(): void {
  searchOpen.value = !searchOpen.value
  if (!searchOpen.value) keyword.value = ""
}

function selectCategory(category: CategoryFilter): void {
  activeCategory.value = category
  drawerOpen.value = false
}

function resetFilters(): void {
  activeCategory.value = "all"
  keyword.value = ""
  sort.value = "default"
  searchOpen.value = false
}

function openSort(): void {
  uni.showActionSheet({
    itemList: SORT_OPTIONS.map((item) => item.label),
    success: (result) => {
      const option = SORT_OPTIONS[result.tapIndex]
      if (option) sort.value = option.value
    },
  })
}

function goCreate(): void {
  uni.navigateTo({ url: "/pages/DayMaster/edit" })
}

function openEdit(id: string): void {
  uni.navigateTo({ url: `/pages/DayMaster/edit?id=${encodeURIComponent(id)}` })
}

function changeMonth(delta: number): void {
  const index = calendarYear.value * 12 + (calendarMonth.value - 1) + delta
  calendarYear.value = Math.floor(index / 12)
  calendarMonth.value = (index % 12) + 1
  selectedDate.value = ""
}

function goToday(): void {
  now.value = new Date()
  calendarYear.value = now.value.getFullYear()
  calendarMonth.value = now.value.getMonth() + 1
  selectedDate.value = todayKey(now.value)
}

function selectDay(cell: MonthCell): void {
  if (!cell.dateKey) return
  selectedDate.value = cell.dateKey
}

function cellColors(cell: MonthCell): string[] {
  const colors: string[] = []
  for (const item of cell.occurrences) {
    if (!colors.includes(item.event.color)) colors.push(item.event.color)
    if (colors.length >= 3) break
  }
  return colors
}

function occurrenceLabel(item: OccurrenceItem): string {
  if (item.endDate && item.endDate > item.dateKey && item.daysUntilEnd !== null) {
    if (item.daysUntilEnd < 0) return `已结束 ${Math.abs(item.daysUntilEnd)} 天`
    if (item.daysUntilEnd === 0) return "今天结束"
    if (item.daysUntil <= 0) return `进行中 · 还有 ${item.daysUntilEnd} 天结束`
    return `还有 ${item.daysUntil} 天`
  }
  if (item.daysUntil === 0) {
    if (item.event.mode === "countup" && item.event.countupIncludeStart) return "已经 1 天"
    return "今天"
  }
  if (item.event.mode === "countup" && item.daysUntil < 0) {
    const total = Math.abs(item.daysUntil) + (item.event.countupIncludeStart ? 1 : 0)
    return `已经 ${total} 天`
  }
  if (item.daysUntil > 0) return `还有 ${item.daysUntil} 天`
  return `已过 ${Math.abs(item.daysUntil)} 天`
}

function openActions(view: CountdownEventView): void {
  const event = view.event
  const items = [
    event.pinned ? "取消置顶" : "置顶",
    event.archived ? "取消归档" : "归档",
    "编辑",
    "删除",
  ]
  uni.showActionSheet({
    itemList: items,
    success: async (result) => {
      try {
        if (result.tapIndex === 0) {
          await togglePinned(event.id)
          await load()
        } else if (result.tapIndex === 1) {
          await setArchived(event.id, !event.archived)
          await load()
          uni.$emit("refreshCountdownData")
        } else if (result.tapIndex === 2) {
          openEdit(event.id)
        } else if (result.tapIndex === 3) {
          confirmDelete(event)
        }
      } catch (err) {
        uni.showToast({
          title: err instanceof Error ? err.message : "操作失败",
          icon: "none",
        })
      }
    },
  })
}

function confirmDelete(event: CountdownEvent): void {
  uni.showModal({
    title: "删除倒数日",
    content: `确定删除「${event.title}」吗？删除后无法恢复。`,
    confirmText: "删除",
    confirmColor: "#f54a45",
    success: async (result) => {
      if (!result.confirm) return
      try {
        await deleteEvent(event.id)
        await load()
        uni.$emit("refreshCountdownData")
        uni.showToast({ title: "已删除", icon: "success" })
      } catch (err) {
        uni.showToast({
          title: err instanceof Error ? err.message : "删除失败",
          icon: "none",
        })
      }
    },
  })
}
</script>

<style scoped lang="scss">
$dm-blue: #0b7fd1;
$dm-blue-dark: #0a6fb8;

.dm-page {
  box-sizing: border-box;
  min-height: 100vh;
  padding-bottom: calc(170rpx + env(safe-area-inset-bottom));
  background: #f0f0f2;
}

.dm-header {
  position: sticky;
  top: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  gap: 14rpx;
  padding: calc(env(safe-area-inset-top) + 12rpx) 20rpx 12rpx;
  background: linear-gradient(180deg, #0d88dc 0%, $dm-blue-dark 100%);
}

.dm-header-btn {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 68rpx;
  height: 68rpx;
  background: rgb(255 255 255 / 16%);
  border-radius: 12rpx;
}

.dm-header-btn:active {
  background: rgb(255 255 255 / 26%);
}

.dm-header-title {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  min-width: 0;
}

.dm-header-text {
  overflow: hidden;
  font-size: 32rpx;
  font-weight: 600;
  color: #fff;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dm-header-actions {
  display: flex;
  flex: none;
  gap: 10rpx;
}

.dm-search {
  display: flex;
  align-items: center;
  gap: 12rpx;
  height: 74rpx;
  padding: 0 22rpx;
  margin: 16rpx 20rpx 0;
  background: #fff;
  border-radius: 999rpx;
  box-shadow: 0 2rpx 8rpx rgb(0 0 0 / 6%);
}

.dm-search-input {
  flex: 1;
  min-width: 0;
  font-size: 16px;
  color: #333;
}

.dm-search-clear {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38rpx;
  height: 38rpx;
  background: #f2f3f5;
  border-radius: 50%;
}

.dm-content {
  padding: 18rpx 20rpx 0;
}

.dm-reminder {
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding: 16rpx 20rpx;
  margin-bottom: 16rpx;
  background: #e9f4fd;
  border-radius: 12rpx;
}

.dm-reminder-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  font-size: 25rpx;
  font-weight: 500;
  color: $dm-blue;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ---------- Hero 纸卡 ---------- */
.dm-hero {
  position: relative;
  padding: 54rpx 28rpx 26rpx;
  margin-bottom: 20rpx;
  background: #fff;
  border-radius: 12rpx;
  box-shadow: 0 3rpx 10rpx rgb(0 0 0 / 8%);
}

.paper-clip {
  position: absolute;
  top: 0;
  left: 50%;
  width: 110rpx;
  height: 28rpx;
  margin-left: -55rpx;
  background: linear-gradient(180deg, #fdfdfd 0%, #c6cacf 100%);
  border: 2rpx solid #9aa0a6;
  border-top: none;
  border-radius: 0 0 16rpx 16rpx;
  box-shadow: 0 2rpx 4rpx rgb(0 0 0 / 18%);
}

.paper-clip::after {
  position: absolute;
  top: -20rpx;
  right: 12rpx;
  left: 12rpx;
  height: 26rpx;
  content: "";
  background: linear-gradient(180deg, #f2f3f4 0%, #c7cbd0 100%);
  border: 2rpx solid #9aa0a6;
  border-radius: 12rpx 12rpx 6rpx 6rpx;
}

.dm-hero-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.dm-hero-copy {
  flex: 1;
  min-width: 0;
}

.dm-hero-title {
  display: block;
  overflow: hidden;
  font-size: 33rpx;
  font-weight: 500;
  color: #333;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dm-hero-sub {
  display: block;
  margin-top: 12rpx;
  overflow: hidden;
  font-size: 24rpx;
  color: #a0a4aa;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dm-hero-number-wrap {
  display: flex;
  flex: none;
  align-items: flex-start;
  gap: 6rpx;
}

.dm-hero-number {
  font-size: 112rpx;
  font-weight: 300;
  line-height: 1;
  color: #111;
  letter-spacing: -4rpx;
}

.dm-hero-badge {
  padding: 4rpx 10rpx;
  margin-top: 10rpx;
  font-size: 18rpx;
  font-weight: 600;
  color: #fff;
  background: #e5484d;
  border-radius: 8rpx;
}

/* ---------- 工具栏 ---------- */
.dm-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.dm-view-switch {
  display: flex;
  padding: 4rpx;
  background: #e4e6e9;
  border-radius: 10rpx;
}

.dm-view-item {
  padding: 10rpx 26rpx;
  font-size: 24rpx;
  font-weight: 500;
  color: #666d78;
  border-radius: 8rpx;
}

.dm-view-item.active {
  color: $dm-blue;
  background: #fff;
  box-shadow: 0 1rpx 4rpx rgb(0 0 0 / 8%);
}

.dm-sort {
  display: flex;
  align-items: center;
  gap: 6rpx;
  font-size: 24rpx;
  color: #7c828b;
}

/* ---------- 列表行 ---------- */
.dm-list {
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}

.dm-row {
  display: flex;
  min-height: 104rpx;
  overflow: hidden;
  background: #fff;
  border-radius: 12rpx;
  box-shadow: 0 2rpx 8rpx rgb(0 0 0 / 8%);
}

.dm-row:active {
  transform: scale(0.99);
}

.dm-row.archived {
  opacity: 0.55;
}

.dm-row-left {
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
  padding: 14rpx 20rpx;
}

.dm-row-title-line {
  display: flex;
  align-items: center;
  gap: 8rpx;
  min-width: 0;
}

.dm-row-title {
  overflow: hidden;
  font-size: 30rpx;
  font-weight: 400;
  color: #333;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dm-row-meta {
  margin-top: 5rpx;
  overflow: hidden;
  font-size: 21rpx;
  color: #aaafb6;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dm-row-value {
  display: flex;
  flex: none;
  align-items: stretch;
  width: 36%;
  min-width: 210rpx;
  color: #fff;
}

.dm-row-number {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  font-size: 46rpx;
  font-weight: 500;
  line-height: 1;
  text-shadow: 0 1rpx 2rpx rgb(0 0 0 / 12%);
}

.dm-row-number.text {
  font-size: 32rpx;
  font-weight: 600;
}

.dm-row-unit {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 60rpx;
  font-size: 25rpx;
  background: rgb(0 0 0 / 10%);
}

.dm-row-value.countdown {
  background: linear-gradient(135deg, #7cc0f0 0%, #3f8fd6 100%);
}

.dm-row-value.countup {
  background: linear-gradient(135deg, #f7b733 0%, #e8890c 100%);
}

.dm-row-value.past {
  background: linear-gradient(135deg, #c9ccd1 0%, #a4a9b1 100%);
}

.dm-empty-btn,
.dm-filter-empty-btn {
  padding: 16rpx 44rpx;
  font-size: 27rpx;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(180deg, #1b95e5 0%, $dm-blue 100%);
  border-radius: 999rpx;
}

.dm-filter-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24rpx;
  padding: 110rpx 40rpx;
}

.dm-filter-empty-text {
  font-size: 27rpx;
  color: #9aa0a6;
}

.dm-filter-empty-btn {
  padding: 14rpx 36rpx;
  color: $dm-blue;
  background: #fff;
}

/* ---------- 日历 ---------- */
.dm-calendar {
  padding: 22rpx 18rpx;
  background: #fff;
  border-radius: 12rpx;
  box-shadow: 0 2rpx 8rpx rgb(0 0 0 / 7%);
}

.dm-calendar-head {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 0 6rpx 18rpx;
}

.dm-month-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 54rpx;
  height: 54rpx;
  background: #f2f4f6;
  border-radius: 50%;
}

.dm-month-title {
  flex: 1;
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
  text-align: center;
}

.dm-today-btn {
  padding: 10rpx 20rpx;
  font-size: 23rpx;
  color: $dm-blue;
  background: #e9f4fd;
  border-radius: 999rpx;
}

.dm-weekday-row {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  padding-bottom: 10rpx;
}

.dm-weekday {
  font-size: 22rpx;
  color: #a5aab1;
  text-align: center;
}

.dm-calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  row-gap: 8rpx;
}

.dm-day-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 82rpx;
  border-radius: 14rpx;
}

.dm-day-cell.blank {
  visibility: hidden;
}

.dm-day-cell.has-event {
  background: #edf6fd;
}

.dm-day-cell.selected {
  background: linear-gradient(180deg, #1b95e5 0%, $dm-blue 100%);
}

.dm-day-cell.today .dm-day-number {
  font-weight: 700;
  color: $dm-blue;
}

.dm-day-cell.selected .dm-day-number {
  color: #fff;
}

.dm-day-number {
  font-size: 26rpx;
  color: #333;
}

.dm-day-dots {
  display: flex;
  gap: 4rpx;
  margin-top: 5rpx;
}

.dm-day-dot {
  width: 8rpx;
  height: 8rpx;
  border-radius: 50%;
}

.dm-day-cell.selected .dm-day-dot {
  background: #fff !important;
}

.dm-selected-panel {
  padding: 18rpx 10rpx 4rpx;
  margin-top: 18rpx;
  border-top: 1rpx solid #f0f0f0;
}

.dm-selected-title {
  display: block;
  margin-bottom: 8rpx;
  font-size: 26rpx;
  font-weight: 600;
  color: #333;
}

.dm-selected-empty {
  padding: 18rpx 0 6rpx;
  font-size: 24rpx;
  color: #a5aab1;
}

.dm-selected-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx 0;
  border-top: 1rpx solid #f4f4f4;
}

.dm-selected-emoji {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64rpx;
  height: 64rpx;
  font-size: 30rpx;
  border-radius: 16rpx;
}

.dm-selected-copy {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  gap: 4rpx;
}

.dm-selected-event-title {
  overflow: hidden;
  font-size: 27rpx;
  font-weight: 500;
  color: #333;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dm-selected-meta {
  font-size: 22rpx;
  color: #a5aab1;
}

/* ---------- 左侧抽屉 ---------- */
.dm-drawer-mask {
  position: fixed;
  inset: 0;
  z-index: 1100;
  background: rgb(0 0 0 / 35%);
}

.dm-drawer {
  box-sizing: border-box;
  width: 78%;
  max-width: 620rpx;
  height: 100%;
  padding: calc(env(safe-area-inset-top) + 56rpx) 22rpx 40rpx;
  overflow-y: auto;
  background: linear-gradient(180deg, #6f4b2e 0%, #5a3b24 55%, #4a2f1c 100%);
  animation: dm-drawer-in 0.22s ease-out;
}

@keyframes dm-drawer-in {
  from {
    transform: translateX(-100%);
  }

  to {
    transform: translateX(0);
  }
}

.dm-drawer-group {
  margin-bottom: 24rpx;
  overflow: hidden;
  background: rgb(255 255 255 / 10%);
  border-radius: 14rpx;
}

.dm-drawer-item {
  display: flex;
  align-items: center;
  gap: 18rpx;
  min-height: 92rpx;
  padding: 0 24rpx;
  font-size: 29rpx;
  color: #fff;
  border-bottom: 1rpx solid rgb(255 255 255 / 12%);
}

.dm-drawer-item:last-child {
  border-bottom: none;
}

.dm-drawer-item.active {
  background: rgb(255 255 255 / 12%);
}

.dm-drawer-item text:not(.dm-drawer-emoji):not(.dm-drawer-count) {
  flex: 1;
}

.dm-drawer-emoji {
  width: 38rpx;
  font-size: 30rpx;
  text-align: center;
}

.dm-drawer-count {
  padding: 2rpx 12rpx;
  font-size: 21rpx;
  background: rgb(255 255 255 / 18%);
  border-radius: 999rpx;
}
</style>
