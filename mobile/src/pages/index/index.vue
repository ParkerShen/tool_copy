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
    <HomeScene class="home-scene" />

    <view class="home-main">
      <!-- 本地状态 -->
      <view class="top-row">
        <view class="status-pill">
          <svg class="status-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M7 18a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 17.8 9.6 3.9 3.9 0 0 1 17.5 18"
              stroke="#fff"
              stroke-width="1.7"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="m9.7 14.6 1.7 1.7 3.3-3.4"
              stroke="#fff"
              stroke-width="1.7"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <text class="status-text">本地 · 数据不上传</text>
        </view>
      </view>

      <!-- 问候 -->
      <view class="greeting">{{ greeting }} <text class="wave">👋</text></view>
      <view class="date">{{ today.format("YYYY年MM月DD日 dddd") }}</view>
      <view class="quote">
        <text>生活很简单，</text>
        <text>把重要的事做好就够了。</text>
      </view>

      <!-- 快速入口 -->
      <view class="quick-card" @click="openQuickActions">
        <svg
          class="quick-art"
          viewBox="0 0 660 154"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="qa-sky" x1="0" y1="0" x2="1" y2="0.7">
              <stop offset="0" stop-color="#5c98c7" />
              <stop offset="0.34" stop-color="#7cb2d8" />
              <stop offset="0.68" stop-color="#b9d9ea" />
              <stop offset="1" stop-color="#e6f1f5" />
            </linearGradient>
            <linearGradient id="qa-shade" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stop-color="#2e6896" stop-opacity="0.26" />
              <stop offset="0.5" stop-color="#2e6896" stop-opacity="0.18" />
              <stop offset="0.82" stop-color="#2e6896" stop-opacity="0.04" />
              <stop offset="1" stop-color="#2e6896" stop-opacity="0" />
            </linearGradient>
            <filter id="qa-blur" x="-40%" y="-80%" width="180%" height="260%">
              <feGaussianBlur stdDeviation="16" />
            </filter>
            <filter id="qa-blur-sm" x="-40%" y="-80%" width="180%" height="260%">
              <feGaussianBlur stdDeviation="7" />
            </filter>
          </defs>
          <rect width="660" height="154" fill="url(#qa-sky)" />
          <ellipse cx="380" cy="44" rx="190" ry="50" fill="#fff" opacity="0.24" filter="url(#qa-blur)" />
          <ellipse cx="500" cy="126" rx="220" ry="54" fill="#f4fbff" opacity="0.5" filter="url(#qa-blur)" />
          <ellipse cx="90" cy="140" rx="170" ry="60" fill="#fff" opacity="0.4" filter="url(#qa-blur)" />
          <path
            d="M0 112 78 78l72 26 78-40 86 44 76-28 82 30 86-36 102 32v48H0Z"
            fill="#7da4c6"
            opacity="0.19"
            filter="url(#qa-blur-sm)"
          />
          <path
            d="M0 128 100 102l96 20 96-28 96 30 118-24 154 22v32H0Z"
            fill="#5c87ad"
            opacity="0.14"
            filter="url(#qa-blur-sm)"
          />
          <path
            d="M0 140c118-12 246 8 372-2 102-8 190 8 288-2v18H0Z"
            fill="#f0e3ca"
            opacity="0.38"
            filter="url(#qa-blur-sm)"
          />
          <ellipse cx="322" cy="38" rx="96" ry="22" fill="#fff" opacity="0.42" filter="url(#qa-blur-sm)" />
          <ellipse cx="462" cy="26" rx="68" ry="16" fill="#fff" opacity="0.34" filter="url(#qa-blur-sm)" />
          <ellipse cx="150" cy="90" rx="110" ry="34" fill="#fff" opacity="0.26" filter="url(#qa-blur-sm)" />
          <rect width="520" height="154" fill="url(#qa-shade)" />
          <g fill="#fff" opacity="0.18">
            <circle cx="118" cy="58" r="2" />
            <circle cx="256" cy="38" r="1.5" />
            <circle cx="392" cy="66" r="1.8" />
            <circle cx="548" cy="48" r="1.5" />
            <circle cx="588" cy="92" r="2.2" />
            <circle cx="92" cy="100" r="1.5" />
          </g>
        </svg>

        <view class="quick-icon">
          <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="24" cy="24" r="13.5" stroke="#33587f" stroke-width="2" />
            <path d="M31 17 26 26l-9 5 5-9Z" fill="#33587f" />
            <circle cx="24" cy="24" r="1.6" fill="#fff" />
          </svg>
        </view>

        <view class="quick-copy">
          <text class="quick-title">快速进入工具</text>
          <text class="quick-sub">一键打开你需要的功能</text>
        </view>

        <view class="quick-arrow">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="m9.5 5.5 6.5 6.5-6.5 6.5"
              stroke="#fff"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </view>
      </view>

      <!-- 工具 -->
      <view class="tools-head">
        <view class="tools-title-wrap">
          <text class="tools-title">我的工具</text>
        </view>
        <view class="manage-btn" @click="manageTools">
          <svg class="manage-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="3" width="7.5" height="7.5" rx="2" fill="#8a7a5e" />
            <rect x="13.5" y="3" width="7.5" height="7.5" rx="2" fill="#8a7a5e" />
            <rect x="3" y="13.5" width="7.5" height="7.5" rx="2" fill="#8a7a5e" />
            <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" fill="#8a7a5e" />
          </svg>
          <text class="manage-text">管理工具</text>
        </view>
      </view>

      <view class="tool-grid">
        <view
          v-for="tool in tools"
          :key="tool.id"
          class="tool-card"
          :class="[`is-${tool.variant}`, `tone-${tool.tone}`]"
          @click="tool.go()"
        >
          <template v-if="tool.variant === 'tall'">
            <view class="tool-icon">
              <ToolIcon :name="tool.icon" />
            </view>
            <view class="tool-title-row">
              <text class="tool-name">{{ tool.name }}</text>
              <view class="tool-arrow">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="m9.5 5.5 6.5 6.5-6.5 6.5"
                    stroke="#c8beac"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </view>
            </view>
            <text class="tool-desc">{{ tool.desc }}</text>
          </template>

          <template v-else-if="tool.variant === 'wide'">
            <view class="tool-top">
              <view class="tool-icon">
                <ToolIcon :name="tool.icon" />
              </view>
              <text class="tool-name">{{ tool.name }}</text>
              <text v-if="tool.badge" class="tool-badge">{{ tool.badge }}</text>
            </view>
            <text class="tool-desc">{{ tool.desc }}</text>
          </template>

          <template v-else>
            <view class="tool-icon-row">
              <view class="tool-icon">
                <ToolIcon :name="tool.icon" />
              </view>
              <view class="tool-arrow">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="m9.5 5.5 6.5 6.5-6.5 6.5"
                    stroke="#c8beac"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </view>
            </view>
            <text class="tool-name">{{ tool.name }}</text>
            <text class="tool-desc">{{ tool.desc }}</text>
          </template>
        </view>
      </view>

      <!-- 隐私说明 -->
      <view class="privacy-card">
        <svg
          class="privacy-art"
          viewBox="0 0 240 120"
          preserveAspectRatio="xMaxYMax slice"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M0 108c38-26 70-24 96-6 26 18 62 18 92 4 20-10 38-10 52-2v16H0Z" fill="#cfe4bf" opacity="0.55" />
          <path d="M54 108c14-20 30-26 44-18 10 6 12 14 12 18Z" fill="#b9d7a7" opacity="0.6" />
          <path d="M156 108c12-16 26-20 38-14 8 4 10 10 10 14Z" fill="#b9d7a7" opacity="0.5" />
          <circle cx="202" cy="42" r="15" fill="#f4e9b8" opacity="0.8" />
          <path d="M28 82c10-14 22-18 32-12 6 4 8 8 8 12Z" fill="#c4deaf" opacity="0.45" />
        </svg>
        <view class="privacy-icon">
          <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M16 26c0-7 4.5-13.2 12-15.2.4 8.2-4.4 14.2-12 15.2Z"
              fill="#e4f1dc"
              stroke="#79a86b"
              stroke-width="1.3"
              stroke-linejoin="round"
            />
            <path
              d="M16 26c0-7-4.5-13.2-12-15.2-.4 8.2 4.4 14.2 12 15.2Z"
              fill="#cfe6c3"
              stroke="#79a86b"
              stroke-width="1.3"
              stroke-linejoin="round"
            />
            <path
              d="M16 27V15.5"
              stroke="#5c8f50"
              stroke-width="1.6"
              stroke-linecap="round"
            />
          </svg>
        </view>
        <view class="privacy-copy">
          <text class="privacy-title">数据保存在本机</text>
          <text class="privacy-sub">仅在本机存储，保护你的隐私安全。</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from "vue"
