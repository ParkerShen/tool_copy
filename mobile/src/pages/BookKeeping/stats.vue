<!--
 * 统计页：黄色头部 + 周/月/年 + 年份 tab + 环形占比 + 趋势折线 + 分类排行 + 账户余额。
 * 数据全部来自本地 SQLite（整数分），不含任何模拟数据。
-->
<route lang="json5" type="page">
{
  layout: "default",
  style: {
    navigationBarTitleText: "统计",
    navigationBarBackgroundColor: "#FFD60A",
    enablePullDownRefresh: true,
  },
}
</route>

<template>
  <view class="stats-page">
    <view v-if="typeMenuOpen" class="type-mask" @click="typeMenuOpen = false" />

    <view class="stats-header">
      <view class="hd-bar">
        <view class="hd-side hd-back" @click="handleBack">
          <wd-icon name="arrow-left" size="22px" color="#111" />
        </view>

        <view class="hd-title" @click="toggleTypeMenu">
          <text class="hd-title-text">{{ typeLabel }}</text>
          <view class="hd-caret" :class="{ open: typeMenuOpen }">
            <wd-icon name="arrow-down" size="13px" color="#111" />
          </view>
        </view>

        <view class="hd-side" />

        <view v-if="typeMenuOpen" class="type-menu">
          <view
            v-for="option in typeOptions"
            :key="option.value"
            class="type-option"
            :class="{ active: type === option.value }"
            @click.stop="setType(option.value)"
          >
            <text>{{ option.label }}</text>
            <wd-icon v-if="type === option.value" name="check" size="14px" color="#111" />
          </view>
        </view>
      </view>

      <view class="period-switch">
        <view
          v-for="option in periodOptions"
          :key="option.value"
          class="period-item"
          :class="{ active: period === option.value }"
          @click="setPeriod(option.value)"
        >
          {{ option.label }}
        </view>
      </view>
    </view>

    <view class="period-bar">
      <scroll-view
        v-if="period === 'year'"
        class="year-tabs"
        scroll-x
        scroll-with-animation
        :scroll-into-view="activeYearAnchor"
      >
        <view class="year-tabs-inner">
          <view
            v-for="year in yearTabs"
            :id="`year-${year}`"
            :key="year"
            class="year-tab"
            :class="{ active: anchor.year() === year }"
            @click="selectYear(year)"
          >
            {{ year }}年
          </view>
        </view>
      </scroll-view>

      <view v-else class="period-nav">
        <view class="nav-arrow" :class="{ disabled: !canGoPrev }" @click="shiftPeriod(-1)">
          <wd-icon name="chevron-left" size="18px" color="#333" />
        </view>
        <text class="period-label">{{ periodLabel }}</text>
        <view class="nav-arrow" :class="{ disabled: !canGoNext }" @click="shiftPeriod(1)">
          <wd-icon name="chevron-right" size="18px" color="#333" />
        </view>
      </view>
    </view>

    <view class="stats-body">
      <page-state v-if="state === 'loading'" state="loading" class="stats-state" />

      <page-state
        v-else-if="state === 'error'"
        state="error"
        class="stats-state"
        :description="errorMessage"
        @retry="load(false)"
      />

      <page-state
        v-else-if="rangeStats.recordCount === 0"
        state="empty"
        class="stats-state"
        :title="`${periodLabel}还没有记录`"
        description="换个时间范围看看，或先去记一笔。"
      />

      <template v-else>
        <view class="overview-card">
          <view class="donut-row">
            <view class="donut" :style="donutStyle">
              <view class="donut-hole">
                <text class="donut-label">总{{ typeLabel }}</text>
                <text class="donut-value">¥{{ formatCents(totalCents) }}</text>
              </view>
            </view>

            <view class="legend">
              <view v-for="slice in donutSlices" :key="slice.key" class="legend-row">
                <view class="legend-dot" :style="{ background: slice.color }" />
                <text class="legend-name">{{ slice.name }}</text>
                <text class="legend-pct">{{ formatPercent(slice.percent) }}</text>
              </view>
              <view v-if="donutSlices.length === 0" class="legend-empty">
                本期暂无{{ typeLabel }}分类
              </view>
            </view>
          </view>
        </view>

        <view class="summary-card">
          <view class="summary-grid">
            <view class="summary-item">
              <text class="summary-label">总{{ typeLabel }}</text>
              <text class="summary-value">¥{{ formatCents(totalCents) }}</text>
            </view>
            <view class="summary-divider" />
            <view class="summary-item">
              <text class="summary-label">平均值</text>
              <text class="summary-value">¥{{ formatCents(averageCents) }}</text>
            </view>
          </view>
          <view class="summary-foot">
            <text>{{ rangeLabel }}</text>
            <text>{{ typeRecordCount }} 笔记录</text>
          </view>
        </view>

        <view class="chart-card">
          <view class="chart-head">
            <text class="chart-title">{{ typeLabel }}趋势</text>
            <text class="chart-sub">{{ rangeLabel }}</text>
          </view>

          <!-- #ifdef H5 -->
          <view id="trend-chart-plot" class="trend-chart" @click="handleChartClick">
            <view class="trend-svg" v-html="chartSvg" />

            <view v-if="selectedBucket" class="chart-tooltip" :style="tooltipStyle">
              <view class="tip-head">
                <text class="tip-title">最大 {{ selectedRecords.length }} 笔交易</text>
                <text class="tip-date">{{ selectedBucketTitle }}</text>
              </view>

              <view v-for="record in selectedRecords" :key="record.id" class="tip-row">
                <text class="tip-date-col">{{ shortDate(record.recordDate) }}</text>
                <view class="tip-dot" :style="{ background: recordColor(record) }" />
                <text class="tip-name">{{ recordLabel(record) }}</text>
                <text class="tip-amount">¥{{ formatCents(recordCents(record)) }}</text>
              </view>

              <view v-if="selectedRecords.length === 0" class="tip-empty">
                该时段没有{{ typeLabel }}记录
              </view>

              <view class="tip-total">
                <text>{{ bucketTotalLabel }}</text>
                <text class="tip-total-value">
                  ¥{{ formatCents(selectedBucket?.amountCents ?? 0) }}
                </text>
              </view>
            </view>
          </view>
          <!-- #endif -->

          <!-- #ifndef H5 -->
          <view class="trend-fallback">
            <view
              v-for="(item, index) in trendItems"
              :key="item.key"
              class="fallback-col"
              @click="selectedIndex = index"
            >
              <view
                class="fallback-bar"
                :class="{ active: selectedIndex === index }"
                :style="{ height: `${fallbackHeight(item.amountCents)}%` }"
              />
              <text v-if="item.showLabel" class="fallback-label">{{ item.label }}</text>
            </view>
          </view>
          <!-- #endif -->
        </view>

        <view class="rank-card">
          <view class="card-head">
            <text class="card-title">{{ typeLabel }}排行榜</text>
            <text class="card-sub">{{ categoryStats.length }} 个分类</text>
          </view>

          <view v-if="categoryStats.length > 0" class="rank-list">
            <view v-for="item in categoryStats" :key="item.categoryId" class="rank-row">
              <view class="rank-icon">
                <wd-icon :name="item.icon || 'star'" size="20px" color="#262626" />
              </view>
              <view class="rank-main">
                <view class="rank-line">
                  <view class="rank-name-wrap">
                    <text class="rank-name">{{ item.name }}</text>
                    <text class="rank-pct">{{ formatPercent(item.percent) }}</text>
                  </view>
                  <text class="rank-amount">¥{{ formatCents(item.totalCents) }}</text>
                </view>
                <view class="rank-bar">
                  <view class="rank-bar-inner" :style="{ width: rankBarWidth(item) }" />
                </view>
              </view>
            </view>
          </view>
          <view v-else class="card-empty">本期没有{{ typeLabel }}记录</view>
        </view>

        <view class="account-card">
          <view class="card-head">
            <text class="card-title">账户余额</text>
            <text class="section-link" @click="goAccounts">管理</text>
          </view>

          <view v-if="activeAccounts.length > 0">
            <view class="account-total">
              <text class="account-total-label">总余额</text>
              <text class="account-total-value">¥{{ formatCents(accountTotalCents) }}</text>
            </view>
            <view
              v-for="account in activeAccounts"
              :key="account.id"
              class="account-row"
              @click="goAccounts"
            >
              <view class="account-icon" :style="{ background: `${account.color}1a` }">
                <wd-icon
                  :name="account.icon || 'money-circle'"
                  size="18px"
                  :color="account.color"
                />
              </view>
              <view class="account-main">
                <text class="account-name">{{ account.name }}</text>
                <text class="account-meta">{{ account.recordCount }} 笔记录</text>
              </view>
              <text class="account-balance">¥{{ formatCents(account.balanceCents) }}</text>
            </view>
          </view>
          <view v-else class="card-empty">还没有账户</view>
        </view>
      </template>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from "vue"
