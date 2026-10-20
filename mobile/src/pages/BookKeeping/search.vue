<!--
 * 记账搜索：关键词 + 字段（类别/标签/备注/金额）+ 收支 + 时间范围。
 * 仅本地模式可用；结果按日期倒序分组，展示当日小计。
-->
<route lang="json5" type="page">
{
  layout: "default",
  style: {
    navigationBarTitleText: "搜索",
    navigationBarBackgroundColor: "#FFFFFF",
  },
}
</route>

<template>
  <view class="search-page">
    <app-navbar title="搜索" />

    <view class="search-input-wrap">
      <wd-icon name="search" size="18px" color="#8f959e" />
      <input
        v-model="keyword"
        class="search-input"
        type="text"
        confirm-type="search"
        placeholder="搜索类别/标签/备注/金额"
        placeholder-class="search-placeholder"
        @confirm="runSearch"
      />
      <view v-if="keyword" class="search-clear" @click="clearKeyword">
        <wd-icon name="close-circle-filled" size="17px" color="#c9cdd4" />
      </view>
    </view>

    <view class="filter-card">
      <view class="filter-row">
        <text class="filter-label">类型</text>
        <view class="filter-options">
          <view
            v-for="item in fieldOptions"
            :key="item.value"
            class="filter-chip"
            :class="{ active: field === item.value }"
            @click="field = item.value"
          >
            {{ item.label }}
          </view>
        </view>
      </view>

      <view class="filter-row">
        <text class="filter-label">收支</text>
        <view class="filter-options">
          <view
            v-for="item in typeOptions"
            :key="item.value"
            class="filter-chip"
            :class="{ active: typeFilter === item.value }"
            @click="typeFilter = item.value"
          >
            {{ item.label }}
          </view>
        </view>
      </view>

      <view class="filter-row">
        <text class="filter-label">时间</text>
        <view class="filter-options">
          <view
            class="filter-chip"
            :class="{ active: timeMode === 'all' }"
            @click="timeMode = 'all'"
          >
            不限
          </view>
          <view
            class="filter-chip"
            :class="{ active: timeMode === 'custom' }"
            @click="timeMode = 'custom'"
          >
            自定义
          </view>
        </view>
      </view>

      <view v-if="timeMode === 'custom'" class="date-range">
        <picker mode="date" :value="startDate || today" @change="handleStartChange">
          <view class="date-chip" :class="{ placeholder: !startDate }">
            {{ startDate || "开始日期" }}
          </view>
        </picker>
        <text class="date-sep">至</text>
        <picker mode="date" :value="endDate || today" @change="handleEndChange">
          <view class="date-chip" :class="{ placeholder: !endDate }">
            {{ endDate || "结束日期" }}
          </view>
        </picker>
      </view>
    </view>

    <view class="result-section">
      <view v-if="searched && state === 'ready'" class="result-summary">
        <text>{{ truncated ? "仅显示前 500 笔" : `共 ${recordCount} 笔` }}</text>
        <text v-if="expenseCents > 0" class="summary-expense">
          支 {{ formatCents(expenseCents) }}
        </text>
        <text v-if="incomeCents > 0" class="summary-income">收 {{ formatCents(incomeCents) }}</text>
      </view>

      <page-state v-if="state === 'loading'" state="loading" />

      <page-state
        v-else-if="state === 'error'"
        state="error"
        :description="errorMessage"
        @retry="runSearch"
      />

      <page-state
        v-else-if="searched && groups.length === 0"
        state="empty"
        title="暂无数据"
        description="换个关键词或筛选条件试试"
      />

      <view v-else-if="groups.length > 0" class="result-list">
        <view v-for="group in groups" :key="group.date" class="day-group">
          <view class="day-head">
            <text class="day-date">{{ groupDateText(group.date) }}</text>
            <text class="day-total bk-amount">{{ groupTotalText(group) }}</text>
          </view>

          <view class="day-records">
            <view
              v-for="record in group.records"
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
                <text class="record-title">{{ recordTitle(record) }}</text>
                <text v-if="recordMeta(record)" class="record-meta">{{ recordMeta(record) }}</text>
              </view>
              <text class="record-amount bk-amount" :class="record.type">
                {{ formatRecordAmount(recordCents(record), record.type) }}
              </text>
            </view>
          </view>
        </view>
      </view>

      <view v-else class="search-hint">
        <text class="hint-icon">🔍</text>
        <text class="hint-text">输入关键词后点击「确定」开始搜索</text>
        <text class="hint-sub">可以按类别、标签、备注或金额查找记录</text>
      </view>
    </view>

    <view class="action-bar">
      <view class="action-btn reset" @click="resetFilters">重置</view>
      <view class="action-btn confirm" @click="runSearch">确定</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from "vue"