import { onShow } from "@dcloudio/uni-app"
import dayjs from "dayjs"
import "dayjs/locale/zh-cn"
import { isLocalDataMode } from "@/api/bookkeeping"
import { useBookkeepingStore, useTabbarStore } from "@/store"
import HomeScene from "./components/HomeScene.vue"
import ToolIcon from "./components/ToolIcon.vue"

dayjs.locale("zh-cn")

type ToolVariant = "tall" | "wide" | "compact"
type ToolTone = "green" | "purple" | "peach" | "blue" | "lilac" | "mint" | "rose" | "sand"

interface ToolItem {
  id: string
  name: string
  desc: string
  variant: ToolVariant
  tone: ToolTone
  icon: string
  badge?: string
  go: () => void
}

const tabbarStore = useTabbarStore()
const bookkeepingStore = useBookkeepingStore()

const today = ref(dayjs())

const greeting = computed(() => {
  const hour = dayjs().hour()
  if (hour < 6) return "夜深了，早点休息"
  if (hour < 12) return "早上好"
  if (hour < 14) return "中午好"
  if (hour < 18) return "下午好"
  return "晚上好"
})

function goBookkeeping(): void {
  tabbarStore.setActiveByPath("pages/BookKeeping/index")
  uni.switchTab({ url: "/pages/BookKeeping/index" })
}

