<!--
 * 记账日历：按月展示每天的收支，支出超过日均预算标红、未超标标绿。
 * 点击某一天，下方展示当天明细。
-->
<route lang="json5" type="page">
{
  layout: "default",
  style: {
    navigationBarTitleText: "日历",
    navigationBarBackgroundColor: "#FFFFFF",
  },
}
</route>

<template>
  <view class="calendar-page">
    <app-navbar title="日历" />

    <view class="month-bar">
      <view class="month-arrow" @click="shiftMonth(-1)">
        <wd-icon name="chevron-left" size="18px" color="#646a73" />
      </view>
      <picker mode="date" fields="month" :value="month" @change="handleMonthPick">
        <view class="month-label">
          <text>{{ monthLabel }}</text>
          <wd-icon name="chevron-down" size="13px" color="#8f959e" />
        </view>
      </picker>
      <view class="month-arrow" @click="shiftMonth(1)">
        <wd-icon name="chevron-right" size="18px" color="#646a73" />
      </view>
    </view>

    <view class="summary-card">
      <view class="summary-item">
        <text class="summary-label">本月收入</text>
        <text class="summary-value bk-amount">¥{{ formatCents(monthIncomeCents) }}</text>
      </view>
      <view class="summary-divider" />
      <view class="summary-item">
        <text class="summary-label">本月支出</text>
        <text class="summary-value bk-amount">¥{{ formatCents(monthExpenseCents) }}</text>
      </view>
    </view>

    <view class="calendar-card">
      <view class="week-head">
        <text v-for="week in weekDays" :key="week" class="week-cell">{{ week }}</text>
      </view>

      <view v-if="state === 'loading'" class="calendar-loading">
        <text>加载中…</text>
      </view>

      <page-state
        v-else-if="state === 'error'"
        state="error"
        :description="errorMessage"
        @retry="loadMonth"
      />

      <view v-else class="day-grid">
        <view v-for="blank in leadingBlanks" :key="`blank-${blank}`" class="day-cell is-blank" />

        <view
          v-for="day in dayList"
          :key="day.date"
          class="day-cell"
          :class="{
            selected: day.date === selectedDate,
            today: day.date === today,
            future: day.future,
          }"
          @click="selectDay(day)"
        >
          <text class="day-number">{{ day.day }}</text>
          <text v-if="day.expenseCents > 0" class="day-amount" :class="day.expenseClass">
            {{ dayAmountText(day.expenseCents) }}
          </text>
          <text v-if="day.incomeCents > 0" class="day-income">
            +{{ dayAmountText(day.incomeCents) }}
          </text>
        </view>
      </view>

      <view class="budget-row" @click="openBudgetEditor">
        <text class="budget-label">日均预算</text>
        <text class="budget-value bk-amount">{{ dailyBudgetText }}</text>
        <wd-icon name="edit-1" size="14px" color="#8f959e" />
      </view>
    </view>

    <view class="detail-section">
      <view class="detail-head">
        <text class="detail-date">{{ selectedDateText }}</text>
        <text class="detail-total bk-amount">{{ selectedDayTotalText }}</text>
      </view>

      <page-state v-if="detailState === 'loading'" state="loading" />

      <page-state
        v-else-if="detailState === 'error'"
        state="error"
        :description="errorMessage"
        @retry="loadSelectedDay"
      />

      <view v-else-if="dayGroups.length === 0" class="detail-empty">当天没有记录</view>

      <view v-else class="day-records">
        <view
          v-for="record in dayGroups[0].records"
          :key="record.id"
          class="record-row"
          @click="openRecord(record)"
        >
          <view class="record-icon" :style="{ background: `${record.category.color}1a` }">
            <wd-icon
              :name="record.category.icon || 'star'"
              size="20px"
              :color="record.category.color"
            />
          </view>
          <view class="record-main">
            <text class="record-title">{{ record.remark || record.category.name }}</text>
            <text v-if="record.remark" class="record-meta">{{ record.category.name }}</text>
          </view>
          <text class="record-amount bk-amount" :class="record.type">
            {{ formatRecordAmount(recordCents(record), record.type) }}
          </text>
        </view>
      </view>
    </view>

    <wd-popup v-model="budgetVisible" position="center" round :z-index="9999">
      <view class="budget-editor">
        <text class="budget-title">设置月度预算</text>
        <text class="budget-tip">日均预算 = 月预算 ÷ 当月天数</text>
        <view class="budget-input-row">
          <text class="budget-currency">¥</text>
          <input
            v-model="budgetDraft"
            class="budget-input"
            type="digit"
            placeholder="例如 5000"
            :focus="budgetVisible"
          />
        </view>
        <view class="budget-actions">
          <view class="budget-btn cancel" @click="budgetVisible = false">取消</view>
          <view class="budget-btn save" @click="saveBudget">保存</view>
        </view>
      </view>
    </wd-popup>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from "vue"
