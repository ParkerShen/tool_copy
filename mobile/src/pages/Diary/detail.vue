<!--
 * 日记详情页。
-->
<route lang="json5" type="page">
{
  layout: "default",
  style: {
    navigationBarTitleText: "日记详情",
    navigationBarBackgroundColor: "#FFFFFF",
  },
}
</route>

<template>
  <view class="detail-page">
    <diary-navbar title="日记详情" />
    <view class="detail-body">
      <view v-if="!entry" class="empty">
        <wd-icon name="note" size="48px" color="#ddd" />
        <text class="empty-text">日记不存在或已被删除</text>
        <view class="empty-btn" @click="goBack">返回</view>
      </view>

      <template v-else>
        <view class="header-card">
          <view class="header-mood" :style="{ backgroundColor: moodColor + '18' }">
            <text class="header-mood-emoji">{{ moodEmoji }}</text>
          </view>
          <view class="header-main">
            <view class="header-title-row">
              <text class="header-title">{{ entryTitle }}</text>
              <wd-icon v-if="entry.pinned" name="pin" size="16px" color="#ff9f00" />
            </view>
            <view class="header-meta">
              <text>{{ formatDate(entry.date) }}</text>
              <text class="dot">·</text>
              <text>{{ moodLabel }}</text>
              <text v-if="weatherText" class="dot">·</text>
              <text v-if="weatherText">{{ weatherText }}</text>
            </view>
          </view>
        </view>

        <view v-if="entry.tags.length" class="tag-list">
          <text v-for="tag in entry.tags" :key="tag" class="tag-chip">#{{ tag }}</text>
        </view>

        <view v-if="entry.content" class="content-card">
          <text class="content-text">{{ entry.content }}</text>
        </view>

        <view v-if="entry.images.length" class="image-list">
          <image
            v-for="(image, index) in entry.images"
            :key="index"
            class="image-item"
            :src="image"
            mode="widthFix"
            @click="previewImage(index)"
          />
        </view>

        <view class="info-card">
          <view class="info-row">
            <text class="info-label">创建时间</text>
            <text class="info-value">{{ formatDateTime(entry.createdAt) }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">最后修改</text>
            <text class="info-value">{{ formatDateTime(entry.updatedAt) }}</text>
          </view>
        </view>

        <view class="bottom-bar">
          <view class="bar-action" @click="handlePin">
            <wd-icon name="pin" size="20px" :color="entry.pinned ? '#ff9f00' : '#666'" />
            <text class="bar-label">{{ entry.pinned ? "取消置顶" : "置顶" }}</text>
          </view>
          <view class="bar-action" @click="goEdit">
            <wd-icon name="edit" size="20px" color="#666" />
            <text class="bar-label">编辑</text>
          </view>
          <view class="bar-action danger" @click="handleDelete">
            <wd-icon name="delete" size="20px" color="#f5222d" />
            <text class="bar-label">删除</text>
          </view>
        </view>
      </template>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from "vue"
import { onLoad, onShow } from "@dcloudio/uni-app"
import dayjs from "dayjs"
import { getDiaryEntry, softDeleteDiaryEntry, toggleDiaryPin, type DiaryEntry } from "@/api/diary"
import { getMoodOption, getWeatherOption } from "@/api/diary/types"
import DiaryNavbar from "@/components/diary-navbar/diary-navbar.vue"

const entryId = ref("")
const entry = ref<DiaryEntry | null>(null)

const moodOption = computed(() => getMoodOption(entry.value?.mood || "neutral"))
const moodEmoji = computed(() => moodOption.value.emoji)
const moodColor = computed(() => moodOption.value.color)
const moodLabel = computed(() => moodOption.value.label)
const weatherText = computed(() => {
  const weather = getWeatherOption(entry.value?.weather || "")
  return weather ? `${weather.emoji} ${weather.label}` : ""
})
const entryTitle = computed(() => {
  if (!entry.value) return ""
  if (entry.value.title.trim()) return entry.value.title
  const firstLine = entry.value.content.trim().split("\n")[0] || ""
  return firstLine.slice(0, 20) || "无标题"
})
const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"]

function formatDate(date: string): string {
  const value = dayjs(date)
  return `${value.format("YYYY年M月D日")} ${weekdays[value.day()]}`
}

function formatDateTime(timestamp: number): string {
  return dayjs(timestamp).format("YYYY-MM-DD HH:mm")
}

async function loadEntry(): Promise<void> {
  if (!entryId.value) return
  const found = await getDiaryEntry(entryId.value)
  entry.value = found && !found.deletedAt ? found : null
}

onLoad((options) => {
  entryId.value = String(options?.id || "")
  loadEntry()
})

onShow(() => {
  loadEntry()
})

function goBack(): void {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack()
    return
  }
  uni.switchTab({ url: "/pages/Diary/index" })
}