import dayjs from "dayjs"
import "dayjs/locale/zh-cn"
import { searchRecordGroups } from "@/api/bookkeeping"
import type { DailyRecord, DailyRecordGroup, RecordSearchField } from "@/api/bookkeeping"
import { formatCents, formatRecordAmount } from "@/api/bookkeeping/money"

dayjs.locale("zh-cn")

type TypeFilter = "all" | "income" | "expense"
type TimeMode = "all" | "custom"
type PageState = "idle" | "loading" | "ready" | "error"

const today = dayjs().format("YYYY-MM-DD")

const keyword = ref("")
const field = ref<RecordSearchField>("all")
const typeFilter = ref<TypeFilter>("all")
const timeMode = ref<TimeMode>("all")
const startDate = ref("")
const endDate = ref("")

const groups = ref<DailyRecordGroup[]>([])
const state = ref<PageState>("idle")
const errorMessage = ref("")
const searched = ref(false)
const truncated = ref(false)
let requestSeq = 0

/** 单次最多渲染的记录数，避免关键词过宽时卡顿 */
const MAX_RESULT_RECORDS = 500

const fieldOptions: Array<{ label: string; value: RecordSearchField }> = [
  { label: "不限", value: "all" },
  { label: "类别", value: "category" },
  { label: "标签", value: "tag" },
  { label: "备注", value: "remark" },
  { label: "金额", value: "amount" },
]

const typeOptions: Array<{ label: string; value: TypeFilter }> = [
  { label: "不限", value: "all" },
  { label: "收入", value: "income" },
  { label: "支出", value: "expense" },
]

const recordCount = computed(() =>
  groups.value.reduce((sum, group) => sum + group.records.length, 0),
)

const incomeCents = computed(() =>
  groups.value.reduce((sum, group) => sum + dayIncomeCents(group), 0),
)

const expenseCents = computed(() =>
  groups.value.reduce((sum, group) => sum + dayExpenseCents(group), 0),
)

function recordCents(record: DailyRecord): number {
  if (record.amountCents !== undefined && record.amountCents !== null) return record.amountCents
  return Math.round(Number(record.amount) * 100)
}

function dayIncomeCents(group: DailyRecordGroup): number {
  if (group.dayIncomeCents !== undefined) return group.dayIncomeCents
  return Math.round(Number(group.dayIncome) * 100)
}

function dayExpenseCents(group: DailyRecordGroup): number {
  if (group.dayExpenseCents !== undefined) return group.dayExpenseCents
  return Math.round(Number(group.dayExpense) * 100)
}

function groupDateText(date: string): string {
  return dayjs(date).format("M月D日 dddd")
}

function groupTotalText(group: DailyRecordGroup): string {
  const segments: string[] = []
  if (dayExpenseCents(group) !== 0) segments.push(`支 ${formatCents(dayExpenseCents(group))}`)
  if (dayIncomeCents(group) !== 0) segments.push(`收 ${formatCents(dayIncomeCents(group))}`)
  return segments.join("  ")
}

function recordTitle(record: DailyRecord): string {
  return record.remark?.trim() || record.category?.name || "未分类"
}