import { onLoad, onPullDownRefresh, onShow } from "@dcloudio/uni-app"
import dayjs, { type Dayjs } from "dayjs"
import "dayjs/locale/zh-cn"
import {
  getAccountBalances,
  getCategoryStats,
  getDailyStats,
  getRangeStats,
  getRecordDateRange,
  isLocalDataMode,
  listRecordGroups,
} from "@/api/bookkeeping"
import type {
  AccountBalance,
  CategoryStat,
  DailyRecord,
  DailyRecordGroup,
  DailyStat,
  DateRange,
  RangeStats,
} from "@/api/bookkeeping"
import { formatCents } from "@/api/bookkeeping/money"

dayjs.locale("zh-cn")

type Period = "week" | "month" | "year"
type StatType = "income" | "expense"

interface TrendItem {
  key: string
  label: string
  amountCents: number
  count: number
  showLabel: boolean
}

interface DonutSlice {
  key: string
  name: string
  color: string
  totalCents: number
  percent: number
}

interface ChartPoint {
  x: number
  y: number
  item: TrendItem
  index: number
}

const CHART_W = 360
const CHART_H = 180
const CHART_PAD_X = 16
const CHART_PAD_TOP = 18
const CHART_PAD_BOTTOM = 24
const CHART_HIT_RADIUS = 24
const DONUT_TOP_COUNT = 5
const TOOLTIP_MAX_RECORDS = 3

const state = ref<"loading" | "ready" | "error">("loading")
const errorMessage = ref("")
const period = ref<Period>("year")
const anchor = ref(dayjs())
/** 数据库里最早一条记录的日期；年份 tab 和「上一期」都以它为起点 */
const earliestRecordDate = ref<string | null>(null)
const type = ref<StatType>("expense")
const typeMenuOpen = ref(false)
const rangeStats = ref<RangeStats>({
  incomeCents: 0,
  expenseCents: 0,
  netCents: 0,
  recordCount: 0,
})
const categoryStats = ref<CategoryStat[]>([])
const dailyStats = ref<DailyStat[]>([])
const accounts = ref<AccountBalance[]>([])
const recordGroups = ref<DailyRecordGroup[]>([])
const selectedIndex = ref<number | null>(null)
let requestSeq = 0
let loadedOnce = false

