<!--
 * 统计页：时间范围 + 收入/支出切换 + 分类排行 + 趋势 + 账户余额。
 * 数据全部来自本地 SQLite v2（整数分），不含任何模拟数据。
-->
<route lang="json5" type="page">
{
  layout: "default",
  style: {
    navigationBarTitleText: "统计",
    navigationBarBackgroundColor: "#FFFFFF",
    enablePullDownRefresh: true,
  },
}
</route>

<template>
  <view class="stats-page">
    <app-navbar title="统计" />

    <view class="stats-body">
      <view class="range-chips">
        <view
          v-for="chip in rangeChips"
          :key="chip.value"
          class="range-chip"
          :class="{ active: rangeMode === chip.value }"
          @click="setRangeMode(chip.value)"
        >
          {{ chip.label }}
        </view>
      </view>

      <view class="type-switch">
        <view class="type-item" :class="{ active: type === 'expense' }" @click="setType('expense')">
          支出
        </view>
        <view class="type-item" :class="{ active: type === 'income' }" @click="setType('income')">
          收入
        </view>
      </view>

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
        title="这段时间还没有记录"
        description="换个时间范围看看，或先去记一笔。"
      />

      <template v-else>
        <view class="total-card" :class="type">
          <text class="total-label">{{ type === "expense" ? "支出合计" : "收入合计" }}</text>
          <text class="total-value bk-amount">¥{{ formatCents(totalCents) }}</text>
          <view class="total-meta">
            <text>{{ rangeLabel }}</text>
            <text>{{ rangeStats.recordCount }} 笔记录</text>
          </view>
          <view class="total-net">
            <text>本期结余</text>
            <text class="bk-amount">¥{{ formatCents(rangeStats.netCents, { sign: true }) }}</text>
          </view>
        </view>

        <view class="bk-card stats-card">
          <view class="card-head">
            <text class="card-title">{{ type === "expense" ? "支出" : "收入" }}分类排行</text>
            <text v-if="categoryStats.length > 0" class="card-sub">
              共 {{ categoryStats.length }} 个分类
            </text>
          </view>

          <view v-if="categoryStats.length > 0" class="rank-list">
            <view v-for="item in categoryStats" :key="item.categoryId" class="rank-row">
              <view class="rank-icon" :style="{ background: `${item.color}1a` }">
                <wd-icon :name="item.icon || 'star'" size="20px" :color="item.color" />
              </view>
              <view class="rank-main">
                <view class="rank-head">
                  <text class="rank-name">{{ item.name }}</text>
                  <text class="rank-amount bk-amount">¥{{ formatCents(item.totalCents) }}</text>
                </view>
                <view class="rank-bar">
                  <view
                    class="rank-bar-inner"
                    :style="{ width: `${item.percent}%`, background: item.color || '#ffc000' }"
                  />
                </view>
                <view class="rank-meta">
                  <text>{{ item.count }} 笔</text>
                  <text>{{ item.percent.toFixed(1) }}%</text>
                </view>
              </view>
            </view>
          </view>
          <view v-else class="card-empty">
            本期没有{{ type === "expense" ? "支出" : "收入" }}记录
          </view>
        </view>

        <view class="bk-card stats-card">
          <view class="card-head">
            <text class="card-title">趋势</text>
            <text class="card-sub">{{ trendLabel }}</text>
          </view>

          <view v-if="trendItems.some((item) => item.amountCents > 0)" class="trend-chart">
            <view class="trend-bars">
              <view v-for="item in trendItems" :key="item.key" class="trend-col">
                <view class="trend-bar-wrap">
                  <view
                    class="trend-bar"
                    :class="type"
                    :style="{ height: `${barHeight(item.amountCents)}rpx` }"
                  />
                </view>
                <text class="trend-label">{{ item.showLabel ? item.label : "" }}</text>
              </view>
            </view>
          </view>
          <view v-else class="card-empty">
            本期没有{{ type === "expense" ? "支出" : "收入" }}记录
          </view>
        </view>

        <view class="bk-card stats-card">
          <view class="card-head">
            <text class="card-title">账户余额</text>
            <text class="section-link" @click="goAccounts">管理</text>
          </view>

          <view v-if="activeAccounts.length > 0">
            <view class="account-total">
              <text class="account-total-label">总余额</text>
              <text class="account-total-value bk-amount">
                ¥{{ formatCents(accountTotalCents) }}
              </text>
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
              <text class="account-balance bk-amount">
                ¥{{ formatCents(account.balanceCents) }}
              </text>
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
import dayjs from "dayjs"
import "dayjs/locale/zh-cn"
import {
  getAccountBalances,
  getCategoryStats,
  getDailyStats,
  getRangeStats,
  isLocalDataMode,
} from "@/api/bookkeeping"
import type {
  AccountBalance,
  CategoryStat,
  DailyStat,
  DateRange,
  RangeStats,
} from "@/api/bookkeeping"
import { formatCents } from "@/api/bookkeeping/money"

