<route lang="json5" type="page">
{
  layout: "default",
  style: {
    navigationBarTitleText: "扫码找物品",
    navigationBarBackgroundColor: "#FFFFFF",
  },
}
</route>

<template>
  <view class="scan-page">
    <app-navbar title="扫码找物品" fallback="/pages/index/index" />

    <view class="page-body">
      <view class="camera-box">
        <view id="qr-reader" class="qr-reader" />
        <view class="scan-frame">
          <view class="corner top-left" />
          <view class="corner top-right" />
          <view class="corner bottom-left" />
          <view class="corner bottom-right" />
          <view class="scan-line" />
        </view>
        <view v-if="!scanning && !cameraError" class="camera-mask">
          <view class="camera-spinner" />
          <text class="camera-mask-text">正在启动相机…</text>
        </view>
      </view>

      <text v-if="!cameraError" class="scan-tip">
        将物品标签上的二维码放入框内，识别后会自动打开详情。
      </text>

      <view v-if="cameraError" class="camera-error">
        <view class="camera-error-head">
          <wd-icon name="warning" size="18px" color="#f54a45" />
          <text class="camera-error-title">相机不可用</text>
        </view>
        <text class="camera-error-text">{{ cameraError }}</text>
        <text class="camera-error-hint">
          在 iPhone 上，扫码需要 HTTPS 页面并允许 Safari 使用相机。也可以直接在下方输入物品编号。
        </text>
        <view class="camera-retry" @click="startScanner">重新尝试</view>
      </view>

      <view class="manual-card">
        <text class="manual-title">手动输入编号</text>
        <text class="manual-hint">支持 000-123、000123 或纯数字 123。</text>
        <view class="manual-row">
          <input
            v-model="manualCode"
            class="manual-input"
            type="text"
            confirm-type="search"
            placeholder="例如 000-123"
            placeholder-class="manual-placeholder"
            @confirm="submitManual"
          />
          <view
            class="manual-btn"
            :class="{ disabled: resolving || !manualCode.trim() }"
            @click="submitManual"
          >
            {{ resolving ? "查找中…" : "查找" }}
          </view>
        </view>
      </view>

      <view class="scan-note">
        <wd-icon name="info-circle" size="16px" color="#8f959e" />
        <text class="scan-note-text">扫到的二维码如果不是本应用的物品链接，会忽略并继续扫描。</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref } from "vue"
import { onHide, onReady, onUnload } from "@dcloudio/uni-app"
import { findItemByIdOrCode } from "@/api/inventory"
import { Html5Qrcode } from "html5-qrcode"

const scanning = ref(false)
const cameraError = ref("")
const manualCode = ref("")
const resolving = ref(false)

let scanner: Html5Qrcode | null = null
let handling = false
let destroyed = false

function errorText(error: unknown): string {
  if (typeof error === "string" && error) return error
  if (error instanceof Error && error.message) return error.message
  const raw = error as { errMsg?: string; message?: string } | null
  return raw?.errMsg || raw?.message || "未知错误"
}

function cameraErrorMessage(error: unknown): string {
  const text = errorText(error)
  if (/notallowed|permission|denied|拒绝/i.test(text)) {
    return "相机权限被拒绝。请在 Safari 设置或系统设置中允许本页面使用相机后重试。"
  }
  if (/notfound|no camera|devices/i.test(text)) {
    return "没有找到可用的摄像头。"
  }
  if (/secure|https|localhost/i.test(text)) {
    return "当前页面不是安全上下文（HTTPS），浏览器禁止调用相机。"
  }
  return text
}

/** 从扫码文本中解析物品 id 或资产编号 */
function parseScanText(text: string): string | null {
  const raw = text.trim()
  if (!raw) return null

  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw)
      const hashQuery = url.hash.includes("?") ? url.hash.slice(url.hash.indexOf("?") + 1) : ""
      const params = new URLSearchParams(hashQuery || url.search)
      const id = params.get("id") || params.get("item") || params.get("itemId")
      if (id) return id
      const code = params.get("code") || params.get("asset")
      if (code) return code
      const match = url.pathname.match(/(\d{3,6})(?:-(\d{3,6}))?\/?$/)
      if (match) return match[2] ? `${match[1]}-${match[2]}` : match[1]
      // 不是本应用的链接，交给后续查找判断
      return raw
    } catch {
      return raw
    }
  }

  return raw
}

