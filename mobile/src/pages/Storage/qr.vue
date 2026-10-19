<route lang="json5" type="page">
{
  layout: "default",
  style: {
    navigationBarTitleText: "二维码标签",
    navigationBarBackgroundColor: "#FFFFFF",
  },
}
</route>

<template>
  <view class="qr-page">
    <app-navbar title="二维码标签" fallback="/pages/index/index" />

    <page-state v-if="state === 'loading'" state="loading" class="page-state" />

    <page-state
      v-else-if="state === 'error'"
      state="error"
      class="page-state"
      :description="errorMessage"
      @retry="load"
    />

    <template v-else-if="detail">
      <view class="page-body">
        <view class="preview-card">
          <image
            v-if="labelUrl"
            class="label-image"
            :src="labelUrl"
            mode="widthFix"
            @click="previewLabel"
          />
          <view v-else class="label-loading">
            <view class="label-spinner" />
            <text class="label-loading-text">正在生成标签…</text>
          </view>
        </view>

        <view class="item-line">
          <text class="item-name">{{ detail.name }}</text>
          <text class="item-code">{{ detail.assetCode }}</text>
        </view>
        <text v-if="detail.locationText" class="item-location">{{ detail.locationText }}</text>

        <view class="action-list">
          <view class="primary-btn" :class="{ disabled: !labelUrl }" @click="saveImage">
            <wd-icon name="download" size="18px" color="#fff" />
            <text class="primary-text">保存 / 分享标签</text>
          </view>
          <view class="secondary-btn" @click="copyLink">
            <wd-icon name="link" size="17px" color="#2ba471" />
            <text class="secondary-text">复制物品链接</text>
          </view>
        </view>

        <view class="hint-card">
          <wd-icon name="info-circle" size="16px" color="#8f959e" />
          <text class="hint-text">
            在 iPhone 上点「保存 /
            分享标签」，选择「存储图像」即可存入相册；打印后可贴在收纳箱上，用相机扫码直接打开物品。
          </text>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref } from "vue"
import { onLoad } from "@dcloudio/uni-app"
import { findItemByIdOrCode, getItemDetail, type InventoryItemDetail } from "@/api/inventory"
import { buildItemUrl, copyText, generateQrLabel, shareOrSaveImage } from "@/utils/qrLabel"

const rawId = ref("")
const detail = ref<InventoryItemDetail | null>(null)
const state = ref<"loading" | "ready" | "error">("loading")
const errorMessage = ref("")
const labelUrl = ref("")
const link = ref("")

function errorText(error: unknown): string {
  if (typeof error === "string" && error) return error
  if (error instanceof Error && error.message) return error.message
  const raw = error as { errMsg?: string; message?: string } | null
  return raw?.errMsg || raw?.message || "未知错误"
}

async function load(): Promise<void> {
  const key = rawId.value.trim()
  if (!key) {
    state.value = "error"
    errorMessage.value = "缺少物品编号"
    return
  }

  state.value = "loading"
  labelUrl.value = ""
  try {
    const item = await findItemByIdOrCode(key)
    if (!item) {
      state.value = "error"
      errorMessage.value = "没有找到这件物品，可能已被删除。"
      return
    }
    const data = await getItemDetail(item.id)
    if (!data) {
      state.value = "error"
      errorMessage.value = "物品数据读取失败。"
      return
    }
    detail.value = data
    state.value = "ready"

    const url = buildItemUrl(data.id, data.assetCode)
    link.value = url
    labelUrl.value = await generateQrLabel({
      url,
      name: data.name,
      code: data.assetCode,
      location: data.locationText,
    })
  } catch (error) {
    console.error("[inventory] 二维码生成失败:", error)
    state.value = "error"
    errorMessage.value = errorText(error)
  }
}

function previewLabel(): void {
  if (!labelUrl.value) return
  uni.previewImage({ current: labelUrl.value, urls: [labelUrl.value] })
}