import { onLoad, onShow } from "@dcloudio/uni-app"
import dayjs from "dayjs"
import "dayjs/locale/zh-cn"
import { getCalendarMonth, listRecordGroups } from "@/api/bookkeeping"
import type { CalendarDayStat, DailyRecord, DailyRecordGroup } from "@/api/bookkeeping"
import { formatCents, formatRecordAmount } from "@/api/bookkeeping/money"

dayjs.locale("zh-cn")

const BUDGET_KEY = "bk:monthly-budget"
const DEFAULT_MONTHLY_BUDGET = 5000

type PageState = "loading" | "ready" | "error"

const today = dayjs().format("YYYY-MM-DD")
const weekDays = ["一", "二", "三", "四", "五", "六", "日"]

const month = ref(dayjs().format("YYYY-MM"))
const stats = ref<CalendarDayStat[]>([])
const state = ref<PageState>("loading")
const selectedDate = ref(today)
const dayGroups = ref<DailyRecordGroup[]>([])
const detailState = ref<PageState>("ready")
const errorMessage = ref("")
const budgetVisible = ref(false)
const budgetDraft = ref("")
const monthlyBudgetCents = ref(DEFAULT_MONTHLY_BUDGET * 100)

let loadedMonth = ""
let requestSeq = 0

const monthLabel = computed(() => dayjs(`${month.value}-01`).format("YYYY年M月"))
const daysInMonth = computed(() => dayjs(`${month.value}-01`).daysInMonth())

const statMap = computed(() => {
  const map = new Map<string, CalendarDayStat>()
  for (const item of stats.value) map.set(item.date, item)
  return map
})

const leadingBlanks = computed(() => {
  const first = dayjs(`${month.value}-01`)
  return (first.day() + 6) % 7
})

const dayList = computed(() => {
  const list: Array<{
    date: string
    day: number
    incomeCents: number
    expenseCents: number
    future: boolean
    expenseClass: string
  }> = []
  for (let index = 1; index <= daysInMonth.value; index += 1) {
    const date = dayjs(`${month.value}-01`).date(index).format("YYYY-MM-DD")
    const stat = statMap.value.get(date)
    const expenseCents = stat?.expenseCents ?? 0
    list.push({
      date,
      day: index,
      incomeCents: stat?.incomeCents ?? 0,
      expenseCents,
      future: date > today,
      expenseClass:
        expenseCents === 0 ? "" : expenseCents > dailyBudgetCents.value ? "over" : "under",
    })
  }
  return list
})

const monthIncomeCents = computed(() =>
  stats.value.reduce((sum, item) => sum + item.incomeCents, 0),
)
const monthExpenseCents = computed(() =>
  stats.value.reduce((sum, item) => sum + item.expenseCents, 0),
)

const dailyBudgetCents = computed(() => Math.round(monthlyBudgetCents.value / daysInMonth.value))
const dailyBudgetText = computed(() => formatCents(dailyBudgetCents.value, { grouping: false }))

const selectedDateText = computed(() =>
  selectedDate.value ? dayjs(selectedDate.value).format("M月D日 dddd") : "",
)

const selectedDayTotalText = computed(() => {
  const group = dayGroups.value[0]
  if (!group) return ""
  const segments: string[] = []
  if (group.dayExpenseCents) segments.push(`支 ${formatCents(group.dayExpenseCents)}`)
  if (group.dayIncomeCents) segments.push(`收 ${formatCents(group.dayIncomeCents)}`)
  return segments.join("  ")
})

function dayAmountText(cents: number): string {
  const text = formatCents(cents, { grouping: false })
  return text.endsWith(".00") ? text.slice(0, -3) : text
}

function recordCents(record: DailyRecord): number {
  if (record.amountCents !== undefined && record.amountCents !== null) return record.amountCents
  return Math.round(Number(record.amount) * 100)
}

function errorText(error: unknown): string {
  if (typeof error === "string" && error) return error
  if (error instanceof Error && error.message) return error.message
  const raw = error as { errMsg?: string; message?: string } | null
  return raw?.errMsg || raw?.message || "未知错误"
}

function readBudget(): void {
  try {
    const stored = Number(uni.getStorageSync(BUDGET_KEY))
    monthlyBudgetCents.value =
      Number.isFinite(stored) && stored > 0
        ? Math.round(stored * 100)
        : DEFAULT_MONTHLY_BUDGET * 100
  } catch {
    monthlyBudgetCents.value = DEFAULT_MONTHLY_BUDGET * 100
  }
}