/** 本地模式直接进入新录入页；远程模式沿用旧弹窗流程 */
function goQuickAdd(): void {
  if (isLocalDataMode) {
    uni.navigateTo({ url: "/pages/BookKeeping/edit?type=expense" })
    return
  }
  bookkeepingStore.setShouldShowAdd(true)
  goBookkeeping()
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

function goInventory(): void {
  uni.navigateTo({ url: "/pages/Storage/index" })
}

function goStats(): void {
  uni.navigateTo({ url: "/pages/BookKeeping/stats" })
}

function goAccounts(): void {
  uni.navigateTo({ url: "/pages/BookKeeping/accounts" })
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

function goDiaryCreate(): void {
  uni.navigateTo({ url: "/pages/Diary/edit" })
}

function goCountdownCreate(): void {
  uni.navigateTo({ url: "/pages/DayMaster/edit" })
}

const quickActions: Array<() => void> = [goQuickAdd, goDiaryCreate, goCountdownCreate, goTagDiary]

function openQuickActions(): void {
  uni.showActionSheet({
    itemList: ["记一笔", "写日记", "添加倒数日", "标签日记"],
    success: (res) => {
      quickActions[res.tapIndex]?.()
    },
  })
}

function manageTools(): void {
  uni.showToast({ title: "工具管理即将上线", icon: "none" })
}

const tools: ToolItem[] = [
  {
    id: "bookkeeping",
    name: "记账",
    desc: "记录每一笔收支\n管理财务状况",
    variant: "tall",
    tone: "green",
    icon: "receipt",
    go: goBookkeeping,
  },
  {
    id: "diary",
    name: "日记",
    desc: "写下今天的心情\n留住生活的片段",
    variant: "tall",
    tone: "purple",
    icon: "book",
    go: goDiary,
  },
  {
    id: "countdown",
    name: "倒数日",
    desc: "重要的日子\n不再错过",
    variant: "tall",
    tone: "peach",
    icon: "calendar",
    go: goDayMaster,
  },
  {
    id: "my",
    name: "我的",
    desc: "备份与设置\n管理你的数据",
    variant: "tall",
    tone: "blue",
    icon: "folder",
    go: goMy,
  },
  {
    id: "tag-diary",
    name: "标签日记",
    desc: "点选标签记录一天\nDeepSeek 整理成日志",
    variant: "wide",
    tone: "lilac",
    icon: "pen",
    badge: "AI",
    go: goTagDiary,
  },
  {
    id: "storage",
    name: "收纳",
    desc: "家里物品与位置\n保修到期提醒",
    variant: "wide",
    tone: "mint",
    icon: "box",
    go: goInventory,
  },
  {
    id: "stats",
    name: "统计",
    desc: "收支趋势与分类排行",
    variant: "compact",
    tone: "rose",
    icon: "chart",
    go: goStats,
  },
  {
    id: "accounts",
    name: "账户",
    desc: "账户余额与资产管理",
    variant: "compact",
    tone: "sand",
    icon: "wallet",
    go: goAccounts,
  },
]

onShow(() => {
  today.value = dayjs()
})
</script>

<style scoped lang="scss">
.home-page {
  position: relative;
  box-sizing: border-box;
  min-height: 100vh;
  overflow-x: hidden;
  background-color: #f8f0de;
  background-image:
    radial-gradient(circle at 18% 24%, rgb(255 255 255 / 22%), transparent 42%),
    radial-gradient(circle at 82% 72%, rgb(255 248 230 / 30%), transparent 48%);
}

.home-page::before {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  content: "";
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E");
  background-repeat: repeat;
}

.home-scene {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 0;
  width: 100%;
  height: 680rpx;
}

.home-main {
  position: relative;
  z-index: 1;
  box-sizing: border-box;
  min-height: 100vh;
  padding: calc(env(safe-area-inset-top) + 18rpx) 44rpx calc(40rpx + env(safe-area-inset-bottom));
}

/* 顶部状态 */
.top-row {
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  height: 56rpx;
}

.status-pill {
  display: flex;
  gap: 8rpx;
  align-items: center;
  height: 54rpx;
  padding: 0 20rpx;
  color: #fff;
  background: rgb(174 188 189 / 52%);
  border-radius: 18rpx;
  box-shadow: 0 4rpx 14rpx rgb(70 90 90 / 8%);
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
}

.status-icon {
  flex-shrink: 0;
  width: 27rpx;
  height: 27rpx;
}

.status-text {
  font-family: "PingFang SC", "Helvetica Neue", sans-serif;
  font-size: 21rpx;
  line-height: 1;
  letter-spacing: 0.3rpx;
  white-space: nowrap;
}

/* 问候 */
.greeting {
  margin-top: 4rpx;
  font-family: "Kaiti SC", "STKaiti", "KaiTi", "Songti SC", "STSong", serif;
  font-size: 54rpx;
  font-weight: 600;
  line-height: 1.2;
  color: #2f2a23;
  letter-spacing: 1rpx;
}

.wave {
  font-size: 46rpx;
}

.date {
  margin-top: 16rpx;
  font-family: "Songti SC", "STSong", "SimSun", serif;
  font-size: 25rpx;
  line-height: 1.4;
  color: #4d473d;
  letter-spacing: 0.5rpx;
}

.quote {
  display: flex;
  flex-direction: column;
  margin-top: 14rpx;
  font-family: "Songti SC", "STSong", "SimSun", serif;
  font-size: 25rpx;
  line-height: 1.62;
  color: #5b5346;
  letter-spacing: 0.4rpx;
}

/* 快速入口 */
.quick-card {
  position: relative;
  display: flex;
  align-items: center;
  box-sizing: border-box;
  height: 154rpx;
  padding: 0 28rpx;
  margin-top: 108rpx;
  overflow: hidden;
  border-radius: 34rpx;
  box-shadow:
    0 16rpx 34rpx rgb(84 120 148 / 18%),
    inset 0 0 0 2rpx rgb(255 255 255 / 46%);
}

.quick-card:active {
  transform: scale(0.985);
}

.quick-art {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.quick-icon {
  position: relative;
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 80rpx;
  height: 80rpx;
  background: rgb(255 255 255 / 78%);
  border-radius: 22rpx;
  box-shadow:
    0 6rpx 14rpx rgb(54 84 110 / 12%),
    inset 0 2rpx 0 rgb(255 255 255 / 90%);
}

.quick-icon svg {
  width: 48rpx;
  height: 48rpx;
}

.quick-copy {
  position: relative;
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  margin-left: 18rpx;
}

.quick-title {
  font-family: "PingFang SC", "Helvetica Neue", sans-serif;
  font-size: 30rpx;
  font-weight: 600;
  line-height: 1.25;
  color: #fff;
  letter-spacing: 1rpx;
  text-shadow: 0 2rpx 10rpx rgb(38 80 115 / 32%);
}

.quick-sub {
  margin-top: 5rpx;
  font-family: "PingFang SC", "Helvetica Neue", sans-serif;
  font-size: 21rpx;
  line-height: 1.3;
  color: rgb(255 255 255 / 92%);
  letter-spacing: 0.4rpx;
  text-shadow: 0 1rpx 6rpx rgb(38 80 115 / 26%);
}

.quick-arrow {
  position: relative;
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 40rpx;
  height: 40rpx;
  margin-left: 12rpx;
}

.quick-arrow svg {
  width: 34rpx;
  height: 34rpx;
}

/* 工具标题 */
.tools-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 76rpx;
}

.tools-title-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.tools-title {
  position: relative;
  z-index: 0;
  font-family: "PingFang SC", "Helvetica Neue", sans-serif;
  font-size: 40rpx;
  font-weight: 700;
  color: #2f2a23;
  letter-spacing: 1rpx;
}

.tools-title::after {
  position: absolute;
  right: -6rpx;
  bottom: 2rpx;
  left: -2rpx;
  z-index: -1;
  height: 13rpx;
  content: "";
  background: linear-gradient(90deg, rgb(255 224 122 / 82%), rgb(255 239 176 / 26%));
  border-radius: 8rpx;
  transform: rotate(-1deg);
}

.manage-btn {
  display: flex;
  gap: 8rpx;
  align-items: center;
  height: 52rpx;
  padding: 0 20rpx;
  background: rgb(255 252 244 / 72%);
  border: 1rpx solid #eadfc8;
  border-radius: 14rpx;
}

.manage-btn:active {
  background: rgb(248 240 222 / 90%);
}

.manage-icon {
  width: 24rpx;
  height: 24rpx;
}

.manage-text {
  font-family: "PingFang SC", "Helvetica Neue", sans-serif;
  font-size: 22rpx;
  line-height: 1;
  color: #7a6a4e;
}

/* 工具网格 */
.tool-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24rpx;
  margin-top: 44rpx;
}

.tool-card {
  position: relative;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 24rpx 26rpx;
  overflow: hidden;
  background: linear-gradient(155deg, var(--card-tint) 0%, var(--card-tint-2) 78%);
  border: 1rpx solid rgb(255 255 255 / 62%);
  border-radius: 32rpx;
  box-shadow:
    0 10rpx 24rpx rgb(120 100 60 / 5%),
    inset 0 1rpx 0 rgb(255 255 255 / 72%);
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease;
}

.tool-card:active {
  transform: scale(0.975);
  box-shadow:
    0 4rpx 12rpx rgb(120 100 60 / 6%),
    inset 0 1rpx 0 rgb(255 255 255 / 72%);
}

.is-tall {
  min-height: 250rpx;
}

.is-wide {
  min-height: 170rpx;
  padding: 18rpx 26rpx;
}

.is-compact {
  min-height: 186rpx;
  padding: 20rpx 26rpx 18rpx;
}

/* 图标底座 */
.tool-icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 88rpx;
  height: 88rpx;
  background: var(--icon-bg);
  border-radius: 25rpx;
  box-shadow:
    0 8rpx 16rpx var(--icon-shadow),
    inset 0 2rpx 0 rgb(255 255 255 / 85%);
}

