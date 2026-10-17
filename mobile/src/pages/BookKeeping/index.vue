<!--
 * 记账首页 / 账单列表。
 * 本地模式：月份 + 账户 + 类型筛选，统计来自 SQLite v2（整数分）。
 * 远程模式：保留旧的 AmountAdd 录入流程，避免破坏 server 构建。
-->
<route lang="json5" type="page">
{
  layout: "default",
  style: {
    navigationBarTitleText: "记账",
    navigationBarBackgroundColor: "#FFFFFF",
    enablePullDownRefresh: true,
  },
}
</route>

<template>
  <view class="bk-page list-page">
    <view class="page-head">
      <text class="page-title">记账</text>
      <view class="head-actions">
        <view class="head-btn" @click="goStats">
          <wd-icon name="chart" size="19px" color="#646a73" />
        </view>
        <view class="head-btn" @click="openManage">
          <wd-icon name="setting" size="19px" color="#646a73" />
        </view>
      </view>
    </view>

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
      <view class="summary-top">
        <text class="summary-label">{{ summaryLabel }}</text>
        <text class="summary-badge">{{ accountFilter ? "账户" : "月度" }}</text>
      </view>
      <text class="summary-value bk-amount" :class="{ negative: summaryValueCents < 0 }">
        ¥{{ formatCents(summaryValueCents) }}
      </text>

      <view class="summary-row">
        <view class="summary-item">
          <text class="summary-item-label">{{ accountFilter ? "本期收入" : "收入" }}</text>
          <text class="summary-item-value income bk-amount">{{ incomeText }}</text>
        </view>
        <view class="summary-divider" />
        <view class="summary-item">
          <text class="summary-item-label">{{ accountFilter ? "本期支出" : "支出" }}</text>
          <text class="summary-item-value expense bk-amount">{{ expenseText }}</text>
        </view>
      </view>
    </view>

    <view class="filter-block">
      <view class="filter-tabs">
        <view
          v-for="tab in typeTabs"
          :key="tab.value"
          class="filter-tab"
          :class="{ active: filterType === tab.value }"
          @click="setFilterType(tab.value)"
        >
          {{ tab.label }}
        </view>
      </view>

      <scroll-view v-if="isLocal && accounts.length > 0" scroll-x class="account-scroll">
        <view class="account-chips">
          <view class="account-chip" :class="{ active: !accountFilter }" @click="selectAccount('')">
            全部账户
          </view>
          <view
            v-for="account in accounts"
            :key="account.id"
            class="account-chip"
            :class="{ active: accountFilter === account.id }"
            @click="selectAccount(account.id)"
          >
            <view class="chip-dot" :style="{ background: account.color }" />
            <text>{{ account.name }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <view class="list-section">
      <page-state v-if="state === 'loading'" state="loading" />

      <page-state
        v-else-if="state === 'error'"
        state="error"
        :description="errorMessage"
        @retry="load(false)"
      />

      <page-state
        v-else-if="groups.length === 0"
        state="empty"
        :title="emptyTitle"
        description="记下第一笔，清楚每一笔钱花在哪里。"
      >
        <view class="empty-btn" @click="goCreate">记一笔</view>
      </page-state>

      <view v-else class="day-list">
        <view v-for="group in groups" :key="group.date" class="day-group">
          <view class="day-head">
            <text class="day-date">{{ groupDateText(group.date) }}</text>
            <text class="day-total bk-amount">{{ groupTotalText(group) }}</text>
          </view>

          <view class="day-card">
            <view
              v-for="record in group.records"
              :key="record.id"
              class="record-row"
              @click="openRecord(record)"
              @longpress="openRecordActions(record)"
            >
              <view
                class="record-icon"
                :style="{ background: `${record.category.color}1a` }"
                @click.stop="openCategorySheet(record)"
              >
                <wd-icon
                  :name="record.category.icon || 'star'"
                  size="20px"
                  :color="record.category.color"
                />
              </view>
              <view class="record-main">
                <text class="record-title">{{ record.title || record.category.name }}</text>
                <input
                  v-if="editingRemarkId === String(record.id)"
                  v-model="remarkDraft"
                  class="record-sub-input"
                  type="text"
                  maxlength="100"
                  placeholder="添加备注"
                  :focus="true"
                  confirm-type="done"
                  @click.stop
                  @blur="saveRemark(record)"
                  @confirm="saveRemark(record)"
                />
                <text v-else class="record-sub" @click.stop="startRemarkEdit(record)">
                  {{ recordSubText(record) }}
                </text>
              </view>
              <text
                class="record-amount bk-amount"
                :class="record.type"
                @click.stop="openAmountSheet(record)"
              >
                {{ recordAmountText(record) }}
              </text>
            </view>
          </view>
        </view>

        <text class="list-footer">共 {{ recordCount }} 笔</text>
      </view>
    </view>

    <view class="fab" @click="goCreate">
      <wd-icon name="add" size="26px" color="#fff" />
    </view>

    <wd-popup v-if="!isLocal" v-model="legacyVisible" position="bottom" round :z-index="9999">
      <AmountAdd
        v-if="legacyVisible"
        :edit-record="legacyEditRecord || undefined"
        @close="legacyVisible = false"
      />
    </wd-popup>

    <view v-if="categorySheetVisible" class="inline-mask" @click="closeCategorySheet">
      <view class="inline-sheet" @click.stop>
        <view class="sheet-head">
          <text class="sheet-title">选择分类</text>
          <text class="sheet-cancel" @click="closeCategorySheet">取消</text>
        </view>
        <scroll-view scroll-y class="sheet-scroll">
          <view class="sheet-grid">
            <view
              v-for="category in sheetCategories"
              :key="category.id"
              class="sheet-cell"
              @click="chooseCategory(category)"
            >
              <view
                class="sheet-icon"
                :class="{ active: isSheetCategoryActive(category) }"
                :style="
                  isSheetCategoryActive(category)
                    ? {}
                    : { background: `${category.color}1a` }
                "
              >
                <wd-icon
                  :name="category.icon || 'star'"
                  size="20px"
                  :color="isSheetCategoryActive(category) ? '#ffffff' : category.color"
                />
              </view>
              <text
                class="sheet-name"
                :class="{ active: isSheetCategoryActive(category) }"
              >
                {{ category.name }}
              </text>
            </view>
          </view>
          <text v-if="sheetCategories.length === 0" class="sheet-empty">
            暂无分类，请先在分类管理里添加
          </text>
        </scroll-view>
      </view>
    </view>

    <view v-if="amountSheetVisible" class="inline-mask" @click="closeAmountSheet">
      <view class="inline-sheet amount-sheet" @click.stop>
        <view class="sheet-head">
          <text class="sheet-title">修改金额</text>
          <text class="sheet-cancel" @click="closeAmountSheet">取消</text>
        </view>
        <view class="amount-edit-row">
          <text class="amount-edit-currency">¥</text>
          <text class="amount-edit-value bk-amount">{{ amountSheetPreview }}</text>
        </view>
        <keypad
          v-model="amountSheetExpression"
          :date="amountSheetDate"
          :disabled="amountSheetSaving"
          @update:date="amountSheetDate = $event"
          @done="saveAmount"
        />
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from "vue"
import { onPullDownRefresh, onShow } from "@dcloudio/uni-app"
import dayjs from "dayjs"
import "dayjs/locale/zh-cn"
import {
  deleteRecord,
  getAccountBalances,
  getCategories,
  getDailyRecords,
  getMonthlyStats,
  getRangeStats,
  isLocalDataMode,
  listRecordGroups,
  updateRecord,
} from "@/api/bookkeeping"
import type {
  AccountBalance,
  Category,
  DailyRecord,
  DailyRecordGroup,
  RangeStats,
} from "@/api/bookkeeping"
import {
  centsToAmount,
  evaluateAmountExpression,
  formatCents,
  formatRecordAmount,
} from "@/api/bookkeeping/money"
import { useBookkeepingStore } from "@/store"
import AmountAdd from "./components/AmountAdd.vue"
import Keypad from "./components/Keypad.vue"

dayjs.locale("zh-cn")

type TypeFilter = "all" | "income" | "expense"
type PageState = "loading" | "ready" | "error"

const isLocal = isLocalDataMode
const bookkeepingStore = useBookkeepingStore()

const month = ref(dayjs().format("YYYY-MM"))
const filterType = ref<TypeFilter>("all")
const accountFilter = ref("")
const accounts = ref<AccountBalance[]>([])
const groups = ref<DailyRecordGroup[]>([])
const stats = ref<RangeStats>({
  incomeCents: 0,
  expenseCents: 0,
  netCents: 0,
  recordCount: 0,
})
const state = ref<PageState>("loading")
const errorMessage = ref("")
const legacyVisible = ref(false)
const legacyEditRecord = ref<DailyRecord | null>(null)
const categories = ref<Category[]>([])
const editingRemarkId = ref("")
const remarkDraft = ref("")
const remarkSaving = ref(false)
const categorySheetVisible = ref(false)
const categorySheetRecord = ref<DailyRecord | null>(null)
const amountSheetVisible = ref(false)
const amountSheetRecord = ref<DailyRecord | null>(null)
const amountSheetExpression = ref("")
const amountSheetDate = ref("")
const amountSheetSaving = ref(false)
let requestSeq = 0
let monthInitialized = false

const typeTabs: Array<{ label: string; value: TypeFilter }> = [
  { label: "全部", value: "all" },
  { label: "支出", value: "expense" },
  { label: "收入", value: "income" },
]

const range = computed(() => ({
  start: `${month.value}-01`,
  end: dayjs(`${month.value}-01`).endOf("month").format("YYYY-MM-DD"),
}))

const monthLabel = computed(() => dayjs(`${month.value}-01`).format("YYYY年M月"))

const selectedAccount = computed(() =>
  accounts.value.find((account) => account.id === accountFilter.value),
)

const summaryLabel = computed(() =>
  accountFilter.value && selectedAccount.value ? `${selectedAccount.value.name}余额` : "本期结余",
)

const summaryValueCents = computed(() =>
  accountFilter.value && selectedAccount.value
    ? selectedAccount.value.balanceCents
    : stats.value.netCents,
)

const incomeText = computed(() => formatCents(stats.value.incomeCents, { sign: true }))
const expenseText = computed(() => formatCents(-stats.value.expenseCents, { sign: true }))

const recordCount = computed(() =>
  groups.value.reduce((sum, group) => sum + group.records.length, 0),
)

const emptyTitle = computed(() =>
  accountFilter.value || filterType.value !== "all" ? "没有符合筛选条件的记录" : "这个月还没有记录",
)

const sheetCategories = computed(() => {
  const record = categorySheetRecord.value
  if (!record) return []
  return categories.value.filter((category) => category.type === record.type)
})

const amountSheetPreview = computed(() => {
  try {
    return formatCents(evaluateAmountExpression(amountSheetExpression.value))
  } catch {
    return amountSheetExpression.value || "0.00"
  }
})

function recordCents(record: DailyRecord): number {
  if (record.amountCents !== undefined && record.amountCents !== null) {
    return record.amountCents
  }
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
  if (dayExpenseCents(group) !== 0) {
    segments.push(`支 ${formatCents(dayExpenseCents(group))}`)
  }
  if (dayIncomeCents(group) !== 0) {
    segments.push(`收 ${formatCents(dayIncomeCents(group))}`)
  }
  return segments.join("  ")
}

function recordSubText(record: DailyRecord): string {
  const parts: string[] = []
  const title = record.title || record.category.name
  if (record.category.name && record.category.name !== title) {
    parts.push(record.category.name)
  }
  if (record.account?.name) parts.push(record.account.name)
  if (record.remark) parts.push(record.remark)
  for (const tag of record.tags || []) parts.push(`#${tag}`)
  if (record.images?.length) parts.push(`[图${record.images.length}]`)
  return parts.join(" · ") || "无备注"
}

function recordAmountText(record: DailyRecord): string {
  return formatRecordAmount(recordCents(record), record.type)
}

function toast(title: string): void {
  uni.showToast({ title, icon: "none" })
}

/** 兼容 Error / uni 接口对象 / 字符串，避免错误原因被吞掉 */
function errorText(error: unknown): string {
  if (typeof error === "string" && error) return error
  if (error instanceof Error && error.message) return error.message
  const raw = error as { errMsg?: string; message?: string } | null
  return raw?.errMsg || raw?.message || "未知错误"
}

function loadErrorText(error: unknown): string {
  return `${isLocal ? "本地数据" : "远程接口"}：${errorText(error)}`
}

function filterRemoteGroups(source: DailyRecordGroup[], type: TypeFilter): DailyRecordGroup[] {
  return source
    .map((group) => {
      const records =
        type === "all" ? group.records : group.records.filter((record) => record.type === type)
      let incomeCents = 0
      let expenseCents = 0
      for (const record of records) {
        const cents = recordCents(record)
        if (record.type === "income") incomeCents += cents
        else expenseCents += cents
      }
      return {
        ...group,
        records,
        dayIncome: incomeCents / 100,
        dayExpense: expenseCents / 100,
        dayIncomeCents: incomeCents,
        dayExpenseCents: expenseCents,
      }
    })
    .filter((group) => group.records.length > 0)
}

async function load(silent = false): Promise<void> {
  const seq = ++requestSeq
  if (!silent) state.value = "loading"
  errorMessage.value = ""

  try {
    if (isLocal) {
      const [statsResponse, groupsResponse, accountsResponse, categoryResponse] = await Promise.all([
        getRangeStats(range.value, accountFilter.value || undefined),
        listRecordGroups({
          ...range.value,
          type: filterType.value === "all" ? undefined : filterType.value,
          accountId: accountFilter.value || undefined,
        }),
        getAccountBalances(),
        getCategories(),
      ])
      if (seq !== requestSeq) return

      stats.value = statsResponse.data
      groups.value = groupsResponse.data || []
      accounts.value = accountsResponse.data || []
      categories.value = categoryResponse.data || []

      if (accountFilter.value && !accounts.value.some((item) => item.id === accountFilter.value)) {
        accountFilter.value = ""
        load(true)
        return
      }
    } else {
      const [statsResponse, groupsResponse] = await Promise.all([
        getMonthlyStats(month.value),
        getDailyRecords(month.value),
      ])
      if (seq !== requestSeq) return

      const incomeCents = Math.round(Number(statsResponse.data?.income || 0) * 100)
      const expenseCents = Math.round(Number(statsResponse.data?.expense || 0) * 100)
      const remoteGroups = filterRemoteGroups(groupsResponse.data || [], filterType.value)
      stats.value = {
        incomeCents,
        expenseCents,
        netCents: incomeCents - expenseCents,
        recordCount: remoteGroups.reduce((sum, group) => sum + group.records.length, 0),
      }
      groups.value = remoteGroups
      accounts.value = []
    }

    state.value = "ready"
  } catch (error) {
    if (seq !== requestSeq) return
    console.error("[bookkeeping] 列表加载失败:", error)
    state.value = "error"
    errorMessage.value = loadErrorText(error)
  }
}

function closeInlineEditors(): void {
  editingRemarkId.value = ""
  categorySheetVisible.value = false
  amountSheetVisible.value = false
}

function shiftMonth(delta: number): void {
  closeInlineEditors()
  month.value = dayjs(`${month.value}-01`).add(delta, "month").format("YYYY-MM")
  load(false)
}

function handleMonthPick(event: { detail: { value: string | number } }): void {
  const value = String(event.detail.value)
  if (!/^\d{4}-\d{2}/.test(value)) return
  closeInlineEditors()
  month.value = value.slice(0, 7)
  load(false)
}

function setFilterType(type: TypeFilter): void {
  if (filterType.value === type) return
  closeInlineEditors()
  filterType.value = type
  load(false)
}

function selectAccount(id: string): void {
  if (accountFilter.value === id) return
  closeInlineEditors()
  accountFilter.value = id
  load(false)
}

function goCreate(): void {
  if (!isLocal) {
    legacyEditRecord.value = null
    legacyVisible.value = true
    return
  }
  const type = filterType.value === "income" ? "income" : "expense"
  uni.navigateTo({ url: `/pages/BookKeeping/edit?type=${type}` })
}

function openRecord(record: DailyRecord): void {
  if (!isLocal) {
    legacyEditRecord.value = { ...record }
    legacyVisible.value = true
    return
  }
  uni.navigateTo({
    url: `/pages/BookKeeping/edit?id=${encodeURIComponent(String(record.id))}`,
  })
}

// ---------------------------------------------------------------------------
// 列表内联编辑：点分类图标 / 备注 / 金额直接修改
// ---------------------------------------------------------------------------

function startRemarkEdit(record: DailyRecord): void {
  if (!isLocal) {
    openRecord(record)
    return
  }
  if (editingRemarkId.value === String(record.id)) return
  editingRemarkId.value = String(record.id)
  remarkDraft.value = record.remark || ""
}

async function saveRemark(record: DailyRecord): Promise<void> {
  if (editingRemarkId.value !== String(record.id)) return
  if (remarkSaving.value) return

  const current = record.remark || ""
  const next = remarkDraft.value.trim()
  remarkSaving.value = true
  editingRemarkId.value = ""
  if (next === current) {
    remarkSaving.value = false
    return
  }

  try {
    await updateRecord(record.id, { remark: next })
    record.remark = next
    uni.$emit("refreshBookkeepingData")
  } catch (error) {
    remarkDraft.value = current
    toast(errorText(error))
  } finally {
    remarkSaving.value = false
  }
}

function openCategorySheet(record: DailyRecord): void {
  if (!isLocal) {
    openRecord(record)
    return
  }
  uni.hideKeyboard()
  categorySheetRecord.value = record
  categorySheetVisible.value = true
}

function closeCategorySheet(): void {
  categorySheetVisible.value = false
}

function isSheetCategoryActive(category: Category): boolean {
  const record = categorySheetRecord.value
  if (!record) return false
  return String(record.categoryId) === String(category.id)
}

async function chooseCategory(category: Category): Promise<void> {
  const record = categorySheetRecord.value
  if (!record) return
  const currentId = String(record.categoryId)
  categorySheetVisible.value = false
  if (String(category.id) === currentId) return

  try {
    await updateRecord(record.id, { categoryId: category.id })
    uni.$emit("refreshBookkeepingData")
    await load(true)
  } catch (error) {
    toast(errorText(error))
  }
}

function openAmountSheet(record: DailyRecord): void {
  if (!isLocal) {
    openRecord(record)
    return
  }
  uni.hideKeyboard()
  amountSheetRecord.value = record
  amountSheetExpression.value = (recordCents(record) / 100).toFixed(2)
  amountSheetDate.value = record.recordDate
  amountSheetVisible.value = true
}

function closeAmountSheet(): void {
  if (amountSheetSaving.value) return
  amountSheetVisible.value = false
}

async function saveAmount(): Promise<void> {
  const record = amountSheetRecord.value
  if (!record || amountSheetSaving.value) return

  let cents: number
  try {
    cents = evaluateAmountExpression(amountSheetExpression.value)
  } catch (error) {
    toast(errorText(error))
    return
  }

  if (cents === 0) {
    toast("请输入有效金额")
    return
  }
  if (cents < 0 && cents !== recordCents(record)) {
    toast("金额必须大于 0")
    return
  }

  amountSheetSaving.value = true
  try {
    await updateRecord(record.id, {
      amount: centsToAmount(cents),
      recordDate: amountSheetDate.value,
    })
    amountSheetVisible.value = false
    uni.$emit("refreshBookkeepingData")
    await load(true)
  } catch (error) {
    toast(errorText(error))
  } finally {
    amountSheetSaving.value = false
  }
}

function confirmDelete(record: DailyRecord): void {
  uni.showModal({
    title: "删除记录",
    content: `确定删除「${record.title || record.category.name}」吗？`,
    confirmText: "删除",
    confirmColor: "#f54a45",
    cancelText: "取消",
    success: async (result) => {
      if (!result.confirm) return
      try {
        await deleteRecord(record.id)
        uni.$emit("refreshBookkeepingData")
        uni.showToast({ title: "已删除", icon: "success" })
        load(true)
      } catch (error) {
        toast(error instanceof Error ? error.message : "删除失败")
      }
    },
  })
}

function openRecordActions(record: DailyRecord): void {
  uni.showActionSheet({
    itemList: ["编辑", "删除"],
    success: (result) => {
      if (result.tapIndex === 0) openRecord(record)
      else if (result.tapIndex === 1) confirmDelete(record)
    },
  })
}

function goStats(): void {
  if (!isLocal) {
    toast("统计功能仅本地模式可用")
    return
  }
  uni.navigateTo({ url: `/pages/BookKeeping/stats?month=${month.value}` })
}

function openManage(): void {
  if (!isLocal) {
    toast("管理功能仅本地模式可用")
    return
  }
  uni.showActionSheet({
    itemList: ["分类管理", "账户管理"],
    success: (result) => {
      uni.navigateTo({
        url:
          result.tapIndex === 0 ? "/pages/BookKeeping/categories" : "/pages/BookKeeping/accounts",
      })
    },
  })
}

onShow(() => {
  if (!monthInitialized) {
    monthInitialized = true
    if (bookkeepingStore.shouldShowAdd) {
      bookkeepingStore.setShouldShowAdd(false)
      goCreate()
      load(true)
      return
    }
    load(false)
    return
  }

  if (bookkeepingStore.shouldShowAdd) {
    bookkeepingStore.setShouldShowAdd(false)
    goCreate()
  }
  load(true)
})

onPullDownRefresh(async () => {
  await load(true)
  uni.stopPullDownRefresh()
})
</script>

<style scoped lang="scss">
.list-page {
  position: relative;
  padding-bottom: calc(180rpx + env(safe-area-inset-bottom));
}

.page-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12rpx 4rpx 20rpx;
}