dayjs.locale("zh-cn")

type RangeMode = "month" | "lastMonth" | "last3" | "year"
type StatType = "income" | "expense"

interface TrendItem {
  key: string
  label: string
  amountCents: number
  showLabel: boolean
}

const state = ref<"loading" | "ready" | "error">("loading")
const errorMessage = ref("")
const rangeMode = ref<RangeMode>("month")
const anchorMonth = ref(dayjs().format("YYYY-MM"))
const type = ref<StatType>("expense")
const rangeStats = ref<RangeStats>({
  incomeCents: 0,
  expenseCents: 0,
  netCents: 0,
  recordCount: 0,
})
const categoryStats = ref<CategoryStat[]>([])
const dailyStats = ref<DailyStat[]>([])
const accounts = ref<AccountBalance[]>([])
let requestSeq = 0
let loadedOnce = false

const currentMonth = dayjs().format("YYYY-MM")

const anchorDate = computed(() => dayjs(`${anchorMonth.value}-01`))

const rangeChips = computed(() => {
  const anchorYear = anchorDate.value.year()
  return [
    {
      value: "month" as RangeMode,
      label: anchorMonth.value === currentMonth ? "本月" : anchorDate.value.format("M月"),
    },
    { value: "lastMonth" as RangeMode, label: "上月" },
    { value: "last3" as RangeMode, label: "近3个月" },
    {
      value: "year" as RangeMode,
      label: anchorYear === dayjs().year() ? "今年" : `${anchorYear}年`,
    },
  ]
})

const range = computed<DateRange>(() => {
  const anchor = anchorDate.value
  if (rangeMode.value === "lastMonth") {
    const target = anchor.subtract(1, "month")
    return {
      start: target.startOf("month").format("YYYY-MM-DD"),
      end: target.endOf("month").format("YYYY-MM-DD"),
    }
  }
  if (rangeMode.value === "last3") {
    return {
      start: anchor.subtract(2, "month").startOf("month").format("YYYY-MM-DD"),
      end: anchor.endOf("month").format("YYYY-MM-DD"),
    }
  }
  if (rangeMode.value === "year") {
    return {
      start: anchor.startOf("year").format("YYYY-MM-DD"),
      end: anchor.endOf("month").format("YYYY-MM-DD"),
    }
  }
  return {
    start: anchor.startOf("month").format("YYYY-MM-DD"),
    end: anchor.endOf("month").format("YYYY-MM-DD"),
  }
})

const rangeLabel = computed(() => {
  const start = dayjs(range.value.start)
  const end = dayjs(range.value.end)
  return `${start.format("YYYY.MM.DD")} - ${end.format("YYYY.MM.DD")}`
})

const totalCents = computed(() =>
  type.value === "expense" ? rangeStats.value.expenseCents : rangeStats.value.incomeCents,
)

const trendLabel = computed(() => {
  const days = dayjs(range.value.end).diff(dayjs(range.value.start), "day") + 1
  if (days <= 31) return "按日"
  if (days <= 120) return "按周"
  return "按月"
})

