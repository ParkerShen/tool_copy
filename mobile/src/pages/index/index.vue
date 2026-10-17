<route lang="json5" type="page">
{
  layout: "default",
  style: {
    navigationBarTitleText: "首页",
    navigationBarBackgroundColor: "#FFFFFF",
  },
}
</route>

<template>
  <view class="home-page">
    <!-- 本月总览 -->
    <view class="hero">
      <view class="hero-top">
        <view>
          <view class="hero-greeting">{{ greeting }}</view>
          <view class="hero-date">{{ today.format("YYYY年MM月DD日 dddd") }}</view>
        </view>
        <view class="hero-badge">本地数据</view>
      </view>

      <view class="hero-balance">
        <text class="hero-label">本月结余</text>
        <text class="hero-value">¥{{ money(monthStats.income - monthStats.expense) }}</text>
      </view>

      <view class="hero-row">
        <view class="hero-item">
          <text class="hero-item-label">本月收入</text>
          <text class="hero-item-value plus">+{{ money(monthStats.income) }}</text>
        </view>
        <view class="hero-item">
          <text class="hero-item-label">本月支出</text>
          <text class="hero-item-value minus">-{{ money(monthStats.expense) }}</text>
        </view>
      </view>
    </view>

    <!-- 今日收支 -->
    <view class="section">
      <view class="section-header">
        <text class="section-title">今日收支</text>
        <text class="section-link" @click="goBookkeeping(true)">去记一笔</text>
      </view>
      <view class="today-row">
        <view class="today-item">
          <text class="today-label">收入</text>
          <text class="today-value plus">¥{{ money(todayStats.income) }}</text>
        </view>
        <view class="today-divider" />
        <view class="today-item">
          <text class="today-label">支出</text>
          <text class="today-value minus">¥{{ money(todayStats.expense) }}</text>
        </view>
      </view>
    </view>

    <!-- 最近记录 -->
    <view class="section">
      <view class="section-header">
        <text class="section-title">最近记录</text>
        <text class="section-link" @click="goBookkeeping(false)">查看全部</text>
      </view>

      <view v-if="recentRecords.length === 0" class="empty">
        <wd-icon name="money-circle" size="42px" color="#ddd" />
        <text class="empty-text">还没有记账，去记第一笔吧</text>
        <view class="empty-btn" @click="goBookkeeping(true)">去记一笔</view>
      </view>

      <view v-else class="record-list">
        <view
          v-for="record in recentRecords"
          :key="record.id"
          class="record-item"
          @click="goBookkeeping(false)"
        >
          <view
            class="record-icon"
            :style="{ backgroundColor: (record.category?.color || '#409eff') + '22' }"
          >
            <wd-icon
              :name="record.systemCategory?.icon || record.category?.icon || 'star'"
              size="20px"
              :color="record.systemCategory?.color || record.category?.color || '#409eff'"
            />
          </view>
          <view class="record-info">
            <text class="record-title">{{ record.title || record.category?.name || "未分类" }}</text>
            <text class="record-sub">
              {{ formatDate(record.recordDate) }}{{ record.remark ? ` · ${record.remark}` : "" }}
            </text>
          </view>
          <text class="record-amount" :class="record.type">
            {{ formatRecordAmount(record) }}
          </text>
        </view>
      </view>
    </view>

    <!-- 数据说明 -->
    <view class="section tip-section">
      <text class="tip-title">数据保存在本机</text>
      <text class="tip-text">
        接口、页面与数据库都运行在这台手机上，不依赖线上服务。你可以在「我的」页导出
        SQLite / JSON 备份。
      </text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue"
import { onShow } from "@dcloudio/uni-app"
import dayjs from "dayjs"
import "dayjs/locale/zh-cn"
import { getDailyRecords, getMonthlyStats } from "@/api/bookkeeping"
import type { DailyRecord, DailyRecordGroup, MonthlyStatsResult } from "@/api/bookkeeping/types"
import { useBookkeepingStore, useTabbarStore } from "@/store"

dayjs.locale("zh-cn")

const tabbarStore = useTabbarStore()
const bookkeepingStore = useBookkeepingStore()

const today = ref(dayjs())
const monthStats = ref<MonthlyStatsResult>({ income: 0, expense: 0 })
const dailyRecords = ref<DailyRecordGroup[]>([])

const month = computed(() => today.value.format("YYYY-MM"))

const todayStats = computed(() => {
  const group = dailyRecords.value.find((item) => item.date === today.value.format("YYYY-MM-DD"))
  return {
    income: group?.dayIncome || 0,
    expense: group?.dayExpense || 0,
  }
})

const recentRecords = computed<DailyRecord[]>(() =>
  dailyRecords.value.flatMap((group) => group.records).slice(0, 6),
)

const greeting = computed(() => {
  const hour = dayjs().hour()
  if (hour < 6) return "夜深了，早点休息"
  if (hour < 12) return "早上好"
  if (hour < 14) return "中午好"
  if (hour < 18) return "下午好"
  return "晚上好"
})