.page-title {
  font-size: 40rpx;
  font-weight: 700;
  color: var(--bk-text);
}

.head-actions {
  display: flex;
  gap: 16rpx;
}

.head-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 68rpx;
  height: 68rpx;
  background: #fff;
  border-radius: 50%;
  box-shadow: 0 4rpx 16rpx rgb(31 35 41 / 6%);
}

.month-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20rpx;
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
  padding: 34rpx;
  color: #fff;
  background: linear-gradient(135deg, #ffc000, #ff9f00);
  border-radius: 28rpx;
  box-shadow: 0 12rpx 30rpx rgb(255 192 0 / 25%);
}

.summary-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.summary-label {
  font-size: 26rpx;
  opacity: 0.9;
}

.summary-badge {
  padding: 4rpx 14rpx;
  font-size: 20rpx;
  background: rgb(255 255 255 / 22%);
  border-radius: 999rpx;
}

.summary-value {
  display: block;
  margin: 16rpx 0 28rpx;
  font-size: 64rpx;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: 1rpx;
}

.summary-value.negative {
  color: #fff3f3;
}

.summary-row {
  display: flex;
  align-items: center;
  padding: 18rpx 22rpx;
  background: rgb(255 255 255 / 18%);
  border-radius: 18rpx;
}

.summary-item {
  display: flex;
  flex: 1;
  flex-direction: column;
}