async function startScanner(): Promise<void> {
  if (scanner || destroyed) return
  cameraError.value = ""

  if (typeof window === "undefined" || !window.isSecureContext) {
    cameraError.value = "当前页面不是安全上下文（HTTPS），浏览器禁止调用相机。"
    return
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    cameraError.value = "当前浏览器不支持调用相机，请使用 Safari 打开。"
    return
  }

  try {
    const instance = new Html5Qrcode("qr-reader", { verbose: false })
    scanner = instance
    await instance.start(
      { facingMode: "environment" },
      {
        fps: 10,
        qrbox: (viewWidth: number, viewHeight: number) => {
          const edge = Math.floor(Math.min(viewWidth, viewHeight) * 0.68)
          return { width: edge, height: edge }
        },
        aspectRatio: 1,
      },
      (decodedText) => {
        handleDecoded(decodedText)
      },
      () => {
        // 单帧识别失败是常态，忽略
      },
    )
    scanning.value = true
  } catch (error) {
    console.error("[inventory] 相机启动失败:", error)
    cameraError.value = cameraErrorMessage(error)
    await stopScanner()
  }
}

async function stopScanner(): Promise<void> {
  const instance = scanner
  scanner = null
  scanning.value = false
  if (!instance) return
  try {
    await instance.stop()
    instance.clear()
  } catch {
    // 已经停止时忽略
  }
}

async function handleDecoded(text: string): Promise<void> {
  if (handling || resolving.value) return
  const key = parseScanText(text)
  if (!key) return

  handling = true
  resolving.value = true
  try {
    const item = await findItemByIdOrCode(key)
    if (!item) {
      handling = false
      resolving.value = false
      uni.showToast({ title: "没有找到对应物品", icon: "none" })
      return
    }
    await stopScanner()
    uni.redirectTo({
      url: `/pages/Storage/item?id=${encodeURIComponent(item.id)}`,
    })
  } catch (error) {
    handling = false
    resolving.value = false
    uni.showToast({ title: errorText(error), icon: "none" })
  }
}

async function submitManual(): Promise<void> {
  const key = manualCode.value.trim()
  if (!key || resolving.value) {
    if (!key) uni.showToast({ title: "请输入物品编号", icon: "none" })
    return
  }
  handling = false
  await handleDecoded(key)
}

onReady(() => {
  // onReady 时页面 DOM 已挂载，可确保 #qr-reader 存在
  startScanner()
})

onHide(() => {
  stopScanner()
})

onUnload(() => {
  destroyed = true
  stopScanner()
})

onBeforeUnmount(() => {
  destroyed = true
  stopScanner()
})
</script>

<style scoped lang="scss">
.scan-page {
  min-height: 100vh;
  background: var(--inv-bg);
}

.page-body {
  padding: 24rpx 24rpx calc(60rpx + env(safe-area-inset-bottom));
}

.camera-box {
  position: relative;
  height: 700rpx;
  overflow: hidden;
  background: #14171c;
  border-radius: 28rpx;
}

.qr-reader {
  width: 100%;
  height: 100%;
}

.camera-box :deep(#qr-reader video) {
  width: 100% !important;
  height: 700rpx !important;
  object-fit: cover;
}

.camera-box :deep([id="qr-reader__scan_region"]) {
  min-height: 0;
}

.camera-box :deep(.qr-shaded-region) {
  display: none;
}

.scan-frame {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 440rpx;
  height: 440rpx;
  pointer-events: none;
  transform: translate(-50%, -50%);
}

.corner {
  position: absolute;
  width: 52rpx;
  height: 52rpx;
  border: 5rpx solid #43d896;
}