async function loadMonth(): Promise<void> {
  const seq = ++requestSeq
  state.value = "loading"
  errorMessage.value = ""

  try {
    const response = await getCalendarMonth(month.value)
    if (seq !== requestSeq) return
    stats.value = response.data || []
    state.value = "ready"
    loadedMonth = month.value

    if (!selectedDate.value.startsWith(month.value)) {
      selectFirstDayWithData()
    } else {
      await loadSelectedDay()
    }
  } catch (error) {
    if (seq !== requestSeq) return
    console.error("[bookkeeping] 日历加载失败:", error)
    stats.value = []
    state.value = "error"
    errorMessage.value = errorText(error)
  }
}

function selectFirstDayWithData(): void {
  const latest = [...stats.value].reverse().find((item) => item.incomeCents + item.expenseCents > 0)
  const fallback = month.value === dayjs().format("YYYY-MM") ? today : `${month.value}-01`
  selectedDate.value = latest?.date || fallback
  loadSelectedDay()
}

async function loadSelectedDay(): Promise<void> {
  if (!selectedDate.value) return
  detailState.value = "loading"
  try {
    const response = await listRecordGroups({
      start: selectedDate.value,
      end: selectedDate.value,
    })
    dayGroups.value = response.data || []
    detailState.value = "ready"
  } catch (error) {
    console.error("[bookkeeping] 日历明细加载失败:", error)
    dayGroups.value = []
    detailState.value = "error"
    errorMessage.value = errorText(error)
  }
}

function selectDay(day: { date: string }): void {
  if (selectedDate.value === day.date) return
  selectedDate.value = day.date
  loadSelectedDay()
}

function shiftMonth(delta: number): void {
  month.value = dayjs(`${month.value}-01`).add(delta, "month").format("YYYY-MM")
  selectedDate.value = ""
  loadMonth()
}

function handleMonthPick(event: { detail: { value: string | number } }): void {
  const value = String(event.detail.value)
  if (!/^\d{4}-\d{2}/.test(value)) return
  month.value = value.slice(0, 7)
  selectedDate.value = ""
  loadMonth()
}

function openBudgetEditor(): void {
  budgetDraft.value = String(Math.round(monthlyBudgetCents.value / 100))
  budgetVisible.value = true
}

function saveBudget(): void {
  const value = Number(budgetDraft.value)
  if (!Number.isFinite(value) || value <= 0) {
    uni.showToast({ title: "请输入正确的预算金额", icon: "none" })
    return
  }
  monthlyBudgetCents.value = Math.round(value * 100)
  try {
    uni.setStorageSync(BUDGET_KEY, value)
  } catch (error) {
    console.error("[bookkeeping] 保存预算失败:", error)
  }
  budgetVisible.value = false
}

function openRecord(record: DailyRecord): void {
  uni.navigateTo({
    url: `/pages/BookKeeping/edit?id=${encodeURIComponent(String(record.id))}`,
  })
}

onLoad((query) => {
  const value = query?.month ? String(query.month) : ""
  if (/^\d{4}-\d{2}$/.test(value)) {
    month.value = value
    selectedDate.value = ""
  }
  readBudget()
  loadMonth()
})

onShow(() => {
  // 从编辑页返回后刷新当月数据（首次进入由 onLoad 负责）
  if (loadedMonth === month.value) loadMonth()
})
</script>

<style scoped lang="scss">
.calendar-page {
  box-sizing: border-box;
  min-height: 100vh;
  padding: 16rpx 24rpx calc(48rpx + env(safe-area-inset-bottom));
  background: var(--bk-bg);
}

.month-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16rpx;
}

.month-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64rpx;
  height: 64rpx;
}

.month-label {
  display: flex;
  align-items: center;
  padding: 8rpx 20rpx;
  font-size: 30rpx;
  font-weight: 600;
  color: var(--bk-text);
}

.month-label text {
  margin-right: 6rpx;
}

.summary-card {
  display: flex;
  align-items: center;
  padding: 26rpx 30rpx;
  color: #fff;
  background: linear-gradient(135deg, #ffc000, #ff9f00);
  border-radius: 24rpx;
  box-shadow: 0 12rpx 30rpx rgb(255 192 0 / 25%);
}

.summary-item {
  display: flex;
  flex: 1;
  flex-direction: column;
}

.summary-label {
  font-size: 22rpx;
  opacity: 0.85;
}

.summary-value {
  margin-top: 6rpx;
  font-size: 34rpx;
  font-weight: 700;
}

.summary-divider {
  flex-shrink: 0;
  width: 1rpx;
  height: 44rpx;
  margin: 0 24rpx;
  background: rgb(255 255 255 / 25%);
}

.calendar-card {
  padding: 12rpx 12rpx 8rpx;
  margin-top: 20rpx;
  background: #fff;
  border-radius: 24rpx;
  box-shadow: 0 4rpx 16rpx rgb(31 35 41 / 4%);
}

.week-head {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  padding: 10rpx 0 6rpx;
}

.week-cell {
  font-size: 22rpx;
  color: var(--bk-text-tertiary);
  text-align: center;
}

.day-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
}