.summary-item-label {
  font-size: 22rpx;
  opacity: 0.85;
}

.summary-item-value {
  margin-top: 4rpx;
  font-size: 30rpx;
  font-weight: 600;
}

.summary-divider {
  width: 1rpx;
  height: 52rpx;
  margin: 0 24rpx;
  background: rgb(255 255 255 / 25%);
}

.filter-block {
  margin-top: 24rpx;
}

.filter-tabs {
  display: flex;
  padding: 6rpx;
  background: #eef0f2;
  border-radius: 999rpx;
}

.filter-tab {
  flex: 1;
  padding: 14rpx 0;
  font-size: 26rpx;
  color: var(--bk-text-secondary);
  text-align: center;
  border-radius: 999rpx;
}

.filter-tab.active {
  font-weight: 600;
  color: var(--bk-text);
  background: #fff;
  box-shadow: 0 2rpx 8rpx rgb(31 35 41 / 8%);
}

.account-scroll {
  height: 76rpx;
  margin-top: 18rpx;
  white-space: nowrap;
}

.account-chips {
  display: inline-flex;
  gap: 14rpx;
  padding: 2rpx 2rpx 6rpx;
}

.account-chip {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  padding: 12rpx 24rpx;
  font-size: 24rpx;
  color: var(--bk-text-secondary);
  background: #fff;
  border: 1rpx solid transparent;
  border-radius: 999rpx;
}