const trendItems = computed<TrendItem[]>(() => {
  const start = dayjs(range.value.start)
  const end = dayjs(range.value.end)
  const days = end.diff(start, "day") + 1
  const granularity = days <= 31 ? "day" : days <= 120 ? "week" : "month"

  const buckets = new Map<string, { label: string; amountCents: number }>()
  if (granularity === "day") {
    for (let cursor = start; !cursor.isAfter(end, "day"); cursor = cursor.add(1, "day")) {
      buckets.set(cursor.format("YYYY-MM-DD"), {
        label: cursor.format("M/D"),
        amountCents: 0,
      })
    }
  } else if (granularity === "week") {
    for (
      let cursor = start.startOf("week");
      !cursor.isAfter(end, "day");
      cursor = cursor.add(1, "week")
    ) {
      buckets.set(cursor.format("YYYY-MM-DD"), {
        label: cursor.format("M/D"),
        amountCents: 0,
      })
    }
  } else {
    for (
      let cursor = start.startOf("month");
      !cursor.isAfter(end, "month");
      cursor = cursor.add(1, "month")
    ) {
      buckets.set(cursor.format("YYYY-MM"), {
        label: cursor.format("M月"),
        amountCents: 0,
      })
    }
  }

  for (const stat of dailyStats.value) {
    const date = dayjs(stat.date)
    const key =
      granularity === "day"
        ? date.format("YYYY-MM-DD")
        : granularity === "week"
          ? date.startOf("week").format("YYYY-MM-DD")
          : date.format("YYYY-MM")
    const bucket = buckets.get(key)
    if (bucket) bucket.amountCents += stat.amountCents
  }

  const items = Array.from(buckets.entries()).map(([key, value]) => ({ key, ...value }))
  const step = Math.max(1, Math.ceil(items.length / 6))
  return items.map((item, index) => ({
    ...item,
    showLabel: index % step === 0 || index === items.length - 1,
  }))
})

const trendMax = computed(() =>
  trendItems.value.reduce((max, item) => Math.max(max, item.amountCents), 0),
)

const activeAccounts = computed(() => accounts.value.filter((account) => !account.archived))

const accountTotalCents = computed(() =>
  activeAccounts.value.reduce((sum, account) => sum + account.balanceCents, 0),
)

function barHeight(cents: number): number {
  if (cents <= 0 || trendMax.value <= 0) return 4
  return Math.max(4, Math.round((cents / trendMax.value) * 120))
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

async function load(silent = false): Promise<void> {
  if (!isLocalDataMode) {
    state.value = "error"
    errorMessage.value = "当前为远程接口模式，统计页仅支持本地数据模式。"
    return
  }

  const seq = ++requestSeq
  if (!silent) state.value = "loading"
  errorMessage.value = ""

  try {
    const [statsResponse, categoryResponse, dailyResponse, accountResponse] = await Promise.all([
      getRangeStats(range.value),
      getCategoryStats(type.value, range.value),
      getDailyStats({ ...range.value, type: type.value }),
      getAccountBalances(),
    ])
    if (seq !== requestSeq) return

    rangeStats.value = statsResponse.data
    categoryStats.value = categoryResponse.data || []
    dailyStats.value = dailyResponse.data || []
    accounts.value = accountResponse.data || []
    state.value = "ready"
    loadedOnce = true
  } catch (error) {
    if (seq !== requestSeq) return
    state.value = "error"
    console.error("[bookkeeping] 统计加载失败:", error)
    errorMessage.value = errorText(error)
  }
}

function setRangeMode(mode: RangeMode): void {
  if (rangeMode.value === mode) return
  rangeMode.value = mode
  load(false)
}

function setType(nextType: StatType): void {
  if (type.value === nextType) return
  type.value = nextType
  load(false)
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
    anchorMonth.value = month
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
  min-height: 100vh;
  background: var(--bk-bg);
}

.stats-body {
  padding: 24rpx 24rpx calc(48rpx + env(safe-area-inset-bottom));
}

.range-chips {
  display: flex;
  gap: 14rpx;
}

.range-chip {
  flex: 1;
  padding: 16rpx 0;
  font-size: 24rpx;
  color: var(--bk-text-secondary);
  text-align: center;
  background: #fff;
  border-radius: 999rpx;
}

.range-chip.active {
  font-weight: 600;
  color: var(--bk-primary-dark);
  background: #fff7e0;
  box-shadow: inset 0 0 0 1rpx #ffd666;
}

.type-switch {
  display: flex;
  padding: 6rpx;
  margin-top: 20rpx;
  background: #eef0f2;
  border-radius: 999rpx;
}

.type-item {
  flex: 1;
  padding: 14rpx 0;
  font-size: 26rpx;
  color: var(--bk-text-secondary);
  text-align: center;
  border-radius: 999rpx;
}

.type-item.active {
  font-weight: 600;
  color: var(--bk-text);
  background: #fff;
  box-shadow: 0 2rpx 8rpx rgb(31 35 41 / 8%);
}

.stats-state {
  padding-top: 120rpx;
}

.total-card {
  padding: 32rpx;
  margin-top: 24rpx;
  color: #fff;
  border-radius: 28rpx;
  box-shadow: 0 12rpx 30rpx rgb(31 35 41 / 12%);
}

.total-card.expense {
  background: linear-gradient(135deg, #ffb347, #f2994a);
}

.total-card.income {
  background: linear-gradient(135deg, #5b9cf5, #2f80ed);
}

.total-label {
  font-size: 26rpx;
  opacity: 0.92;
}

.total-value {
  display: block;
  margin: 14rpx 0 20rpx;
  font-size: 60rpx;
  font-weight: 700;
  letter-spacing: 1rpx;
}

.total-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 22rpx;
  opacity: 0.88;
}

.total-net {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 20rpx;
  margin-top: 20rpx;
  font-size: 26rpx;
  border-top: 1rpx solid rgb(255 255 255 / 24%);
}

.stats-card {
  padding: 28rpx;
  margin-top: 24rpx;
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 22rpx;
}

.card-title {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--bk-text);
}

.card-sub {
  font-size: 22rpx;
  color: var(--bk-text-tertiary);
}

.section-link {
  font-size: 24rpx;
  color: var(--bk-primary-dark);
}

.card-empty {
  padding: 28rpx 0;
  font-size: 24rpx;
  color: var(--bk-text-tertiary);
  text-align: center;
}

.rank-row {
  display: flex;
  align-items: flex-start;
  padding: 16rpx 0;
}

.rank-icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 68rpx;
  height: 68rpx;
  border-radius: 20rpx;
}