const typeOptions = [
  { value: "expense" as StatType, label: "支出" },
  { value: "income" as StatType, label: "收入" },
]

const periodOptions = [
  { value: "week" as Period, label: "周" },
  { value: "month" as Period, label: "月" },
  { value: "year" as Period, label: "年" },
]

function startOfWeek(value: Dayjs): Dayjs {
  const offset = (value.day() + 6) % 7
  return value.subtract(offset, "day").startOf("day")
}

const typeLabel = computed(() => (type.value === "expense" ? "支出" : "收入"))

const bucketTotalLabel = computed(() => {
  if (period.value === "year") return `当月总${typeLabel.value}`
  return `当日总${typeLabel.value}`
})

const range = computed<DateRange>(() => {
  const current = anchor.value
  if (period.value === "week") {
    const start = startOfWeek(current)
    return {
      start: start.format("YYYY-MM-DD"),
      end: start.add(6, "day").format("YYYY-MM-DD"),
    }
  }
  if (period.value === "year") {
    return {
      start: current.startOf("year").format("YYYY-MM-DD"),
      end: current.endOf("year").format("YYYY-MM-DD"),
    }
  }
  return {
    start: current.startOf("month").format("YYYY-MM-DD"),
    end: current.endOf("month").format("YYYY-MM-DD"),
  }
})

const rangeLabel = computed(() => {
  const start = dayjs(range.value.start)
  const end = dayjs(range.value.end)
  if (period.value === "year") return anchor.value.format("YYYY年")
  if (period.value === "month") return anchor.value.format("YYYY年M月")
  if (start.year() !== end.year()) {
    return `${start.format("YYYY.M.D")} - ${end.format("M.D")}`
  }
  return `${start.format("M月D日")} - ${end.format("M月D日")}`
})

const periodLabel = computed(() => rangeLabel.value)

const totalCents = computed(() =>
  type.value === "expense" ? rangeStats.value.expenseCents : rangeStats.value.incomeCents,
)

const typeRecordCount = computed(() =>
  categoryStats.value.reduce((sum, item) => sum + item.count, 0),
)

const latestDay = computed<Dayjs | null>(() => {
  let latest: Dayjs | null = null
  for (const stat of dailyStats.value) {
    const day = dayjs(stat.date).startOf("day")
    if (!latest || day.isAfter(latest, "day")) latest = day
  }
  return latest
})

const trendItems = computed<TrendItem[]>(() => {
  const current = dayjs()
  const today = current.startOf("day")
  const latest = latestDay.value
  const items: TrendItem[] = []

  if (period.value === "week") {
    const start = startOfWeek(anchor.value)
    const isCurrent = start.isSame(startOfWeek(current), "day")
    let last = isCurrent ? today : start.add(6, "day")
    if (
      isCurrent &&
      latest &&
      latest.isAfter(last, "day") &&
      latest.isBefore(start.add(7, "day"))
    ) {
      last = latest
    }
    for (let cursor = start; !cursor.isAfter(last, "day"); cursor = cursor.add(1, "day")) {
      items.push({
        key: cursor.format("YYYY-MM-DD"),
        label: cursor.format("M/D"),
        amountCents: 0,
        count: 0,
        showLabel: true,
      })
    }
  } else if (period.value === "month") {
    const monthStart = anchor.value.startOf("month")
    const isCurrent = monthStart.isSame(current.startOf("month"), "day")
    let last = isCurrent ? today : monthStart.endOf("month")
    if (isCurrent && latest && latest.isAfter(last, "day") && latest.isSame(monthStart, "month")) {
      last = latest
    }
    for (let day = 1; day <= last.date(); day += 1) {
      const date = monthStart.date(day)
      items.push({
        key: date.format("YYYY-MM-DD"),
        label: date.format("M/D"),
        amountCents: 0,
        count: 0,
        showLabel: [0, 4, 9, 14, 19, 24].includes(day - 1) || day === last.date(),
      })
    }
  } else {
    const yearStart = anchor.value.startOf("year")
    const isCurrent = yearStart.year() === current.year()
    let lastMonth = isCurrent ? current.month() : 11
    if (isCurrent && latest && latest.year() === yearStart.year() && latest.month() > lastMonth) {
      lastMonth = latest.month()
    }
    for (let month = 0; month <= lastMonth; month += 1) {
      const date = yearStart.month(month)
      items.push({
        key: date.format("YYYY-MM"),
        label: date.format("M月"),
        amountCents: 0,
        count: 0,
        showLabel: month % 2 === 0 || month === lastMonth,
      })
    }
  }

  const indexByKey = new Map(items.map((item, index) => [item.key, index]))
  for (const stat of dailyStats.value) {
    const key = period.value === "year" ? stat.date.slice(0, 7) : stat.date
    const index = indexByKey.get(key)
    if (index === undefined) continue
    items[index].amountCents += stat.amountCents
    items[index].count += stat.count
  }

  return items
})

const chartMax = computed(() => Math.max(1, ...trendItems.value.map((item) => item.amountCents)))

const averageCents = computed(() => {
  if (trendItems.value.length === 0) return 0
  return Math.round(totalCents.value / trendItems.value.length)
})