function recordMeta(record: DailyRecord): string {
  const parts: string[] = []
  if (record.remark?.trim()) parts.push(record.category?.name || "未分类")
  if (record.account?.name) parts.push(record.account.name)
  if (record.tags?.length) parts.push(record.tags.map((tag) => `#${tag}`).join(" "))
  return parts.join(" · ")
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

function handleStartChange(event: { detail: { value: string | number } }): void {
  startDate.value = String(event.detail.value)
}

function handleEndChange(event: { detail: { value: string | number } }): void {
  endDate.value = String(event.detail.value)
}

function clearKeyword(): void {
  keyword.value = ""
  groups.value = []
  searched.value = false
  truncated.value = false
  state.value = "idle"
}

function resetFilters(): void {
  keyword.value = ""
  field.value = "all"
  typeFilter.value = "all"
  timeMode.value = "all"
  startDate.value = ""
  endDate.value = ""
  groups.value = []
  searched.value = false
  truncated.value = false
  state.value = "idle"
  errorMessage.value = ""
}

/** 结果过多时截断渲染，并按保留的记录重算当日小计 */
function trimGroups(source: DailyRecordGroup[], limit: number): DailyRecordGroup[] {
  const result: DailyRecordGroup[] = []
  let remaining = limit
  for (const group of source) {
    if (remaining <= 0) break
    const records = group.records.slice(0, remaining)
    remaining -= records.length
    let incomeCents = 0
    let expenseCents = 0
    for (const record of records) {
      if (record.type === "income") incomeCents += recordCents(record)
      else expenseCents += recordCents(record)
    }
    result.push({
      ...group,
      records,
      dayIncome: incomeCents / 100,
      dayExpense: expenseCents / 100,
      dayIncomeCents: incomeCents,
      dayExpenseCents: expenseCents,
    })
  }
  return result
}

function openRecord(record: DailyRecord): void {
  uni.navigateTo({
    url: `/pages/BookKeeping/edit?id=${encodeURIComponent(String(record.id))}`,
  })
}

async function runSearch(): Promise<void> {
  const text = keyword.value.trim()
  if (!text) {
    toast("请输入搜索内容")
    return
  }

  let start: string | undefined
  let end: string | undefined
  if (timeMode.value === "custom") {
    start = startDate.value || "2000-01-01"
    end = endDate.value || today
    if (start > end) {
      toast("开始日期不能晚于结束日期")
      return
    }
  }

  const seq = ++requestSeq
  state.value = "loading"
  errorMessage.value = ""
  searched.value = true

  try {
    const response = await searchRecordGroups({
      keyword: text,
      field: field.value,
      type: typeFilter.value === "all" ? undefined : typeFilter.value,
      start,
      end,
    })
    if (seq !== requestSeq) return
    const all = response.data || []
    const total = all.reduce((sum, group) => sum + group.records.length, 0)
    truncated.value = total > MAX_RESULT_RECORDS
    groups.value = truncated.value ? trimGroups(all, MAX_RESULT_RECORDS) : all
    state.value = "ready"
  } catch (error) {
    if (seq !== requestSeq) return
    console.error("[bookkeeping] 搜索失败:", error)
    groups.value = []
    state.value = "error"
    errorMessage.value = errorText(error)
  }
}
</script>

<style scoped lang="scss">
.search-page {
  box-sizing: border-box;
  min-height: 100vh;
  padding-bottom: calc(160rpx + env(safe-area-inset-bottom));
  background: var(--bk-bg);
}

.search-input-wrap {
  display: flex;
  align-items: center;
  padding: 0 24rpx;
  margin: 20rpx 24rpx 0;
  background: #fff;
  border-radius: 999rpx;
}

.search-input {
  flex: 1;
  height: 84rpx;
  margin-left: 16rpx;
  font-size: 16px;
  color: var(--bk-text);
  background: transparent;
}

.search-placeholder {
  font-size: 14px;
  color: var(--bk-text-tertiary);
}

.search-clear {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56rpx;
  height: 56rpx;
}

.filter-card {
  padding: 8rpx 24rpx 20rpx;
  margin: 20rpx 24rpx 0;
  background: #fff;
  border-radius: 24rpx;
  box-shadow: 0 4rpx 16rpx rgb(31 35 41 / 4%);
}

.filter-row {
  display: flex;
  align-items: flex-start;
  padding: 14rpx 0;
}

.filter-label {
  flex-shrink: 0;
  width: 92rpx;
  padding-top: 10rpx;
  font-size: 26rpx;
  color: var(--bk-text-secondary);
}

.filter-options {
  display: flex;
  flex: 1;
  flex-wrap: wrap;
  gap: 14rpx;
}

.filter-chip {
  padding: 10rpx 26rpx;
  font-size: 25rpx;
  color: var(--bk-text-secondary);
  background: #f2f3f5;
  border: 1rpx solid transparent;
  border-radius: 999rpx;
}

.filter-chip.active {
  font-weight: 600;
  color: var(--bk-primary-dark);
  background: #fff7e0;
  border-color: #ffd666;
}

.date-range {
  display: flex;
  align-items: center;
  padding: 6rpx 0 10rpx 92rpx;
}

.date-chip {
  min-width: 180rpx;
  padding: 12rpx 20rpx;
  font-size: 25rpx;
  color: var(--bk-text);
  text-align: center;
  background: #f2f3f5;
  border-radius: 12rpx;
}

.date-chip.placeholder {
  color: var(--bk-text-tertiary);
}

.date-sep {
  margin: 0 16rpx;
  font-size: 24rpx;
  color: var(--bk-text-tertiary);
}

.result-section {
  padding: 0 24rpx;
  margin-top: 8rpx;
}

.result-summary {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 20rpx 6rpx 6rpx;
  font-size: 24rpx;
  color: var(--bk-text-tertiary);
}

.summary-expense {
  color: var(--bk-expense);
}

.summary-income {
  color: var(--bk-income);
}

.day-group {
  padding: 4rpx 0;
  border-top: 1rpx solid #eceef1;
}

.day-group:last-of-type {
  border-bottom: 1rpx solid #eceef1;
}

.day-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14rpx 6rpx 4rpx;
}

