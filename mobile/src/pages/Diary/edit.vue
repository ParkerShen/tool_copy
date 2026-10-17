<!--
 * 新建 / 编辑日记。
 * 通过 /pages/Diary/edit?id=xxx 编辑，或 ?date=YYYY-MM-DD 指定日期新建。
-->
<route lang="json5" type="page">
{
  layout: "default",
  style: {
    navigationBarTitleText: "写日记",
    navigationBarBackgroundColor: "#FFFFFF",
  },
}
</route>

<template>
  <view class="edit-page">
    <diary-navbar :title="form.id ? '编辑日记' : '写日记'" />
    <view class="edit-body">
      <view class="card">
        <view class="meta-row">
          <text class="meta-label">日期</text>
          <picker mode="date" :value="form.date" @change="handleDateChange">
            <view class="meta-value">
              <text>{{ dayjs(form.date).format("YYYY年M月D日") }}</text>
              <wd-icon name="chevron-right" size="16px" color="#bbb" />
            </view>
          </picker>
        </view>
        <view class="meta-row">
          <text class="meta-label">置顶</text>
          <view
            class="pin-toggle"
            :class="{ active: form.pinned }"
            @click="form.pinned = !form.pinned"
          >
            <wd-icon name="pin" size="16px" :color="form.pinned ? '#fff' : '#999'" />
            <text class="pin-text">{{ form.pinned ? "已置顶" : "置顶" }}</text>
          </view>
        </view>
        <view v-if="!form.id && mailAvailable" class="meta-row">
          <text class="meta-label">邮件通知</text>
          <view class="mail-toggle" :class="{ active: sendMail }" @click="sendMail = !sendMail">
            <wd-icon name="mail" size="16px" :color="sendMail ? '#fff' : '#999'" />
            <text class="mail-text">{{ sendMail ? "发送" : "不发送" }}</text>
          </view>
        </view>
      </view>

      <view class="card">
        <text class="block-title">今天心情</text>
        <view class="mood-grid">
          <view
            v-for="mood in moods"
            :key="mood.key"
            class="mood-item"
            :class="{ active: form.mood === mood.key }"
            :style="
              form.mood === mood.key
                ? { borderColor: mood.color, backgroundColor: mood.color + '14' }
                : {}
            "
            @click="form.mood = mood.key"
          >
            <text class="mood-emoji">{{ mood.emoji }}</text>
            <text class="mood-label">{{ mood.label }}</text>
          </view>
        </view>
      </view>

      <view class="card">
        <text class="block-title">天气</text>
        <view class="weather-row">
          <view
            class="weather-item"
            :class="{ active: form.weather === '' }"
            @click="form.weather = ''"
          >
            不记录
          </view>
          <view
            v-for="weather in weathers"
            :key="weather.key"
            class="weather-item"
            :class="{ active: form.weather === weather.key }"
            @click="form.weather = weather.key"
          >
            {{ weather.emoji }} {{ weather.label }}
          </view>
        </view>
      </view>

      <view class="card">
        <input
          v-model="form.title"
          class="title-input"
          placeholder="标题（可不填）"
          maxlength="60"
        />
        <textarea
          v-model="form.content"
          class="content-input"
          placeholder="今天发生了什么？"
          auto-height
          :maxlength="-1"
        />
        <text class="word-count">{{ form.content.length }} 字</text>
      </view>

      <view class="card">
        <view class="block-header">
          <text class="block-title">图片</text>
          <text class="block-sub">{{ form.images.length }}/9</text>
        </view>
        <view class="image-grid">
          <view v-for="(image, index) in form.images" :key="index" class="image-item">
            <image
              :src="image"
              mode="aspectFill"
              class="image-preview"
              @click="previewImage(index)"
            />
            <view class="image-remove" @click.stop="removeImage(index)">
              <wd-icon name="close" size="12px" color="#fff" />
            </view>
          </view>
          <view v-if="form.images.length < 9" class="image-add" @click="handlePickImages">
            <wd-icon name="add" size="26px" color="#bbb" />
            <text class="image-add-text">添加图片</text>
          </view>
        </view>
      </view>

      <view class="card">
        <text class="block-title">标签</text>
        <view v-if="form.tags.length" class="tag-list">
          <view v-for="(tag, index) in form.tags" :key="tag" class="tag-chip">
            #{{ tag }}
            <wd-icon name="close" size="12px" color="#7aa7e8" @click="removeTag(index)" />
          </view>
        </view>
        <view class="tag-input-row">
          <input
            v-model="tagInput"
            class="tag-input"
            placeholder="输入标签，如：旅行、工作"
            confirm-type="done"
            @confirm="addTag"
          />
          <view class="tag-add-btn" @click="addTag">添加</view>
        </view>
      </view>
    </view>

    <view class="bottom-bar">
      <view v-if="form.id" class="delete-btn" @click="handleDelete">
        <wd-icon name="delete" size="18px" color="#f5222d" />
        <text>删除</text>
      </view>
      <view class="save-btn" @click="handleSave">保存日记</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { reactive, ref } from "vue"