.account-chip.active {
  color: var(--bk-primary-dark);
  background: #fff7e0;
  border-color: #ffd666;
}

.chip-dot {
  width: 12rpx;
  height: 12rpx;
  margin-right: 8rpx;
  border-radius: 50%;
}

.list-section {
  margin-top: 26rpx;
}

.day-group {
  margin-bottom: 26rpx;
}

.day-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 6rpx 12rpx;
}

.day-date {
  font-size: 26rpx;
  font-weight: 600;
  color: var(--bk-text-secondary);
}

.day-total {
  font-size: 22rpx;
  color: var(--bk-text-tertiary);
}

.day-card {
  overflow: hidden;
  background: #fff;
  border-radius: 24rpx;
  box-shadow: 0 4rpx 16rpx rgb(31 35 41 / 4%);
}

.record-row {
  display: flex;
  align-items: center;
  min-height: 112rpx;
  padding: 18rpx 24rpx;
  border-bottom: 1rpx solid #f2f3f5;
}

.record-row:last-child {
  border-bottom: none;
}

.record-row:active {
  background: #fafafa;
}

.record-icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 76rpx;
  height: 76rpx;
  border-radius: 22rpx;
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
  font-size: 30rpx;
  font-weight: 500;
  color: var(--bk-text);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.record-sub {
  margin-top: 6rpx;
  overflow: hidden;
  font-size: 22rpx;
  color: var(--bk-text-tertiary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.record-sub-input {
  box-sizing: border-box;
  width: 100%;
  height: 46rpx;
  padding: 0 10rpx;
  margin-top: 4rpx;
  font-size: 24rpx;
  color: var(--bk-text);
  background: #f2f3f5;
  border-radius: 8rpx;
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

.list-footer {
  display: block;
  padding: 8rpx 0 20rpx;
  font-size: 22rpx;
  color: var(--bk-text-tertiary);
  text-align: center;
}

.empty-btn {
  padding: 18rpx 48rpx;
  font-size: 28rpx;
  font-weight: 600;
  color: #fff;
  background: var(--bk-primary);
  border-radius: 999rpx;
}

.fab {
  position: fixed;
  right: 36rpx;
  bottom: calc(48rpx + env(safe-area-inset-bottom));
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 104rpx;
  height: 104rpx;
  background: var(--bk-primary);
  border-radius: 50%;
  box-shadow: 0 12rpx 28rpx rgb(255 192 0 / 40%);
}

.fab:active {
  transform: scale(0.95);
}

/* 内联编辑弹层：分类 / 金额 */
.inline-mask {
  position: fixed;
  inset: 0;
  z-index: 500;
  display: flex;
  align-items: flex-end;
  background: rgb(0 0 0 / 40%);
}

.inline-sheet {
  box-sizing: border-box;
  width: 100%;
  padding: 24rpx 24rpx calc(20rpx + env(safe-area-inset-bottom));
  background: #fff;
  border-radius: 28rpx 28rpx 0 0;
  animation: inline-up 0.18s ease-out;
}

.inline-sheet.amount-sheet {
  padding: 24rpx 0 env(safe-area-inset-bottom);
}

.amount-sheet .sheet-head {
  padding: 0 24rpx 16rpx;
}

.sheet-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 18rpx;
}

.sheet-title {
  font-size: 32rpx;
  font-weight: 600;
  color: var(--bk-text);
}

.sheet-cancel {
  font-size: 28rpx;
  color: var(--bk-text-secondary);
}

.sheet-scroll {
  max-height: 56vh;
}

.sheet-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 28rpx 0;
  padding: 6rpx 0 12rpx;
}

.sheet-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 0;
}