async function saveImage(): Promise<void> {
  if (!labelUrl.value || !detail.value) return
  try {
    const result = await shareOrSaveImage(
      labelUrl.value,
      `${detail.value.assetCode.replace(/[^\d-]/g, "")}-label.png`,
    )
    if (result === "saved") {
      uni.showToast({ title: "已下载，请到相册或下载中查看", icon: "none" })
    }
  } catch (error) {
    uni.showToast({ title: errorText(error), icon: "none" })
  }
}

async function copyLink(): Promise<void> {
  if (!link.value) return
  const ok = await copyText(link.value)
  uni.showToast({
    title: ok ? "链接已复制" : "复制失败，请长按二维码保存",
    icon: "none",
  })
}

onLoad((options) => {
  const query = (options || {}) as Record<string, string | undefined>
  rawId.value = query.id || query.code || ""
  load()
})
</script>

<style scoped lang="scss">
.qr-page {
  min-height: 100vh;
  background: var(--inv-bg);
}

.page-state {
  padding-top: 120rpx;
}

.page-body {
  padding: 24rpx 24rpx calc(60rpx + env(safe-area-inset-bottom));
}

.preview-card {
  padding: 24rpx;
  background:
    linear-gradient(45deg, #f7f8fa 25%, transparent 25%) -16rpx 0 / 32rpx 32rpx,
    linear-gradient(-45deg, #f7f8fa 25%, transparent 25%) -16rpx 0 / 32rpx 32rpx,
    linear-gradient(45deg, transparent 75%, #f7f8fa 75%) / 32rpx 32rpx,
    linear-gradient(-45deg, transparent 75%, #f7f8fa 75%) / 32rpx 32rpx,
    #fff;
  border-radius: 24rpx;
  box-shadow: 0 8rpx 24rpx rgb(31 35 41 / 6%);
}

.label-image {
  display: block;
  width: 100%;
  border-radius: 8rpx;
}

.label-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 760rpx;
}

.label-spinner {
  width: 48rpx;
  height: 48rpx;
  border: 4rpx solid #ececec;
  border-top-color: var(--inv-primary);
  border-radius: 50%;
  animation: qr-spin 0.8s linear infinite;
}

.label-loading-text {
  margin-top: 16rpx;
  font-size: 23rpx;
  color: var(--inv-text-tertiary);
}

.item-line {
  display: flex;
  gap: 16rpx;
  align-items: center;
  margin-top: 26rpx;
}

.item-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  font-size: 32rpx;
  font-weight: 600;
  color: var(--inv-text);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-code {
  flex-shrink: 0;
  padding: 4rpx 14rpx;
  font-size: 22rpx;
  font-weight: 600;
  color: var(--inv-primary-dark);
  background: var(--inv-primary-soft);
  border-radius: 8rpx;
}

.item-location {
  display: block;
  margin-top: 8rpx;
  font-size: 23rpx;
  color: var(--inv-text-secondary);
}

.action-list {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
  margin-top: 32rpx;
}

.primary-btn,
.secondary-btn {
  display: flex;
  gap: 10rpx;
  align-items: center;
  justify-content: center;
  height: 96rpx;
  font-size: 29rpx;
  font-weight: 600;
  border-radius: 999rpx;
}

.primary-btn {
  color: #fff;
  background: var(--inv-primary);
  box-shadow: 0 10rpx 24rpx rgb(43 164 113 / 25%);
}

.primary-btn.disabled {
  opacity: 0.5;
}

.secondary-btn {
  color: var(--inv-primary-dark);
  background: #fff;
  border: 2rpx solid #d8efe5;
}

.primary-text,
.secondary-text {
  font-size: 29rpx;
}

.hint-card {
  display: flex;
  gap: 12rpx;
  align-items: flex-start;
  padding: 22rpx 24rpx;
  margin-top: 26rpx;
  background: #fff;
  border-radius: 18rpx;
}

.hint-text {
  flex: 1;
  font-size: 22rpx;
  line-height: 1.65;
  color: var(--inv-text-tertiary);
}

@keyframes qr-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