function money(value: number): string {
  return Number(value || 0).toFixed(2)
}

function formatDate(date: string): string {
  return dayjs(date).format("MM-DD")
}

function formatRecordAmount(record: any): string {
  const value = Number(record?.amount || 0)
  const sign = value < 0 ? "-" : record?.type === "expense" ? "-" : "+"
  return `${sign}${Math.abs(value).toFixed(2)}`
}

async function loadData(): Promise<void> {
  const monthKey = month.value
  try {
    const [statsResponse, recordsResponse] = await Promise.all([
      getMonthlyStats(monthKey),
      getDailyRecords(monthKey),
    ])
    monthStats.value = statsResponse.data || { income: 0, expense: 0 }
    dailyRecords.value = Array.isArray(recordsResponse.data) ? recordsResponse.data : []
  } catch (error) {
    console.error("首页数据加载失败:", error)
  }
}

onShow(() => {
  today.value = dayjs()
  loadData()
})

onMounted(() => {
  uni.$on("refreshBookkeepingData", loadData)
})

onUnmounted(() => {
  uni.$off("refreshBookkeepingData", loadData)
})

function goBookkeeping(openAdd: boolean): void {
  if (openAdd) {
    bookkeepingStore.setShouldShowAdd(true)
  }
  tabbarStore.setActiveByPath("pages/BookKeeping/index")
  uni.switchTab({
    url: "/pages/BookKeeping/index",
  })
}
</script>

<style scoped lang="scss">
.home-page {
  min-height: 100vh;
  padding: 30rpx 30rpx 140rpx;
  background: #f6f7f9;
}

.hero {
  padding: 36rpx;
  color: #fff;
  background: linear-gradient(135deg, #ffc000, #ff9f00);
  border-radius: 28rpx;
  box-shadow: 0 12rpx 30rpx rgb(255 192 0 / 25%);
}

.hero-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.hero-greeting {
  font-size: 34rpx;
  font-weight: 600;
}

.hero-date {
  margin-top: 8rpx;
  font-size: 24rpx;
  opacity: 0.85;
}

.hero-badge {
  padding: 6rpx 16rpx;
  font-size: 22rpx;
  background: rgb(255 255 255 / 25%);
  border-radius: 999rpx;
}

.hero-balance {
  display: flex;
  flex-direction: column;
  margin: 40rpx 0 30rpx;
}

.hero-label {
  font-size: 26rpx;
  opacity: 0.85;
}

.hero-value {
  margin-top: 6rpx;
  font-size: 60rpx;
  font-weight: 700;
  letter-spacing: 1rpx;
}

.hero-row {
  display: flex;
  gap: 20rpx;
}

.hero-item {
  display: flex;
  flex: 1;
  flex-direction: column;
  padding: 18rpx 22rpx;
  background: rgb(255 255 255 / 18%);
  border-radius: 16rpx;
}

.hero-item-label {
  font-size: 22rpx;
  opacity: 0.85;
}

.hero-item-value {
  margin-top: 6rpx;
  font-size: 32rpx;
  font-weight: 600;
}

.section {
  padding: 30rpx;
  margin-top: 28rpx;
  background: #fff;
  border-radius: 24rpx;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #222;
}

.section-link {
  font-size: 26rpx;
  color: #ff9f00;
}

.today-row {
  display: flex;
  align-items: center;
}

.today-item {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
}

.today-divider {
  width: 1rpx;
  height: 60rpx;
  background: #eee;
}

.today-label {
  font-size: 24rpx;
  color: #999;
}

.today-value {
  margin-top: 8rpx;
  font-size: 38rpx;
  font-weight: 600;
}

.plus {
  color: #52c41a;
}

.minus {
  color: #ff4d4f;
}

.record-list {
  display: flex;
  flex-direction: column;
}

.record-item {
  display: flex;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f5f5f5;

  &:last-child {
    border-bottom: none;
  }
}

.record-icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 76rpx;
  height: 76rpx;
  border-radius: 50%;
}

.record-info {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  margin-left: 20rpx;
}

.record-title {
  font-size: 30rpx;
  color: #333;
}

.record-sub {
  margin-top: 6rpx;
  overflow: hidden;
  font-size: 24rpx;
  color: #999;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.record-amount {
  margin-left: 20rpx;
  font-size: 32rpx;
  font-weight: 600;

  &.income {
    color: #52c41a;
  }

  &.expense {
    color: #333;
  }
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40rpx 0 20rpx;
}

.empty-text {
  margin-top: 16rpx;
  font-size: 26rpx;
  color: #999;
}

.empty-btn {
  padding: 14rpx 44rpx;
  margin-top: 24rpx;
  font-size: 28rpx;
  color: #fff;
  background: #ffc000;
  border-radius: 999rpx;
}

.tip-section {
  display: flex;
  flex-direction: column;
}

.tip-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #666;
}

.tip-text {
  margin-top: 10rpx;
  font-size: 24rpx;
  line-height: 1.7;
  color: #999;
}
</style>