function goEdit(): void {
  if (!entry.value) return
  uni.navigateTo({ url: `/pages/Diary/edit?id=${entry.value.id}` })
}

function previewImage(index: number): void {
  if (!entry.value) return
  uni.previewImage({ current: index, urls: entry.value.images })
}

async function handlePin(): Promise<void> {
  if (!entry.value) return
  const next = await toggleDiaryPin(entry.value.id)
  if (next) {
    entry.value = next
    uni.showToast({ title: next.pinned ? "已置顶" : "已取消置顶", icon: "none" })
  }
}

function handleDelete(): void {
  if (!entry.value) return
  const id = entry.value.id
  uni.showModal({
    title: "删除日记",
    content: "删除后会进入回收站，可以随时恢复。确定继续吗？",
    confirmText: "删除",
    success: async (result) => {
      if (!result.confirm) return
      try {
        await softDeleteDiaryEntry(id)
        uni.showToast({ title: "已移入回收站", icon: "success" })
        setTimeout(() => uni.navigateBack(), 400)
      } catch (error) {
        console.error("[diary] 删除失败:", error)
        uni.showToast({ title: "删除失败", icon: "none" })
      }
    },
  })
}
</script>

<style scoped lang="scss">
.detail-page {
  min-height: 100vh;
  background: #f6f7f9;
}

.detail-body {
  padding: 24rpx 30rpx 200rpx;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 180rpx;
}

.empty-text {
  margin-top: 20rpx;
  font-size: 26rpx;
  color: #999;
}

.empty-btn {
  padding: 18rpx 50rpx;
  margin-top: 30rpx;
  font-size: 28rpx;
  color: #fff;
  background: #2f88ff;
  border-radius: 999rpx;
}

.header-card {
  display: flex;
  align-items: center;
  padding: 30rpx;
  background: #fff;
  border-radius: 24rpx;
}

.header-mood {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 96rpx;
  height: 96rpx;
  border-radius: 28rpx;
}

.header-mood-emoji {
  font-size: 50rpx;
}

.header-main {
  flex: 1;
  min-width: 0;
  margin-left: 24rpx;
}

.header-title-row {
  display: flex;
  gap: 10rpx;
  align-items: center;
}

.header-title {
  overflow: hidden;
  font-size: 36rpx;
  font-weight: 600;
  color: #222;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.header-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
  align-items: center;
  margin-top: 12rpx;
  font-size: 24rpx;
  color: #999;
}

.dot {
  color: #ddd;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 20rpx;
}

.tag-chip {
  padding: 10rpx 22rpx;
  font-size: 24rpx;
  color: #4d80f0;
  background: #eef4ff;
  border-radius: 999rpx;
}

.content-card {
  padding: 30rpx;
  margin-top: 24rpx;
  background: #fff;
  border-radius: 24rpx;
}

.content-text {
  font-size: 30rpx;
  line-height: 1.8;
  color: #333;
  word-break: break-word;
  white-space: pre-wrap;
}

.image-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  margin-top: 24rpx;
}

.image-item {
  width: 100%;
  height: auto;
  overflow: hidden;
  border-radius: 20rpx;
}

.info-card {
  padding: 10rpx 30rpx;
  margin-top: 24rpx;
  background: #fff;
  border-radius: 24rpx;
}

.info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 0;
  border-top: 1rpx solid #f5f5f5;

  &:first-child {
    border-top: none;
  }
}

.info-label {
  font-size: 24rpx;
  color: #999;
}

.info-value {
  font-size: 24rpx;
  color: #666;
}

.bottom-bar {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 20;
  display: flex;
  justify-content: space-around;
  padding: 18rpx 30rpx calc(18rpx + env(safe-area-inset-bottom));
  background: #fff;
  box-shadow: 0 -2rpx 16rpx rgb(0 0 0 / 4%);
}

.bar-action {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8rpx 30rpx;
}

.bar-label {
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #666;
}

.bar-action.danger .bar-label {
  color: #f5222d;
}
</style>