.day-date {
  font-size: 24rpx;
  font-weight: 600;
  color: var(--bk-text-secondary);
}

.day-total {
  font-size: 22rpx;
  color: var(--bk-text-tertiary);
}

.record-row {
  display: flex;
  align-items: center;
  min-height: 68rpx;
  padding: 14rpx 6rpx;
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
  overflow: hidden;
  font-size: 22rpx;
  color: var(--bk-text-tertiary);
  text-overflow: ellipsis;
  white-space: nowrap;
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

.search-hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 40rpx;
}

.hint-icon {
  font-size: 56rpx;
}

.hint-text {
  margin-top: 24rpx;
  font-size: 28rpx;
  color: var(--bk-text-secondary);
}

.hint-sub {
  margin-top: 12rpx;
  font-size: 24rpx;
  color: var(--bk-text-tertiary);
}

.action-bar {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 40;
  display: flex;
  gap: 20rpx;
  padding: 18rpx 24rpx calc(18rpx + env(safe-area-inset-bottom));
  background: #fff;
  box-shadow: 0 -4rpx 20rpx rgb(31 35 41 / 6%);
}

.action-btn {
  flex: 1;
  padding: 22rpx 0;
  font-size: 30rpx;
  font-weight: 600;
  text-align: center;
  border-radius: 999rpx;
}

.action-btn.reset {
  color: var(--bk-text-secondary);
  background: #f2f3f5;
}

.action-btn.confirm {
  color: #fff;
  background: var(--bk-primary);
}

.action-btn:active {
  opacity: 0.86;
}
</style>