.rank-main {
  flex: 1;
  min-width: 0;
  margin-left: 18rpx;
}

.rank-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.rank-name {
  overflow: hidden;
  font-size: 28rpx;
  font-weight: 500;
  color: var(--bk-text);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rank-amount {
  flex-shrink: 0;
  margin-left: 16rpx;
  font-size: 26rpx;
  font-weight: 600;
  color: var(--bk-text);
}

.rank-bar {
  height: 10rpx;
  margin-top: 12rpx;
  overflow: hidden;
  background: #f2f3f5;
  border-radius: 999rpx;
}

.rank-bar-inner {
  min-width: 4rpx;
  height: 100%;
  border-radius: 999rpx;
  transition: width 0.2s ease;
}

.rank-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8rpx;
  font-size: 20rpx;
  color: var(--bk-text-tertiary);
}

.trend-chart {
  padding-top: 8rpx;
  overflow-x: auto;
}

.trend-bars {
  display: flex;
  gap: 4rpx;
  align-items: flex-end;
  min-width: 100%;
  height: 180rpx;
}

.trend-col {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  min-width: 8rpx;
  height: 100%;
}

.trend-bar-wrap {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  width: 100%;
  height: 140rpx;
}

.trend-bar {
  width: 100%;
  max-width: 24rpx;
  border-radius: 6rpx 6rpx 2rpx 2rpx;
  transition: height 0.2s ease;
}

.trend-bar.expense {
  background: linear-gradient(180deg, #ffc36b, #f2994a);
}

.trend-bar.income {
  background: linear-gradient(180deg, #7cb2f8, #2f80ed);
}

.trend-label {
  width: 48rpx;
  height: 32rpx;
  margin-top: 8rpx;
  overflow: visible;
  font-size: 18rpx;
  color: var(--bk-text-tertiary);
  text-align: center;
  white-space: nowrap;
}

.account-total {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18rpx 22rpx;
  margin-bottom: 8rpx;
  background: #fafafa;
  border-radius: 16rpx;
}

.account-total-label {
  font-size: 24rpx;
  color: var(--bk-text-secondary);
}

.account-total-value {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--bk-text);
}

.account-row {
  display: flex;
  align-items: center;
  padding: 16rpx 4rpx;
  border-bottom: 1rpx solid #f2f3f5;
}

.account-row:last-child {
  border-bottom: none;
}

.account-icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 64rpx;
  height: 64rpx;
  border-radius: 18rpx;
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
  font-size: 28rpx;
  color: var(--bk-text);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.account-meta {
  margin-top: 4rpx;
  font-size: 20rpx;
  color: var(--bk-text-tertiary);
}

.account-balance {
  flex-shrink: 0;
  font-size: 28rpx;
  font-weight: 600;
  color: var(--bk-text);
}
</style>