.top-left {
  top: 0;
  left: 0;
  border-right: 0;
  border-bottom: 0;
  border-radius: 12rpx 0 0;
}

.top-right {
  top: 0;
  right: 0;
  border-bottom: 0;
  border-left: 0;
  border-radius: 0 12rpx 0 0;
}

.bottom-left {
  bottom: 0;
  left: 0;
  border-top: 0;
  border-right: 0;
  border-radius: 0 0 0 12rpx;
}

.bottom-right {
  right: 0;
  bottom: 0;
  border-top: 0;
  border-left: 0;
  border-radius: 0 0 12rpx;
}

.scan-line {
  position: absolute;
  top: 8%;
  right: 10rpx;
  left: 10rpx;
  height: 3rpx;
  background: linear-gradient(90deg, transparent, #43d896, transparent);
  box-shadow: 0 0 12rpx #43d896;
  animation: scan-move 2.2s ease-in-out infinite;
}

.camera-mask {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgb(20 23 28 / 82%);
}

.camera-spinner {
  width: 48rpx;
  height: 48rpx;
  border: 4rpx solid rgb(255 255 255 / 20%);
  border-top-color: #43d896;
  border-radius: 50%;
  animation: scan-spin 0.8s linear infinite;
}

.camera-mask-text {
  margin-top: 16rpx;
  font-size: 23rpx;
  color: rgb(255 255 255 / 70%);
}

.scan-tip {
  display: block;
  margin-top: 20rpx;
  font-size: 23rpx;
  line-height: 1.6;
  color: var(--inv-text-tertiary);
  text-align: center;
}

.camera-error {
  padding: 24rpx 26rpx;
  margin-top: 20rpx;
  background: #fff;
  border-radius: 20rpx;
}

.camera-error-head {
  display: flex;
  gap: 10rpx;
  align-items: center;
}

.camera-error-title {
  font-size: 27rpx;
  font-weight: 600;
  color: var(--inv-text);
}

.camera-error-text {
  display: block;
  margin-top: 10rpx;
  font-size: 24rpx;
  line-height: 1.6;
  color: #c93b36;
}

.camera-error-hint {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  line-height: 1.6;
  color: var(--inv-text-tertiary);
}

.camera-retry {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 72rpx;
  padding: 0 28rpx;
  margin-top: 16rpx;
  font-size: 24rpx;
  font-weight: 600;
  color: var(--inv-primary-dark);
  background: var(--inv-primary-soft);
  border-radius: 999rpx;
}

.manual-card {
  padding: 26rpx;
  margin-top: 22rpx;
  background: #fff;
  border-radius: 22rpx;
}

.manual-title {
  display: block;
  font-size: 27rpx;
  font-weight: 600;
  color: var(--inv-text);
}

.manual-hint {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
  color: var(--inv-text-tertiary);
}

.manual-row {
  display: flex;
  gap: 16rpx;
  align-items: center;
  margin-top: 18rpx;
}

.manual-input {
  box-sizing: border-box;
  flex: 1;
  height: 88rpx;
  padding: 0 22rpx;
  font-size: 16px;
  color: var(--inv-text);
  background: #f7f8fa;
  border-radius: 16rpx;
}

.manual-placeholder {
  color: var(--inv-text-tertiary);
}

.manual-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 150rpx;
  height: 88rpx;
  font-size: 26rpx;
  font-weight: 600;
  color: #fff;
  background: var(--inv-primary);
  border-radius: 16rpx;
}

.manual-btn.disabled {
  opacity: 0.5;
}

.scan-note {
  display: flex;
  gap: 10rpx;
  align-items: flex-start;
  padding: 0 8rpx;
  margin-top: 22rpx;
}

.scan-note-text {
  flex: 1;
  font-size: 22rpx;
  line-height: 1.6;
  color: var(--inv-text-tertiary);
}

@keyframes scan-move {
  0%,
  100% {
    top: 8%;
  }

  50% {
    top: 88%;
  }
}

@keyframes scan-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