.day-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 92rpx;
  padding: 10rpx 2rpx 8rpx;
  border-radius: 14rpx;
}

.day-cell.is-blank {
  visibility: hidden;
}

.day-cell.selected {
  background: #fff7e0;
}

.day-number {
  font-size: 26rpx;
  font-weight: 500;
  color: var(--bk-text);
}

.day-cell.today .day-number {
  color: var(--bk-primary-dark);
  font-weight: 700;
}

.day-cell.future .day-number {
  color: #c9cdd4;
}

.day-amount {
  margin-top: 4rpx;
  overflow: hidden;
  max-width: 100%;
  font-size: 19rpx;
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
  color: var(--bk-text-secondary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.day-amount.over {
  color: var(--bk-danger);
}

.day-amount.under {
  color: var(--bk-success);
}

.day-income {
  margin-top: 2rpx;
  overflow: hidden;
  max-width: 100%;
  font-size: 18rpx;
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
  color: var(--bk-income);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.calendar-loading {
  padding: 80rpx 0;
  font-size: 24rpx;
  color: var(--bk-text-tertiary);
  text-align: center;
}

.budget-row {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8rpx;
  padding: 12rpx 14rpx 10rpx;
  border-top: 1rpx solid #f2f3f5;
}

.budget-label {
  font-size: 22rpx;
  color: var(--bk-text-tertiary);
}

.budget-value {
  font-size: 24rpx;
  font-weight: 600;
  color: var(--bk-text-secondary);
}

.detail-section {
  padding: 4rpx 4rpx 0;
  margin-top: 16rpx;
}

.detail-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12rpx 4rpx;
}

.detail-date {
  font-size: 26rpx;
  font-weight: 600;
  color: var(--bk-text);
}

.detail-total {
  font-size: 22rpx;
  color: var(--bk-text-tertiary);
}

.detail-empty {
  padding: 60rpx 0;
  font-size: 24rpx;
  color: var(--bk-text-tertiary);
  text-align: center;
}

.record-row {
  display: flex;
  align-items: center;
  min-height: 68rpx;
  padding: 14rpx 6rpx;
  border-top: 1rpx solid #eceef1;
}

.record-row:active {
  background: rgb(0 0 0 / 2%);
}

.record-icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 68rpx;
  height: 68rpx;
  border-radius: 20rpx;
}

.record-main {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  margin: 0 20rpx;
}

.record-title {
  overflow: hidden;
  font-size: 28rpx;
  font-weight: 500;
  color: var(--bk-text);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.record-meta {
  margin-top: 4rpx;
  font-size: 22rpx;
  color: var(--bk-text-tertiary);
}

.record-amount {
  flex-shrink: 0;
  font-size: 30rpx;
  font-weight: 600;
}

.record-amount.income {
  color: var(--bk-income);
}

.record-amount.expense {
  color: var(--bk-expense);
}

.budget-editor {
  box-sizing: border-box;
  width: 86vw;
  max-width: 600rpx;
  padding: 36rpx 32rpx 28rpx;
}

.budget-title {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
  color: var(--bk-text);
  text-align: center;
}

.budget-tip {
  display: block;
  margin-top: 10rpx;
  font-size: 22rpx;
  color: var(--bk-text-tertiary);
  text-align: center;
}

.budget-input-row {
  display: flex;
  align-items: center;
  padding: 20rpx 24rpx;
  margin-top: 26rpx;
  background: #f2f3f5;
  border-radius: 16rpx;
}

.budget-currency {
  margin-right: 12rpx;
  font-size: 32rpx;
  font-weight: 600;
  color: var(--bk-text-secondary);
}

.budget-input {
  flex: 1;
  height: 60rpx;
  font-size: 32rpx;
  font-weight: 600;
  color: var(--bk-text);
}

.budget-actions {
  display: flex;
  gap: 20rpx;
  margin-top: 30rpx;
}

.budget-btn {
  flex: 1;
  padding: 18rpx 0;
  font-size: 28rpx;
  font-weight: 600;
  text-align: center;
  border-radius: 999rpx;
}

.budget-btn.cancel {
  color: var(--bk-text-secondary);
  background: #f2f3f5;
}

.budget-btn.save {
  color: #fff;
  background: var(--bk-primary);
}
</style>
