<!--
 * 日记回收站：恢复或彻底删除已删除的日记。
-->
<route lang="json5" type="page">
{
  layout: "default",
  style: {
    navigationBarTitleText: "回收站",
    navigationBarBackgroundColor: "#FFFFFF",
  },
}
</route>

<template>
  <view class="recycle-page">
    <diary-navbar title="回收站">
      <template #right>
        <text v-if="entries.length" class="clear-link" @click="handleEmpty">清空回收站</text>
      </template>
    </diary-navbar>
    <view class="recycle-body">
      <text class="recycle-tip">
        删除的日记会先放在这里，恢复后会回到原来的日期。彻底删除后无法找回。
      </text>

      <view v-if="entries.length === 0" class="empty">
        <wd-icon name="delete" size="46px" color="#ddd" />
        <text class="empty-text">回收站是空的</text>
      </view>

      <view v-for="entry in entries" :key="entry.id" class="recycle-card">
        <view class="entry-main">
          <view class="entry-title-row">
            <text class="entry-mood">{{ moodEmoji(entry) }}</text>
            <text class="entry-title">{{ entryTitle(entry) }}</text>
          </view>
          <text class="entry-excerpt">{{ entryExcerpt(entry) }}</text>
          <view class="entry-meta">
            <text>{{ entry.date }}</text>
            <text class="dot">·</text>
            <text>删除于 {{ formatDeletedAt(entry.deletedAt) }}</text>
          </view>
        </view>
        <view class="entry-actions">
          <text class="action restore" @click="handleRestore(entry)">恢复</text>
          <text class="action delete" @click="handleDeleteForever(entry)">彻底删除</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from "vue"
import { onShow } from "@dcloudio/uni-app"
import dayjs from "dayjs"
import {
  deleteDiaryEntryForever,
  emptyDiaryRecycleBin,
  listDeletedDiaryEntries,
  restoreDiaryEntry,
  type DiaryEntry,
} from "@/api/diary"
import { getMoodOption } from "@/api/diary/types"
import DiaryNavbar from "@/components/diary-navbar/diary-navbar.vue"

const entries = ref<DiaryEntry[]>([])

async function loadEntries(): Promise<void> {
  try {
    entries.value = await listDeletedDiaryEntries()
  } catch (error) {
    console.error("[diary] 读取回收站失败:", error)
    uni.showToast({ title: "读取失败", icon: "none" })
  }
}

onShow(() => {
  loadEntries()
})

function moodEmoji(entry: DiaryEntry): string {
  return getMoodOption(entry.mood).emoji
}

function entryTitle(entry: DiaryEntry): string {
  if (entry.title.trim()) return entry.title
  const firstLine = entry.content.trim().split("\n")[0] || ""
  return firstLine.slice(0, 20) || "无标题"
}

function entryExcerpt(entry: DiaryEntry): string {
  const title = entry.title.trim()
  if (!title) {
    const lines = entry.content.trim().split("\n")
    const rest = lines.slice(1).join(" ").replace(/\s+/g, " ").trim()
    return rest ? rest.slice(0, 50) + (rest.length > 50 ? "…" : "") : ""
  }
  const text = entry.content.replace(/\s+/g, " ").trim()
  if (!text || text === title) return ""
  return text.slice(0, 50) + (text.length > 50 ? "…" : "")
}

function formatDeletedAt(timestamp: number | null): string {
  if (!timestamp) return "未知"
  return dayjs(timestamp).format("M月D日 HH:mm")
}

async function handleRestore(entry: DiaryEntry): Promise<void> {
  try {
    await restoreDiaryEntry(entry.id)
    await loadEntries()
    uni.showToast({ title: "已恢复", icon: "success" })
  } catch (error) {
    console.error("[diary] 恢复失败:", error)
    uni.showToast({ title: "恢复失败", icon: "none" })
  }
}

function handleDeleteForever(entry: DiaryEntry): void {
  uni.showModal({
    title: "彻底删除",
    content: "删除后无法恢复，确定继续吗？",
    confirmText: "删除",
    success: async (result) => {
      if (!result.confirm) return
      try {
        await deleteDiaryEntryForever(entry.id)
        await loadEntries()
        uni.showToast({ title: "已删除", icon: "success" })
      } catch (error) {
        console.error("[diary] 删除失败:", error)
        uni.showToast({ title: "删除失败", icon: "none" })
      }
    },
  })
}

function handleEmpty(): void {
  uni.showModal({
    title: "清空回收站",
    content: "回收站中的日记将被彻底删除，无法恢复。确定继续吗？",
    confirmText: "清空",
    success: async (result) => {
      if (!result.confirm) return
      try {
        const count = await emptyDiaryRecycleBin()
        await loadEntries()
        uni.showToast({ title: `已清空 ${count} 篇`, icon: "success" })
      } catch (error) {
        console.error("[diary] 清空失败:", error)
        uni.showToast({ title: "清空失败", icon: "none" })
      }
    },
  })
}
</script>

<style scoped lang="scss">
.recycle-page {
  min-height: 100vh;
  background: #f6f7f9;
}

.recycle-body {
  padding: 20rpx 30rpx 120rpx;
}

.clear-link {
  font-size: 26rpx;
  color: #f5222d;
}

.recycle-tip {
  display: block;
  margin-top: 16rpx;
  font-size: 24rpx;
  line-height: 1.6;
  color: #999;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 160rpx;
}

.empty-text {
  margin-top: 20rpx;
  font-size: 26rpx;
  color: #999;
}

.recycle-card {
  padding: 26rpx;
  margin-top: 22rpx;
  background: #fff;
  border-radius: 24rpx;
}

.entry-main {
  display: flex;
  flex-direction: column;
}

.entry-title-row {
  display: flex;
  gap: 10rpx;
  align-items: center;
}

.entry-mood {
  font-size: 32rpx;
}

.entry-title {
  overflow: hidden;
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.entry-excerpt {
  margin-top: 10rpx;
  font-size: 24rpx;
  line-height: 1.5;
  color: #999;
}

.entry-meta {
  display: flex;
  gap: 8rpx;
  align-items: center;
  margin-top: 14rpx;
  font-size: 22rpx;
  color: #bbb;
}

.dot {
  color: #ddd;
}

.entry-actions {
  display: flex;
  justify-content: flex-end;
  gap: 16rpx;
  padding-top: 20rpx;
  margin-top: 20rpx;
  border-top: 1rpx solid #f5f5f5;
}

.action {
  padding: 10rpx 26rpx;
  font-size: 24rpx;
  border-radius: 999rpx;
}

.action.restore {
  color: #2f88ff;
  background: #eef4ff;
}

.action.delete {
  color: #f5222d;
  background: #fff1f0;
}
</style>