.tool-icon :deep(.tool-glyph) {
  width: 56rpx;
  height: 56rpx;
}

.is-wide .tool-icon {
  width: 66rpx;
  height: 66rpx;
  border-radius: 20rpx;
}

.is-compact .tool-icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 21rpx;
}

.is-wide .tool-icon :deep(.tool-glyph) {
  width: 44rpx;
  height: 44rpx;
}

.is-compact .tool-icon :deep(.tool-glyph) {
  width: 46rpx;
  height: 46rpx;
}

/* 卡片排版 */
.tool-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12rpx;
}

.tool-name {
  font-family: "PingFang SC", "Helvetica Neue", sans-serif;
  font-size: 32rpx;
  font-weight: 600;
  line-height: 1.15;
  color: #33302a;
  letter-spacing: 0.4rpx;
}

.tool-desc {
  margin-top: 4rpx;
  font-family: "PingFang SC", "Helvetica Neue", sans-serif;
  font-size: 22rpx;
  line-height: 1.6;
  color: #8b8375;
  letter-spacing: 0.2rpx;
  white-space: pre-line;
}

.tool-arrow {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 28rpx;
  height: 28rpx;
}

.tool-arrow svg {
  width: 26rpx;
  height: 26rpx;
}

.is-wide .tool-top {
  display: flex;
  align-items: center;
}

