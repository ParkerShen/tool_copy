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

    <!-- 工具入口 -->
    <view class="tools-section">
      <view class="section-header">
        <text class="section-title">工具</text>
        <view class="quick-add" @click="goQuickAdd">
          <wd-icon name="add" size="13px" color="#ff9f00" />
          <text class="quick-add-text">记一笔</text>
        </view>
      </view>

      <view class="tool-grid">
        <view class="tool-card" @click="goBookkeeping(false)">
          <view class="tool-head">
            <view class="tool-icon bg-orange">
              <wd-icon name="money-circle" size="22px" color="#ff9f00" />
            </view>
            <text class="tool-name">记账</text>
          </view>
          <text class="tool-value">¥{{ money(monthStats.expense) }}</text>
          <text class="tool-sub">本月支出</text>
        </view>

        <view class="tool-card" @click="goDiary">
          <view class="tool-head">
            <view class="tool-icon bg-blue">
              <wd-icon name="note" size="22px" color="#4d80f0" />
            </view>
            <text class="tool-name">日记</text>
          </view>
          <text class="tool-value">{{ diaryStats.total }} 篇</text>
          <text class="tool-sub">
            连续 {{ diaryStats.streak }} 天 · 本月 {{ diaryStats.monthCount }} 篇
          </text>
        </view>

        <view class="tool-card" @click="goDayMaster">
          <view class="tool-head">
            <view class="tool-icon bg-red">
              <wd-icon name="calendar" size="22px" color="#f5222d" />
            </view>
            <text class="tool-name">倒数日</text>
          </view>
          <text class="tool-value tool-value-sm">即将上线</text>
          <text class="tool-sub">重要日子不错过</text>
        </view>

        <view class="tool-card" @click="goMy">
          <view class="tool-head">
            <view class="tool-icon bg-green">
              <wd-icon name="user" size="22px" color="#52c41a" />
            </view>
            <text class="tool-name">我的</text>
          </view>
          <text class="tool-value tool-value-sm">备份与设置</text>
          <text class="tool-sub">导出 SQLite / JSON</text>
        </view>

        <view class="tool-card tool-card-featured" @click="goTagDiary">
          <view class="tool-icon bg-purple">
            <wd-icon name="edit-outline" size="22px" color="#7c5cfc" />
          </view>
          <view class="tool-feature-main">
            <view class="tool-feature-title">
              <text class="tool-name-featured">标签日记</text>
              <text class="tool-feature-badge">AI</text>
            </view>
            <text class="tool-feature-desc">点选标签记录一天，DeepSeek 整理成日志</text>
          </view>
          <view class="tool-feature-side">
            <text class="tool-feature-count">{{ tagDiaryCount }} 篇</text>
            <wd-icon name="arrow-right" size="16px" color="#bbb" />
          </view>
        </view>
      </view>
    </view>

    <!-- 数据说明 -->
    <view class="tip-section">
      <text class="tip-title">数据保存在本机</text>
      <text class="tip-text">
        接口、页面与数据库都运行在这台手机上，不依赖线上服务。你可以在「我的」页导出 SQLite / JSON
        备份。
      </text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue"
import { onShow } from "@dcloudio/uni-app"
import dayjs from "dayjs"
import "dayjs/locale/zh-cn"
import { getMonthlyStats, isLocalDataMode } from "@/api/bookkeeping"
import type { MonthlyStatsResult } from "@/api/bookkeeping/types"
import { getDiaryStats, type DiaryStats } from "@/api/diary"
import { useBookkeepingStore, useTabbarStore } from "@/store"
import { countSavedTagDiaries, readTagDiaryData } from "@/utils/toolData"

dayjs.locale("zh-cn")

const tabbarStore = useTabbarStore()
const bookkeepingStore = useBookkeepingStore()

const today = ref(dayjs())
const monthStats = ref<MonthlyStatsResult>({ income: 0, expense: 0 })
const diaryStats = ref<Omit<DiaryStats, "heatmap" | "moodCounts" | "tagCounts">>({
  total: 0,
  days: 0,
  streak: 0,
  monthCount: 0,
  deleted: 0,
})
const tagDiaryCount = ref(0)

const month = computed(() => today.value.format("YYYY-MM"))

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

/** 读取标签日记在 localStorage 中已保存的篇数 */
function loadTagDiaryCount(): void {
  tagDiaryCount.value = countSavedTagDiaries(readTagDiaryData())
}