const donutSlices = computed<DonutSlice[]>(() => {
  const source = categoryStats.value
  if (source.length === 0) return []

  const head = source.slice(0, DONUT_TOP_COUNT)
  const rest = source.slice(DONUT_TOP_COUNT)
  const raw = head.map((item) => ({
    key: String(item.categoryId),
    name: item.name,
    color: item.color || "#ffd60a",
    totalCents: Math.abs(item.totalCents),
  }))

  if (rest.length > 0) {
    const restCents = rest.reduce((sum, item) => sum + Math.abs(item.totalCents), 0)
    if (restCents > 0) {
      raw.push({ key: "__other__", name: "其他", color: "#c7c7cc", totalCents: restCents })
    }
  }

  const grand = raw.reduce((sum, item) => sum + item.totalCents, 0)
  if (grand <= 0) return []

  return raw.map((item) => ({
    ...item,
    percent: (item.totalCents / grand) * 100,
  }))
})

const donutStyle = computed(() => {
  const slices = donutSlices.value
  if (slices.length === 0) return { background: "#f0f0f2" }

  let cursor = 0
  const stops: string[] = []
  for (const slice of slices) {
    const end = cursor + slice.percent
    const gap = slices.length > 1 ? Math.min(0.8, slice.percent * 0.18) : 0
    const solidEnd = Math.max(cursor, end - gap)
    stops.push(`${slice.color} ${cursor.toFixed(2)}% ${solidEnd.toFixed(2)}%`)
    stops.push(`#ffffff ${solidEnd.toFixed(2)}% ${end.toFixed(2)}%`)
    cursor = end
  }
  if (cursor < 99.99) {
    stops.push(`#ffffff ${cursor.toFixed(2)}% 100%`)
  }

  return {
    background: `conic-gradient(from -90deg, ${stops.join(", ")})`,
  }
})

const chartPoints = computed<ChartPoint[]>(() => {
  const items = trendItems.value
  const count = items.length
  if (count === 0) return []

  const baseline = CHART_H - CHART_PAD_BOTTOM
  const plotWidth = CHART_W - CHART_PAD_X * 2
  const plotHeight = baseline - CHART_PAD_TOP

  return items.map((item, index) => {
    const x = count === 1 ? CHART_W / 2 : CHART_PAD_X + (plotWidth * index) / (count - 1)
    const value = Math.max(0, item.amountCents)
    const y = baseline - (value / chartMax.value) * plotHeight
    return { x, y, item, index }
  })
})

const selectedBucket = computed<TrendItem | null>(() => {
  const index = selectedIndex.value
  if (index === null) return null
  return trendItems.value[index] ?? null
})

const selectedBucketTitle = computed(() => {
  const bucket = selectedBucket.value
  if (!bucket) return ""
  if (period.value === "year") return `${anchor.value.format("YYYY年")}${bucket.label}`
  return dayjs(bucket.key).format("M月D日")
})

const recordsByBucket = computed(() => {
  const map = new Map<string, DailyRecord[]>()
  for (const group of recordGroups.value) {
    for (const record of group.records) {
      const key = period.value === "year" ? record.recordDate.slice(0, 7) : record.recordDate
      const list = map.get(key)
      if (list) list.push(record)
      else map.set(key, [record])
    }
  }
  for (const list of map.values()) {
    list.sort((a, b) => Math.abs(recordCents(b)) - Math.abs(recordCents(a)))
  }
  return map
})

const selectedRecords = computed(() => {
  const bucket = selectedBucket.value
  if (!bucket) return []
  return (recordsByBucket.value.get(bucket.key) ?? []).slice(0, TOOLTIP_MAX_RECORDS)
})

const tooltipStyle = computed(() => {
  const index = selectedIndex.value
  if (index === null) return { display: "none" }
  const point = chartPoints.value[index]
  if (!point) return { display: "none" }
  const onLeftHalf = point.x / CHART_W < 0.5
  const highPoint = point.y <= CHART_H * 0.24
  return {
    left: onLeftHalf ? "68%" : "32%",
    top: highPoint ? "22%" : "2%",
  }
})