import { onLoad } from "@dcloudio/uni-app"
import dayjs from "dayjs"
import {
  getDiaryEntry,
  saveDiaryEntry,
  softDeleteDiaryEntry,
  type DiaryMoodKey,
  type DiaryWeatherKey,
} from "@/api/diary"
import { DIARY_MOODS, DIARY_WEATHERS } from "@/api/diary/types"
import { pickDiaryImages } from "@/api/diary/image"
import { isDiaryMailConfigured, queueDiaryMail } from "@/api/diary/mail"
import DiaryNavbar from "@/components/diary-navbar/diary-navbar.vue"

const moods = DIARY_MOODS
const weathers = DIARY_WEATHERS

const tagInput = ref("")
// 新建日记时是否发送邮件通知，默认发送
const sendMail = ref(true)
const mailAvailable = isDiaryMailConfigured()
const form = reactive({
  id: "",
  title: "",
  content: "",
  date: dayjs().format("YYYY-MM-DD"),
  mood: "neutral" as DiaryMoodKey,
  weather: "" as DiaryWeatherKey | "",
  tags: [] as string[],
  images: [] as string[],
  pinned: false,
})

onLoad(async (options) => {
  const id = String(options?.id || "")
  const date = String(options?.date || "")
  if (id) {
    const entry = await getDiaryEntry(id)
    if (entry) {
      form.id = entry.id
      form.title = entry.title
      form.content = entry.content
      form.date = entry.date
      form.mood = entry.mood
      form.weather = entry.weather
      form.tags = [...entry.tags]
      form.images = [...entry.images]
      form.pinned = entry.pinned
      uni.setNavigationBarTitle({ title: "编辑日记" })
    } else {
      uni.showToast({ title: "日记不存在", icon: "none" })
    }
  } else if (date) {
    form.date = dayjs(date).isValid() ? dayjs(date).format("YYYY-MM-DD") : form.date
  }
})

function handleDateChange(event: any): void {
  const value = event?.detail?.value
  if (value) form.date = value
}

function addTag(): void {
  const value = tagInput.value.trim().replace(/^#/, "")
  if (!value) return
  if (!form.tags.includes(value)) form.tags.push(value)
  tagInput.value = ""
}

function removeTag(index: number): void {
  form.tags.splice(index, 1)
}

async function handlePickImages(): Promise<void> {
  const remain = 9 - form.images.length
  if (remain <= 0) return
  try {
    uni.showLoading({ title: "处理图片…", mask: true })
    const images = await pickDiaryImages()
    uni.hideLoading()
    form.images.push(...images.slice(0, remain))
  } catch (error) {
    uni.hideLoading()
    console.warn("[diary] 选择图片失败:", error)
    uni.showToast({ title: "图片添加失败", icon: "none" })
  }
}

function removeImage(index: number): void {
  form.images.splice(index, 1)
}

function previewImage(index: number): void {
  uni.previewImage({
    current: index,
    urls: form.images,
  })
}

function goBack(): void {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack()
    return
  }
  uni.switchTab({ url: "/pages/Diary/index" })
}

async function handleSave(): Promise<void> {
  if (!form.title.trim() && !form.content.trim() && form.images.length === 0) {
    uni.showToast({ title: "写点什么再保存吧", icon: "none" })
    return
  }

  try {
    uni.showLoading({ title: "保存中…", mask: true })
    const isNew = !form.id
    const saved = await saveDiaryEntry({
      id: form.id || undefined,
      title: form.title,
      content: form.content,
      date: form.date,
      mood: form.mood,
      weather: form.weather,
      tags: form.tags,
      images: form.images,
      pinned: form.pinned,
    })
    uni.hideLoading()
    // 仅新建的日记发邮件通知；发送失败会留在队列里稍后重试
    if (isNew && sendMail.value) queueDiaryMail(saved)
    uni.showToast({ title: "已保存", icon: "success" })
    setTimeout(goBack, 400)
  } catch (error) {
    uni.hideLoading()
    console.error("[diary] 保存失败:", error)
    uni.showToast({
      title: error instanceof Error ? error.message : "保存失败",
      icon: "none",
    })
  }
}

function handleDelete(): void {
  uni.showModal({
    title: "删除日记",
    content: "删除后会进入回收站，可以随时恢复。确定继续吗？",
    confirmText: "删除",
    success: async (result) => {
      if (!result.confirm) return
      try {
        await softDeleteDiaryEntry(form.id)
        uni.showToast({ title: "已移入回收站", icon: "success" })
        setTimeout(goBack, 400)
      } catch (error) {
        console.error("[diary] 删除失败:", error)
        uni.showToast({ title: "删除失败", icon: "none" })
      }
    },
  })
}
</script>