async function loadData(): Promise<void> {
  try {
    const statsResponse = await getMonthlyStats(month.value)
    monthStats.value = statsResponse.data || { income: 0, expense: 0 }
  } catch (error) {
    console.error("首页记账数据加载失败:", error)
  }

  try {
    diaryStats.value = await getDiaryStats()
  } catch (error) {
    console.error("首页日记数据加载失败:", error)
  }
}

onShow(() => {
  today.value = dayjs()
  loadTagDiaryCount()
  loadData()
})

onMounted(() => {
  uni.$on("refreshBookkeepingData", loadData)
  // #ifdef H5
  window.addEventListener("pageshow", loadTagDiaryCount)
  // #endif
})

onUnmounted(() => {
  uni.$off("refreshBookkeepingData", loadData)
  // #ifdef H5
  window.removeEventListener("pageshow", loadTagDiaryCount)
  // #endif
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

/** 本地模式直接进入新录入页；远程模式沿用旧弹窗流程 */
function goQuickAdd(): void {
  if (isLocalDataMode) {
    uni.navigateTo({ url: "/pages/BookKeeping/edit?type=expense" })
    return
  }
  goBookkeeping(true)
}

function goDiary(): void {
  tabbarStore.setActiveByPath("pages/Diary/index")
  uni.switchTab({ url: "/pages/Diary/index" })
}

function goDayMaster(): void {
  tabbarStore.setActiveByPath("pages/DayMaster/index")
  uni.switchTab({ url: "/pages/DayMaster/index" })
}

function goMy(): void {
  tabbarStore.setActiveByPath("pages/my/index")
  uni.switchTab({ url: "/pages/my/index" })
}

/** 标签日记是随 H5 一起打包的独立静态页 */
function goTagDiary(): void {
  // #ifdef H5
  window.location.href = "/static/tag-diary/index.html?from=mobile"
  // #endif
  // #ifndef H5
  uni.showToast({ title: "标签日记请在 H5 / 手机浏览器中使用", icon: "none" })
  // #endif
}
</script>

<style scoped lang="scss">
.home-page {
  box-sizing: border-box;
  min-height: 100vh;
  padding: 30rpx 30rpx calc(40rpx + env(safe-area-inset-bottom));
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

.tools-section {
  margin-top: 36rpx;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}

.section-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #222;
}

.quick-add {
  display: flex;
  align-items: center;
  padding: 8rpx 20rpx;
  background: #fff7e0;
  border-radius: 999rpx;
}

.quick-add-text {
  margin-left: 4rpx;
  font-size: 24rpx;
  color: #ff9f00;
}

.tool-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20rpx;
}

.tool-card {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 26rpx;
  background: #fff;
  border-radius: 24rpx;
  box-shadow: 0 4rpx 18rpx rgb(31 35 41 / 4%);
  transition: transform 0.15s ease;
}

.tool-card:active {
  transform: scale(0.97);
}

.tool-head {
  display: flex;
  align-items: center;
  min-width: 0;
}

.tool-icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 64rpx;
  height: 64rpx;
  border-radius: 18rpx;
}

.tool-name {
  margin-left: 14rpx;
  overflow: hidden;
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tool-value {
  margin-top: 22rpx;
  overflow: hidden;
  font-size: 38rpx;
  font-weight: 700;
  line-height: 1.2;
  color: #222;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tool-value-sm {
  font-size: 32rpx;
}

.tool-sub {
  margin-top: 8rpx;
  overflow: hidden;
  font-size: 22rpx;
  color: #999;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bg-orange {
  background: #fff7e0;
}

.bg-blue {
  background: #eef4ff;
}

.bg-red {
  background: #fff1f0;
}

.bg-green {
  background: #effaeb;
}

.bg-purple {
  background: #f3efff;
}

.tool-card-featured {
  grid-column: 1 / -1;
  flex-direction: row;
  align-items: center;
  gap: 18rpx;
}

.tool-feature-main {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.tool-feature-title {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.tool-name-featured {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
}

.tool-feature-badge {
  padding: 2rpx 10rpx;
  font-size: 18rpx;
  font-weight: 700;
  color: #7c5cfc;
  letter-spacing: 0.5rpx;
  background: #f0ebff;
  border-radius: 999rpx;
}

.tool-feature-desc {
  margin-top: 6rpx;
  overflow: hidden;
  font-size: 22rpx;
  color: #999;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tool-feature-side {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 8rpx;
}

.tool-feature-count {
  font-size: 30rpx;
  font-weight: 700;
  color: #222;
}

.plus {
  color: #52c41a;
}

.minus {
  color: #ff4d4f;
}

.tip-section {
  display: flex;
  flex-direction: column;
  padding: 30rpx;
  margin-top: 28rpx;
  background: #fff;
  border-radius: 24rpx;
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