.sheet-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  transition: transform 0.15s ease;
}

.sheet-icon.active {
  background: var(--bk-primary);
  box-shadow: 0 6rpx 16rpx rgb(255 192 0 / 35%);
  transform: scale(1.04);
}

.sheet-name {
  max-width: 100%;
  margin-top: 10rpx;
  overflow: hidden;
  font-size: 24rpx;
  color: var(--bk-text-secondary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sheet-name.active {
  font-weight: 600;
  color: var(--bk-text);
}

.sheet-empty {
  display: block;
  padding: 40rpx 0;
  font-size: 24rpx;
  color: var(--bk-text-tertiary);
  text-align: center;
}

.amount-edit-row {
  display: flex;
  align-items: baseline;
  justify-content: flex-end;
  padding: 4rpx 28rpx 18rpx;
}

.amount-edit-currency {
  margin-right: 8rpx;
  font-size: 30rpx;
  font-weight: 600;
  color: var(--bk-expense);
}

.amount-edit-value {
  max-width: 560rpx;
  overflow: hidden;
  font-size: 64rpx;
  font-weight: 600;
  line-height: 1.15;
  color: var(--bk-text);
  text-overflow: ellipsis;
  white-space: nowrap;
}

@keyframes inline-up {
  from {
    transform: translateY(100%);
  }

  to {
    transform: translateY(0);
  }
}
</style>