function escapeText(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

const chartSvg = computed(() => {
  const points = chartPoints.value
  if (points.length === 0) return ""

  const baseline = CHART_H - CHART_PAD_BOTTOM
  const linePoints = points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ")
  const areaPoints = `${CHART_PAD_X},${baseline} ${linePoints} ${(CHART_W - CHART_PAD_X).toFixed(1)},${baseline}`

  const gridLines = [0.25, 0.5, 0.75]
    .map((ratio) => {
      const y = CHART_PAD_TOP + (baseline - CHART_PAD_TOP) * ratio
      return `<line x1="${CHART_PAD_X}" y1="${y.toFixed(1)}" x2="${CHART_W - CHART_PAD_X}" y2="${y.toFixed(1)}" stroke="rgba(255,255,255,0.07)" stroke-width="1" />`
    })
    .join("")

  const labels = points
    .map((point) =>
      point.item.showLabel
        ? `<text x="${point.x.toFixed(1)}" y="${CHART_H - 6}" fill="rgba(255,255,255,0.48)" style="font-size:10px" text-anchor="middle">${escapeText(point.item.label)}</text>`
        : "",
    )
    .join("")

  const dots = points
    .map((point) => {
      if (point.index === selectedIndex.value) {
        return (
          `<circle cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="7" fill="rgba(255,214,10,0.2)" />` +
          `<circle cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="3.6" fill="#ffd60a" stroke="#141414" stroke-width="1.4" />`
        )
      }
      return `<circle cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="2" fill="#ffffff" />`
    })
    .join("")

  const plotHeight = baseline - CHART_PAD_TOP
  const averageY = baseline - (Math.max(0, averageCents.value) / chartMax.value) * plotHeight
  const averageLayer =
    averageCents.value > 0
      ? `<line x1="${CHART_PAD_X}" y1="${averageY.toFixed(1)}" x2="${CHART_W - CHART_PAD_X}" y2="${averageY.toFixed(1)}" stroke="rgba(255,255,255,0.42)" stroke-width="1" stroke-dasharray="4 5" />` +
        `<text x="${CHART_W - CHART_PAD_X}" y="${(averageY - 5).toFixed(1)}" fill="rgba(255,255,255,0.5)" style="font-size:9.5px" text-anchor="end">均值</text>`
      : ""

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CHART_W} ${CHART_H}" style="display:block;width:100%;height:auto">
    <defs>
      <linearGradient id="statsTrendFill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="rgba(255,255,255,0.16)" />
        <stop offset="1" stop-color="rgba(255,255,255,0)" />
      </linearGradient>
    </defs>
    ${gridLines}
    ${averageLayer}
    <polygon points="${areaPoints}" fill="url(#statsTrendFill)" />
    <polyline points="${linePoints}" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" />
    ${dots}
    ${labels}
  </svg>`
})

const earliestDate = computed(() => {
  const value = earliestRecordDate.value
  if (value) {
    const date = dayjs(value)
    if (date.isValid()) return date.startOf("day")
  }
  return anchor.value.startOf("year")
})

const earliestYear = computed(() => earliestDate.value.year())

const yearTabs = computed(() => {
  const first = Math.min(earliestYear.value, anchor.value.year())
  const last = Math.max(dayjs().year(), anchor.value.year())
  const years: number[] = []
  for (let year = first; year <= last; year += 1) years.push(year)
  return years
})

const activeYearAnchor = computed(() => `year-${anchor.value.year()}`)

const canGoPrev = computed(() => {
  const earliest = earliestDate.value
  if (period.value === "year") return anchor.value.year() > earliestYear.value
  if (period.value === "month") {
    return anchor.value.startOf("month").isAfter(earliest.startOf("month"))
  }
  return startOfWeek(anchor.value).isAfter(startOfWeek(earliest))
})

const canGoNext = computed(() => {
  const current = dayjs()
  if (period.value === "year") return anchor.value.year() < current.year()
  if (period.value === "month") {
    return anchor.value.startOf("month").isBefore(current.startOf("month"))
  }
  return startOfWeek(anchor.value).isBefore(startOfWeek(current))
})

const activeAccounts = computed(() => accounts.value.filter((account) => !account.archived))

const accountTotalCents = computed(() =>
  activeAccounts.value.reduce((sum, account) => sum + account.balanceCents, 0),
)

function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return "0%"
  const rounded = Math.round(value * 10) / 10
  return `${Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)}%`
}

function shortDate(date: string): string {
  return dayjs(date).format("MM.DD")
}

function recordLabel(record: DailyRecord): string {
  const remark = record.remark?.trim()
  if (remark) return remark
  const title = record.title?.trim()
  if (title && title !== record.category?.name) return title
  return "无备注"
}

function recordColor(record: DailyRecord): string {
  return record.category?.color || "#ffd60a"
}

function recordCents(record: DailyRecord): number {
  if (typeof record.amountCents === "number" && Number.isFinite(record.amountCents)) {
    return record.amountCents
  }
  const value = Number(record.amount ?? 0)
  return Number.isFinite(value) ? Math.round(value * 100) : 0
}

function fallbackHeight(cents: number): number {
  if (chartMax.value <= 0) return 0
  return Math.max(2, Math.round((Math.max(0, cents) / chartMax.value) * 100))
}

function rankBarWidth(item: CategoryStat): string {
  const top = Math.abs(categoryStats.value[0]?.totalCents ?? 0)
  if (top <= 0) return "0%"
  return `${Math.max(2, Math.round((Math.abs(item.totalCents) / top) * 100))}%`
}

function toast(title: string): void {
  uni.showToast({ title, icon: "none" })
}

function errorText(error: unknown): string {
  if (typeof error === "string" && error) return error
  if (error instanceof Error && error.message) return error.message
  const raw = error as { errMsg?: string; message?: string } | null
  return raw?.errMsg || raw?.message || "未知错误"
}

function restoreSelection(previousKey: string | null): void {
  if (!previousKey) {
    selectedIndex.value = null
    return
  }
  const index = trendItems.value.findIndex((item) => item.key === previousKey)
  selectedIndex.value = index >= 0 ? index : null
}

async function load(silent = false): Promise<void> {
  if (!isLocalDataMode) {
    state.value = "error"
    errorMessage.value = "当前为远程接口模式，统计页仅支持本地数据模式。"
    return
  }

  const seq = ++requestSeq
  if (!silent) state.value = "loading"
  errorMessage.value = ""
  const previousKey = selectedBucket.value?.key ?? null

  try {
    const [
      statsResponse,
      categoryResponse,
      dailyResponse,
      accountResponse,
      groupResponse,
      dateRangeResponse,
    ] = await Promise.all([
      getRangeStats(range.value),
      getCategoryStats(type.value, range.value),
      getDailyStats({ ...range.value, type: type.value }),
      getAccountBalances(),
      listRecordGroups({ ...range.value, type: type.value }),
      getRecordDateRange(),
    ])
    if (seq !== requestSeq) return

    earliestRecordDate.value = dateRangeResponse.data?.firstRecordDate ?? null
    rangeStats.value = statsResponse.data
    categoryStats.value = categoryResponse.data || []
    dailyStats.value = dailyResponse.data || []
    accounts.value = accountResponse.data || []
    recordGroups.value = groupResponse.data || []
    state.value = "ready"
    loadedOnce = true
    restoreSelection(previousKey)
  } catch (error) {
    if (seq !== requestSeq) return
    state.value = "error"
    console.error("[bookkeeping] 统计加载失败:", error)
    errorMessage.value = errorText(error)
  }
}

function toggleTypeMenu(): void {
  typeMenuOpen.value = !typeMenuOpen.value
}

function setType(nextType: StatType): void {
  typeMenuOpen.value = false
  if (type.value === nextType) return
  selectedIndex.value = null
  type.value = nextType
  load(true)
}

function setPeriod(nextPeriod: Period): void {
  if (period.value === nextPeriod) return
  selectedIndex.value = null
  period.value = nextPeriod
  load(true)
}

function selectYear(year: number): void {
  if (anchor.value.year() === year) return
  selectedIndex.value = null
  const current = dayjs()
  let next = anchor.value.year(year)
  if (next.isAfter(current, "day")) next = current
  anchor.value = next
  load(true)
}

function shiftPeriod(delta: number): void {
  if (delta < 0 && !canGoPrev.value) return
  if (delta > 0 && !canGoNext.value) return

  selectedIndex.value = null
  if (period.value === "week") {
    anchor.value = startOfWeek(anchor.value).add(delta * 7, "day")
  } else if (period.value === "month") {
    anchor.value = anchor.value.startOf("month").add(delta, "month")
  } else {
    anchor.value = anchor.value.startOf("year").add(delta, "year")
  }
  load(true)
}

function handleBack(): void {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack()
    return
  }
  uni.switchTab({ url: "/pages/BookKeeping/index" })
}

// #ifdef H5
/**
 * uni-app H5 会包装模板里的 click 事件：处理函数拿到的对象没有
 * clientX/clientY，detail.x/y 是「相对应用窗口」的坐标，已经扣掉了
 * --window-top。页面滚动后若把它当成页面坐标再减 scrollY，就会多算
 * 一个滚动距离，命中测试落到图表外（表现为点着点着就不显示了）。
 */
function getWindowTopOffset(): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--window-top")
  const top = Number((raw.match(/\d+(?:\.\d+)?/) || ["0"])[0]) || 0
  if (!top) return 0
  const probe = document.createElement("div")
  probe.style.cssText =
    "position:fixed;top:0;left:0;width:0;height:env(safe-area-inset-top);visibility:hidden;pointer-events:none"
  document.body.appendChild(probe)
  const inset = probe.getBoundingClientRect().height || 0
  probe.remove()
  return top + inset
}
// #endif

function handleChartClick(event: unknown): void {
  // #ifdef H5
  const items = trendItems.value
  if (items.length === 0) return

  const element = document.getElementById("trend-chart-plot")
  if (!element) return

  const native = event as MouseEvent & {
    detail?: { x?: number; y?: number }
    changedTouches?: Array<{ clientX?: number; clientY?: number }>
  }
  const touch = native.changedTouches?.[0]
  let viewportX: number
  let viewportY: number
  if (typeof native.clientX === "number" && typeof native.clientY === "number") {
    // 原生事件：clientX/clientY 已经是视口坐标
    viewportX = native.clientX
    viewportY = native.clientY
  } else if (native.detail?.x != null && native.detail?.y != null) {
    // uni 标准化事件：detail 相对应用窗口，补回窗口顶部偏移
    viewportX = native.detail.x
    viewportY = native.detail.y + getWindowTopOffset()
  } else if (touch?.clientX != null && touch?.clientY != null) {
    viewportX = touch.clientX
    viewportY = touch.clientY + getWindowTopOffset()
  } else {
    return
  }

  const rect = element.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) return

  const svgX = ((viewportX - rect.left) / rect.width) * CHART_W
  const svgY = ((viewportY - rect.top) / rect.height) * CHART_H

  let nearestIndex = -1
  let nearestDistance = Number.POSITIVE_INFINITY
  for (const point of chartPoints.value) {
    const distance = Math.hypot(point.x - svgX, point.y - svgY)
    if (distance < nearestDistance) {
      nearestDistance = distance
      nearestIndex = point.index
    }
  }

  selectedIndex.value = nearestDistance <= CHART_HIT_RADIUS ? nearestIndex : null
  // #endif
}

function goAccounts(): void {
  if (!isLocalDataMode) {
    toast("账户管理仅本地模式可用")
    return
  }
  uni.navigateTo({ url: "/pages/BookKeeping/accounts" })
}

onLoad((query) => {
  const month = query?.month ? String(query.month) : ""
  if (/^\d{4}-\d{2}$/.test(month)) {
    const target = dayjs(`${month}-01`)
    if (target.isValid() && !target.isAfter(dayjs(), "month")) {
      anchor.value = target
      period.value = "month"
    }
  }
  load(false)
})

onShow(() => {
  if (loadedOnce) load(true)
})

onPullDownRefresh(async () => {
  await load(true)
  uni.stopPullDownRefresh()
})
</script>

<style scoped lang="scss">
.stats-page {
  --st-yellow: #ffd60a;
  --st-yellow-deep: #ffc400;
  --st-yellow-soft: #fff6cc;
  --st-black: #141414;
  --st-text: #171717;
  --st-muted: #8b8b90;
  --st-line: #f0f0f2;
  min-height: 100vh;
  background: #f4f4f5;
}

.type-mask {
  position: fixed;
  inset: 0;
  z-index: 39;
  background: rgb(0 0 0 / 6%);
}

.stats-header {
  position: sticky;
  top: 0;
  z-index: 50;
  padding: calc(env(safe-area-inset-top) + 12rpx) 24rpx 22rpx;
  background: linear-gradient(180deg, #ffe23a 0%, var(--st-yellow) 100%);
}

.hd-bar {
  position: relative;
  display: flex;
  align-items: center;
  height: 84rpx;
}

.hd-side {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  width: 96rpx;
}

.hd-back {
  justify-content: flex-start;
}

.hd-title {
  display: flex;
  flex: 1;
  gap: 8rpx;
  align-items: center;
  justify-content: center;
}

.hd-title-text {
  font-size: 34rpx;
  font-weight: 700;
  color: var(--st-text);
  letter-spacing: 1rpx;
}

.hd-caret {
  display: flex;
  align-items: center;
  transition: transform 0.18s ease;
}

.hd-caret.open {
  transform: rotate(180deg);
}

.type-menu {
  position: absolute;
  top: calc(100% + 6rpx);
  left: 50%;
  z-index: 20;
  width: 240rpx;
  padding: 10rpx;
  background: #fff;
  border-radius: 22rpx;
  box-shadow: 0 18rpx 48rpx rgb(0 0 0 / 20%);
  transform: translateX(-50%);
}

.type-option {
  display: flex;
  gap: 8rpx;
  align-items: center;
  justify-content: center;
  height: 76rpx;
  font-size: 27rpx;
  color: #333;
  border-radius: 16rpx;
}

.type-option.active {
  font-weight: 600;
  color: #111;
  background: var(--st-yellow-soft);
}

.period-switch {
  display: flex;
  gap: 6rpx;
  padding: 6rpx;
  margin-top: 18rpx;
  background: rgb(255 255 255 / 36%);
  border-radius: 999rpx;
}

.period-item {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  height: 68rpx;
  font-size: 27rpx;
  font-weight: 500;
  color: #5c4d00;
  border-radius: 999rpx;
  transition:
    background 0.18s ease,
    color 0.18s ease;
}

.period-item.active {
  font-weight: 600;
  color: #fff;
  background: var(--st-black);
  box-shadow: 0 6rpx 16rpx rgb(0 0 0 / 16%);
}

.period-bar {
  background: #fff;
  border-bottom: 1rpx solid var(--st-line);
}

.year-tabs {
  width: 100%;
  height: 92rpx;
  white-space: nowrap;
}

.year-tabs-inner {
  display: inline-flex;
  align-items: center;
  height: 92rpx;
  padding: 0 14rpx;
}

.year-tab {
  position: relative;
  flex: none;
  height: 92rpx;
  padding: 0 18rpx;
  font-size: 27rpx;
  line-height: 92rpx;
  color: #9a9aa0;
}

.year-tab.active {
  font-weight: 700;
  color: #111;
}

.year-tab.active::after {
  position: absolute;
  bottom: 14rpx;
  left: 50%;
  width: 28rpx;
  height: 6rpx;
  content: "";
  background: var(--st-yellow);
  border-radius: 999rpx;
  transform: translateX(-50%);
}

.period-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 92rpx;
  padding: 0 26rpx;
}

.nav-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 60rpx;
  height: 60rpx;
  background: #f5f5f6;
  border-radius: 50%;
}

.nav-arrow.disabled {
  opacity: 0.25;
}

.period-label {
  font-size: 28rpx;
  font-weight: 600;
  color: var(--st-text);
}

.stats-body {
  padding: 24rpx 24rpx calc(48rpx + env(safe-area-inset-bottom));
}

.stats-state {
  padding-top: 90rpx;
}

.overview-card,
.summary-card,
.rank-card,
.account-card {
  background: #fff;
  border-radius: 28rpx;
  box-shadow: 0 4rpx 18rpx rgb(0 0 0 / 4%);
}

.overview-card {
  padding: 30rpx 26rpx;
}

.summary-card {
  padding: 26rpx 30rpx;
  margin-top: 20rpx;
}

.rank-card,
.account-card {
  padding: 28rpx;
  margin-top: 20rpx;
}

.donut-row {
  display: flex;
  gap: 26rpx;
  align-items: center;
}

.donut {
  position: relative;
  flex: none;
  width: 236rpx;
  height: 236rpx;
  background: #f0f0f2;
  border-radius: 50%;
}

.donut-hole {
  position: absolute;
  inset: 17%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0 8rpx;
  text-align: center;
  background: #fff;
  border-radius: 50%;
}

.donut-label {
  font-size: 19rpx;
  color: var(--st-muted);
}

.donut-value {
  max-width: 100%;
  margin-top: 4rpx;
  overflow: hidden;
  font-size: 25rpx;
  font-weight: 700;
  color: var(--st-text);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.legend {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 12rpx;
  min-width: 0;
}

.legend-row {
  display: flex;
  gap: 10rpx;
  align-items: center;
  font-size: 22rpx;
}

.legend-dot {
  flex: none;
  width: 13rpx;
  height: 13rpx;
  border-radius: 50%;
}

.legend-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  color: #555;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.legend-pct {
  flex: none;
  font-size: 21rpx;
  font-weight: 500;
  color: var(--st-text);
  font-variant-numeric: tabular-nums;
}

.legend-empty {
  font-size: 22rpx;
  color: var(--st-muted);
}

.summary-grid {
  display: flex;
  align-items: stretch;
}

.summary-item {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.summary-divider {
  width: 1rpx;
  margin: 4rpx 28rpx;
  background: var(--st-line);
}

.summary-label {
  font-size: 21rpx;
  color: var(--st-muted);
}

.summary-value {
  margin-top: 8rpx;
  overflow: hidden;
  font-size: 34rpx;
  font-weight: 700;
  color: var(--st-text);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.summary-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 18rpx;
  margin-top: 18rpx;
  font-size: 20rpx;
  color: #a0a0a6;
  border-top: 1rpx solid var(--st-line);
}

.chart-card {
  position: relative;
  padding: 26rpx 20rpx 14rpx;
  margin-top: 20rpx;
  background: linear-gradient(160deg, #1d1d1f 0%, #0d0d0e 100%);
  border-radius: 30rpx;
  box-shadow: 0 16rpx 36rpx rgb(20 20 20 / 18%);
}

.chart-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: 0 8rpx 10rpx;
}

.chart-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #fff;
}

.chart-sub {
  font-size: 20rpx;
  color: rgb(255 255 255 / 45%);
}

.trend-chart {
  position: relative;
  margin: 0 4rpx;
}

.trend-svg {
  width: 100%;
  line-height: 0;
}

.chart-tooltip {
  position: absolute;
  z-index: 6;
  width: 336rpx;
  padding: 18rpx 20rpx 16rpx;
  pointer-events: none;
  background: #fff;
  border-radius: 20rpx;
  box-shadow: 0 18rpx 44rpx rgb(0 0 0 / 30%);
  transform: translateX(-50%);
  transition:
    left 0.16s ease,
    top 0.16s ease;
}

.tip-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 10rpx;
  border-bottom: 1rpx solid var(--st-line);
}

.tip-title {
  font-size: 21rpx;
  font-weight: 600;
  color: var(--st-text);
}

.tip-date {
  font-size: 19rpx;
  color: #9a9aa0;
}

.tip-row {
  display: flex;
  gap: 8rpx;
  align-items: center;
  margin-top: 10rpx;
  font-size: 20rpx;
}

.tip-date-col {
  flex: none;
  width: 62rpx;
  color: #a0a0a6;
  font-variant-numeric: tabular-nums;
}

.tip-dot {
  flex: none;
  width: 10rpx;
  height: 10rpx;
  border-radius: 50%;
}

.tip-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  color: #333;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tip-amount {
  flex: none;
  font-weight: 600;
  color: var(--st-text);
  font-variant-numeric: tabular-nums;
}

.tip-empty {
  margin-top: 12rpx;
  font-size: 20rpx;
  color: #a0a0a6;
  text-align: center;
}

.tip-total {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 12rpx;
  margin-top: 12rpx;
  font-size: 20rpx;
  color: #6b6b70;
  border-top: 1rpx solid var(--st-line);
}

.tip-total-value {
  font-weight: 700;
  color: var(--st-text);
  font-variant-numeric: tabular-nums;
}

.trend-fallback {
  display: flex;
  gap: 4rpx;
  align-items: flex-end;
  height: 280rpx;
  padding: 20rpx 8rpx 0;
}

.fallback-col {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  height: 100%;
}

.fallback-bar {
  width: 100%;
  max-width: 20rpx;
  background: rgb(255 255 255 / 55%);
  border-radius: 6rpx 6rpx 2rpx 2rpx;
}

.fallback-bar.active {
  background: var(--st-yellow);
}

.fallback-label {
  height: 26rpx;
  margin-top: 8rpx;
  font-size: 16rpx;
  color: rgb(255 255 255 / 45%);
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}

.card-title {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--st-text);
}

.card-sub {
  font-size: 21rpx;
  color: #a0a0a6;
}

.rank-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.rank-row {
  display: flex;
  gap: 18rpx;
  align-items: center;
}

.rank-icon {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 76rpx;
  height: 76rpx;
  background: #f4f4f6;
  border-radius: 50%;
}

.rank-main {
  flex: 1;
  min-width: 0;
}

.rank-line {
  display: flex;
  gap: 16rpx;
  align-items: baseline;
  justify-content: space-between;
}

.rank-name-wrap {
  display: flex;
  flex: 1;
  gap: 10rpx;
  align-items: baseline;
  min-width: 0;
}

.rank-name {
  overflow: hidden;
  font-size: 27rpx;
  font-weight: 500;
  color: var(--st-text);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rank-pct {
  flex: none;
  font-size: 20rpx;
  color: #a0a0a6;
  font-variant-numeric: tabular-nums;
}

.rank-amount {
  flex: none;
  font-size: 24rpx;
  font-weight: 600;
  color: var(--st-text);
  font-variant-numeric: tabular-nums;
}

.rank-bar {
  height: 10rpx;
  margin-top: 12rpx;
  overflow: hidden;
  background: #f2f2f4;
  border-radius: 999rpx;
}

.rank-bar-inner {
  height: 100%;
  background: var(--st-yellow);
  border-radius: 999rpx;
  transition: width 0.24s ease;
}

.section-link {
  font-size: 23rpx;
  color: #8a6d00;
}

.account-total {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18rpx 22rpx;
  margin-bottom: 8rpx;
  background: var(--st-yellow-soft);
  border-radius: 16rpx;
}

.account-total-label {
  font-size: 23rpx;
  color: #7a6a1a;
}

.account-total-value {
  font-size: 30rpx;
  font-weight: 700;
  color: var(--st-text);
}

.account-row {
  display: flex;
  align-items: center;
  padding: 16rpx 4rpx;
  border-bottom: 1rpx solid #f4f4f6;
}

.account-row:last-child {
  border-bottom: none;
}

.account-icon {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
}

.account-main {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  margin: 0 16rpx;
}

.account-name {
  overflow: hidden;
  font-size: 27rpx;
  color: var(--st-text);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.account-meta {
  margin-top: 4rpx;
  font-size: 20rpx;
  color: #a0a0a6;
}

.account-balance {
  flex: none;
  font-size: 27rpx;
  font-weight: 600;
  color: var(--st-text);
  font-variant-numeric: tabular-nums;
}

.card-empty {
  padding: 26rpx 0;
  font-size: 23rpx;
  color: #a0a0a6;
  text-align: center;
}
</style>