.is-wide .tool-name {
  margin-left: 14rpx;
  overflow: visible;
  font-size: 30rpx;
  white-space: nowrap;
}

.is-wide .tool-desc {
  margin-top: 6rpx;
  font-size: 22rpx;
  line-height: 1.5;
}

.is-compact .tool-icon-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.is-compact .tool-name {
  margin-top: 10rpx;
  font-size: 30rpx;
}

.is-compact .tool-desc {
  margin-top: 3rpx;
  font-size: 22rpx;
  line-height: 1.4;
}

.tool-badge {
  flex-shrink: 0;
  padding: 2rpx 7rpx;
  margin-left: 6rpx;
  font-family: "PingFang SC", "Helvetica Neue", sans-serif;
  font-size: 15rpx;
  font-weight: 700;
  line-height: 1.2;
  color: #8a68d8;
  letter-spacing: 0.4rpx;
  background: rgb(255 255 255 / 62%);
  border-radius: 999rpx;
}

/* 卡片配色 */
.tone-green {
  --card-tint: #eef7e5;
  --card-tint-2: #fbfdf8;
  --icon-bg: linear-gradient(145deg, #eef8e2, #d8ecc4);
  --icon-shadow: rgb(126 170 90 / 20%);
}

.tone-purple {
  --card-tint: #f5effc;
  --card-tint-2: #fdfbff;
  --icon-bg: linear-gradient(145deg, #f3e9fd, #e3d3fa);
  --icon-shadow: rgb(140 110 210 / 18%);
}

.tone-peach {
  --card-tint: #fdf2e7;
  --card-tint-2: #fffdfa;
  --icon-bg: linear-gradient(145deg, #fdf0df, #f8ddbf);
  --icon-shadow: rgb(214 150 80 / 18%);
}

.tone-blue {
  --card-tint: #eef4fd;
  --card-tint-2: #fbfdff;
  --icon-bg: linear-gradient(145deg, #ebf3fe, #d8e7fb);
  --icon-shadow: rgb(100 140 200 / 18%);
}

.tone-lilac {
  --card-tint: #f6f0fd;
  --card-tint-2: #fdfbff;
  --icon-bg: linear-gradient(145deg, #f4ebfd, #e5d5fa);
  --icon-shadow: rgb(150 120 210 / 16%);
}

.tone-mint {
  --card-tint: #eef8ef;
  --card-tint-2: #fbfefb;
  --icon-bg: linear-gradient(145deg, #eaf7ec, #d5edda);
  --icon-shadow: rgb(90 160 110 / 16%);
}

.tone-rose {
  --card-tint: #fdf1f1;
  --card-tint-2: #fffbfb;
  --icon-bg: linear-gradient(145deg, #fceeee, #f6dada);
  --icon-shadow: rgb(200 120 120 / 16%);
}

.tone-sand {
  --card-tint: #fbf6ea;
  --card-tint-2: #fffdf9;
  --icon-bg: linear-gradient(145deg, #f9f1df, #efe0c2);
  --icon-shadow: rgb(200 165 105 / 18%);
}

/* 隐私说明 */
.privacy-card {
  position: relative;
  display: flex;
  align-items: center;
  box-sizing: border-box;
  height: 124rpx;
  padding: 0 26rpx;
  margin-top: 24rpx;
  overflow: hidden;
  background: linear-gradient(120deg, #eef7e5 0%, #f6fbf0 100%);
  border-radius: 28rpx;
}

.privacy-art {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 300rpx;
  height: 150rpx;
  opacity: 0.6;
}

.privacy-icon {
  position: relative;
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 58rpx;
  height: 58rpx;
  background: rgb(255 255 255 / 76%);
  border-radius: 50%;
  box-shadow: 0 4rpx 10rpx rgb(110 150 95 / 10%);
}

.privacy-icon svg {
  width: 38rpx;
  height: 38rpx;
}

.privacy-copy {
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  margin-left: 16rpx;
}

.privacy-title {
  font-family: "PingFang SC", "Helvetica Neue", sans-serif;
  font-size: 25rpx;
  font-weight: 600;
  line-height: 1.3;
  color: #426b3b;
  letter-spacing: 0.3rpx;
}

.privacy-sub {
  margin-top: 4rpx;
  font-family: "PingFang SC", "Helvetica Neue", sans-serif;
  font-size: 21rpx;
  line-height: 1.35;
  color: #7e947a;
  letter-spacing: 0.2rpx;
}
</style>