<style scoped lang="scss">
.edit-page {
  min-height: 100vh;
  background: #f6f7f9;
}

.edit-body {
  padding: 24rpx 30rpx 200rpx;
}

.card {
  padding: 28rpx;
  margin-bottom: 24rpx;
  background: #fff;
  border-radius: 24rpx;
}

.meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14rpx 0;
  border-top: 1rpx solid #f5f5f5;

  &:first-child {
    border-top: none;
  }
}

.meta-label {
  font-size: 28rpx;
  color: #666;
}

.meta-value {
  display: flex;
  align-items: center;
  gap: 8rpx;
  font-size: 28rpx;
  color: #333;
}

.pin-toggle,
.mail-toggle {
  display: inline-flex;
  gap: 8rpx;
  align-items: center;
  padding: 10rpx 22rpx;
  font-size: 24rpx;
  color: #999;
  background: #f6f7f9;
  border-radius: 999rpx;

  &.active {
    color: #fff;
    background: #ffb020;
  }
}

.mail-toggle.active {
  background: #2f88ff;
}

.pin-text,
.mail-text {
  font-size: 24rpx;
}

.block-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
}

.block-sub {
  font-size: 22rpx;
  color: #aaa;
}

.block-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.mood-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 14rpx;
  margin-top: 22rpx;
}

.mood-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 18rpx 4rpx;
  background: #fafbfc;
  border: 2rpx solid transparent;
  border-radius: 18rpx;

  &.active {
    font-weight: 600;
  }
}

.mood-emoji {
  font-size: 38rpx;
}

.mood-label {
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #666;
}

.weather-row {
  display: flex;
  flex-wrap: wrap;
  gap: 14rpx;
  margin-top: 22rpx;
}

.weather-item {
  padding: 14rpx 24rpx;
  font-size: 24rpx;
  color: #666;
  background: #fafbfc;
  border-radius: 999rpx;

  &.active {
    color: #fff;
    background: #2f88ff;
  }
}

.title-input {
  width: 100%;
  height: 80rpx;
  font-size: 34rpx;
  font-weight: 600;
  color: #222;
  border-bottom: 1rpx solid #f5f5f5;
}

.content-input {
  width: 100%;
  min-height: 320rpx;
  padding-top: 24rpx;
  font-size: 30rpx;
  line-height: 1.7;
  color: #333;
}

.word-count {
  display: block;
  margin-top: 12rpx;
  font-size: 22rpx;
  color: #bbb;
  text-align: right;
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16rpx;
  margin-top: 22rpx;
}

.image-item {
  position: relative;
  height: 150rpx;
}

.image-preview {
  width: 100%;
  height: 100%;
  border-radius: 16rpx;
}

.image-remove {
  position: absolute;
  top: -10rpx;
  right: -10rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34rpx;
  height: 34rpx;
  background: rgb(0 0 0 / 55%);
  border-radius: 50%;
}

.image-add {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 150rpx;
  background: #fafbfc;
  border: 1rpx dashed #e5e5e5;
  border-radius: 16rpx;
}

.image-add-text {
  margin-top: 6rpx;
  font-size: 20rpx;
  color: #bbb;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 20rpx;
}

.tag-chip {
  display: inline-flex;
  gap: 8rpx;
  align-items: center;
  padding: 10rpx 20rpx;
  font-size: 24rpx;
  color: #4d80f0;
  background: #eef4ff;
  border-radius: 999rpx;
}

.tag-input-row {
  display: flex;
  align-items: center;
  margin-top: 22rpx;
}

.tag-input {
  flex: 1;
  height: 72rpx;
  padding: 0 20rpx;
  font-size: 26rpx;
  color: #333;
  background: #fafbfc;
  border-radius: 16rpx;
}

.tag-add-btn {
  padding: 18rpx 28rpx;
  margin-left: 16rpx;
  font-size: 26rpx;
  color: #2f88ff;
  background: #eef4ff;
  border-radius: 16rpx;
}

.bottom-bar {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 20;
  display: flex;
  gap: 20rpx;
  align-items: center;
  padding: 20rpx 30rpx calc(20rpx + env(safe-area-inset-bottom));
  background: #fff;
  box-shadow: 0 -2rpx 16rpx rgb(0 0 0 / 4%);
}

.delete-btn {
  display: flex;
  gap: 8rpx;
  align-items: center;
  justify-content: center;
  height: 88rpx;
  padding: 0 32rpx;
  font-size: 28rpx;
  color: #f5222d;
  background: #fff1f0;
  border-radius: 20rpx;
}

.save-btn {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  height: 88rpx;
  font-size: 30rpx;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, #4d94ff 0%, #2f88ff 100%);
  border-radius: 20rpx;
}
</style>
