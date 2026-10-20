<route lang="json5" type="page">
{
  layout: "default",
  style: {
    navigationBarTitleText: "物品详情",
    navigationBarBackgroundColor: "#FFFFFF",
  },
}
</route>

<template>
  <view class="detail-page">
    <app-navbar :title="detail?.name || '物品详情'" fallback="/pages/index/index">
      <template #right>
        <view class="nav-icon" @click="openMore">
          <wd-icon name="more" size="20px" color="#1f2329" />
        </view>
      </template>
    </app-navbar>

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
        <view v-if="detail.photos.length > 0" class="gallery">
          <scroll-view
            scroll-x
            class="gallery-scroll"
            :show-scrollbar="false"
            @scroll="onPhotoScroll"
          >
            <view
              v-for="photo in detail.photos"
              :key="photo.id"
              class="gallery-slide"
              @click="previewPhoto(photo.dataUrl)"
            >
              <image class="gallery-image" :src="photo.dataUrl" mode="aspectFill" />
            </view>
          </scroll-view>
          <view v-if="detail.photos.length > 1" class="gallery-dots">
            <view
              v-for="(_, index) in detail.photos"
              :key="index"
              class="gallery-dot"
              :class="{ active: index === photoIndex }"
            />
          </view>
        </view>
        <view v-else class="gallery gallery-empty">
          <wd-icon name="picture" size="34px" color="#c2c7cf" />
          <text class="gallery-empty-text">还没有照片</text>
        </view>

        <view class="head-card">
          <view class="head-title-line">
            <text class="head-name">{{ detail.name }}</text>
            <text v-if="detail.archived" class="head-archived">已归档</text>
          </view>
          <view class="head-meta">
            <text class="asset-code">{{ detail.assetCode }}</text>
            <view class="head-location">
              <wd-icon name="location" size="14px" color="#8f959e" />
              <text class="head-location-text">
                {{ detail.locationText || "未指定位置" }}
              </text>
            </view>
          </view>
          <view v-if="detail.tags.length > 0" class="head-tags">
            <text
              v-for="tag in detail.tags"
              :key="tag.id"
              class="head-tag"
              :style="{ color: tag.color, background: `${tag.color}1a` }"
            >
              {{ tag.name }}
            </text>
          </view>
        </view>

        <view class="card quantity-card">
          <view class="quantity-main">
            <text class="card-label">数量</text>
            <text class="quantity-value">
              {{ quantityText }}
              <text class="quantity-unit">{{ detail.unit }}</text>
            </text>
          </view>
          <view class="stepper">
            <view
              class="stepper-btn"
              :class="{ disabled: quantity <= 0 }"
              @click="changeQuantity(-1)"
            >
              <wd-icon name="minus-rectangle" size="18px" color="#1f2329" />
            </view>
            <view class="stepper-btn" @click="changeQuantity(1)">
              <wd-icon name="add" size="18px" color="#1f2329" />
            </view>
          </view>
        </view>

        <view class="card">
          <text class="card-title">识别信息</text>
          <view class="info-row">
            <text class="info-label">资产编号</text>
            <text class="info-value">{{ detail.assetCode }}</text>
          </view>
          <view v-if="detail.serialNumber" class="info-row">
            <text class="info-label">序列号</text>
            <text class="info-value">{{ detail.serialNumber }}</text>
          </view>
          <view v-if="detail.modelNumber" class="info-row">
            <text class="info-label">型号</text>
            <text class="info-value">{{ detail.modelNumber }}</text>
          </view>
          <view v-if="detail.manufacturer" class="info-row">
            <text class="info-label">厂商</text>
            <text class="info-value">{{ detail.manufacturer }}</text>
          </view>
          <view v-if="detail.description" class="info-block">
            <text class="info-label">备注</text>
            <text class="info-text">{{ detail.description }}</text>
          </view>
        </view>

        <view v-if="hasPurchaseInfo" class="card">
          <text class="card-title">购买信息</text>
          <view v-if="detail.purchasePriceCents > 0" class="info-row">
            <text class="info-label">购买价格</text>
            <text class="info-value">¥{{ formatCents(detail.purchasePriceCents) }}</text>
          </view>
          <view v-if="detail.purchaseDate" class="info-row">
            <text class="info-label">购买日期</text>
            <text class="info-value">{{ detail.purchaseDate }}</text>
          </view>
          <view v-if="detail.purchaseFrom" class="info-row">
            <text class="info-label">购买渠道</text>
            <text class="info-value">{{ detail.purchaseFrom }}</text>
          </view>
        </view>

        <view v-if="hasWarrantyInfo" class="card">
          <view class="card-title-line">
            <text class="card-title">保修</text>
            <text v-if="warranty" class="warranty-badge" :class="warranty.tone">
              {{ warranty.label }}
            </text>
          </view>
          <view v-if="detail.lifetimeWarranty" class="info-row">
            <text class="info-label">保修类型</text>
            <text class="info-value">终身保修</text>
          </view>
          <view v-if="detail.warrantyExpiresOn" class="info-row">
            <text class="info-label">到期日期</text>
            <text class="info-value">{{ detail.warrantyExpiresOn }}</text>
          </view>
          <view v-if="detail.warrantyNote" class="info-block">
            <text class="info-label">保修备注</text>
            <text class="info-text">{{ detail.warrantyNote }}</text>
          </view>
        </view>

        <view v-if="detail.fields.length > 0" class="card">
          <text class="card-title">自定义属性</text>
          <view v-for="field in detail.fields" :key="field.id" class="info-row">
            <text class="info-label">{{ field.name }}</text>
            <text class="info-value">{{ field.value || "—" }}</text>
          </view>
        </view>

        <view class="card">
          <view class="card-title-line">
            <text class="card-title">维护记录</text>
            <view class="card-action" @click="openMaintenance()">
              <wd-icon name="add" size="14px" color="#2ba471" />
              <text class="card-action-text">添加</text>
            </view>
          </view>

          <view v-if="detail.maintenance.length === 0" class="maintenance-empty">
            暂无维护记录，可记录保养、维修和下次计划。
          </view>
          <view
            v-for="entry in detail.maintenance"
            :key="entry.id"
            class="maintenance-row"
            @click="openMaintenance(entry)"
          >
            <view class="maintenance-dot" :class="maintenanceTone(entry)" />
            <view class="maintenance-main">
              <view class="maintenance-title-line">
                <text class="maintenance-name">{{ entry.name }}</text>
                <text class="maintenance-status" :class="maintenanceTone(entry)">
                  {{ maintenanceStatus(entry) }}
                </text>
              </view>
              <text class="maintenance-meta">{{ maintenanceMeta(entry) }}</text>
              <text v-if="entry.description" class="maintenance-desc">
                {{ entry.description }}
              </text>
            </view>
            <text v-if="entry.costCents > 0" class="maintenance-cost">
              ¥{{ formatCents(entry.costCents) }}
            </text>
          </view>
        </view>
      </view>

      <view class="bottom-bar">
        <view class="bottom-btn" @click="goEdit">
          <wd-icon name="edit" size="19px" color="#1f2329" />
          <text class="bottom-btn-text">编辑</text>
        </view>
        <view class="bottom-btn" @click="goQr">
          <wd-icon name="qrcode" size="19px" color="#1f2329" />
          <text class="bottom-btn-text">二维码</text>
        </view>
        <view class="bottom-btn" @click="openMore">
          <wd-icon name="more" size="19px" color="#1f2329" />
          <text class="bottom-btn-text">更多</text>
        </view>
      </view>
    </template>

    <view v-if="maintenanceVisible" class="inv-sheet-mask" @click="closeMaintenance">
      <view class="inv-sheet maintenance-sheet" @click.stop>
        <view class="inv-sheet-head">
          <text class="inv-sheet-title">
            {{ maintenanceDraft.id ? "编辑维护记录" : "添加维护记录" }}
          </text>
          <text class="inv-sheet-cancel" @click="closeMaintenance">取消</text>
        </view>

        <view class="form-row">
          <text class="form-label">名称</text>
          <input
            v-model="maintenanceDraft.name"
            class="form-input"
            type="text"
            maxlength="30"
            placeholder="例如：更换滤芯"
            placeholder-class="form-placeholder"
          />
        </view>

        <view class="form-row">
          <text class="form-label">完成日期</text>
          <picker
            class="form-picker"
            mode="date"
            :value="maintenanceDraft.completedOn"
            @change="setDate('completedOn', $event)"
          >
            <view class="form-value" :class="{ muted: !maintenanceDraft.completedOn }">
              {{ maintenanceDraft.completedOn || "未完成" }}
            </view>
          </picker>
          <view
            v-if="maintenanceDraft.completedOn"
            class="form-clear"
            @click="maintenanceDraft.completedOn = ''"
          >
            清除
          </view>
        </view>

        <view class="form-row">
          <text class="form-label">下次日期</text>
          <picker
            class="form-picker"
            mode="date"
            :value="maintenanceDraft.scheduledOn"
            @change="setDate('scheduledOn', $event)"
          >
            <view class="form-value" :class="{ muted: !maintenanceDraft.scheduledOn }">
              {{ maintenanceDraft.scheduledOn || "不设置" }}
            </view>
          </picker>
          <view
            v-if="maintenanceDraft.scheduledOn"
            class="form-clear"
            @click="maintenanceDraft.scheduledOn = ''"
          >
            清除
          </view>
        </view>

        <view class="form-row">
          <text class="form-label">费用</text>
          <input
            v-model="maintenanceDraft.cost"
            class="form-input"
            type="digit"
            placeholder="0.00"
            placeholder-class="form-placeholder"
          />
        </view>

        <view class="form-block">
          <text class="form-label">说明</text>
          <textarea
            v-model="maintenanceDraft.description"
            class="form-textarea"
            maxlength="200"
            placeholder="维护内容、更换配件等"
            placeholder-class="form-placeholder"
          />
        </view>

        <view class="maintenance-actions">
          <view v-if="maintenanceDraft.id" class="maintenance-delete" @click="removeMaintenance">
            删除
          </view>
          <view
            class="maintenance-save"
            :class="{ disabled: savingMaintenance }"
            @click="saveMaintenance"
          >
            保存
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref } from "vue"
import { onHide, onLoad, onShow } from "@dcloudio/uni-app"
import {
  adjustQuantity,
  createMaintenance,
  deleteItem,
  deleteMaintenance,
  findItemByIdOrCode,
  getItemDetail,
  setItemArchived,
  updateMaintenance,
  type InventoryItemDetail,
  type MaintenanceEntry,
} from "@/api/inventory"
import { decimalToCents, formatCents } from "@/api/bookkeeping/money"

const rawId = ref("")
const detail = ref<InventoryItemDetail | null>(null)
const state = ref<"loading" | "ready" | "error">("loading")
const errorMessage = ref("")
const photoIndex = ref(0)

const quantity = ref(0)
const quantityText = computed(() => {
  const value = Number(quantity.value || 0)
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 1000) / 1000)
})

let loaded = false
let quantityTimer = 0
let pendingQuantity: number | null = null

const maintenanceVisible = ref(false)
const savingMaintenance = ref(false)
const maintenanceDraft = reactive({
  id: "",
  name: "",
  completedOn: "",
  scheduledOn: "",
  cost: "",
  description: "",
})

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

  try {
    state.value = detail.value ? state.value : "loading"
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
    quantity.value = data.quantity
    state.value = "ready"
    loaded = true
  } catch (error) {
    console.error("[inventory] 详情加载失败:", error)
    state.value = "error"
    errorMessage.value = errorText(error)
  }
}

function onPhotoScroll(event: { detail?: { scrollLeft?: number } }): void {
  const system = uni.getSystemInfoSync()
  const width = system.windowWidth
  const slide = Math.max(1, width - (48 * width) / 750)
  photoIndex.value = Math.round((event.detail?.scrollLeft || 0) / slide)
}

function previewPhoto(url: string): void {
  uni.previewImage({ current: url, urls: detail.value?.photos.map((photo) => photo.dataUrl) || [] })
}

function changeQuantity(delta: number): void {
  const next = Math.max(0, Math.round((quantity.value + delta) * 1000) / 1000)
  if (next === quantity.value) return
  quantity.value = next
  scheduleQuantitySave(next)
}

function scheduleQuantitySave(value: number): void {
  pendingQuantity = value
  window.clearTimeout(quantityTimer)
  quantityTimer = window.setTimeout(() => {
    flushQuantity()
  }, 600)
}

async function flushQuantity(): Promise<void> {
  if (pendingQuantity === null || !detail.value) return
  const value = pendingQuantity
  pendingQuantity = null
  try {
    await adjustQuantity(detail.value.id, value)
    uni.$emit("refreshInventoryData")
  } catch (error) {
    uni.showToast({ title: errorText(error), icon: "none" })
    if (detail.value) quantity.value = detail.value.quantity
  }
}

const hasPurchaseInfo = computed(() => {
  const item = detail.value
  if (!item) return false
  return item.purchasePriceCents > 0 || !!item.purchaseDate || !!item.purchaseFrom
})

const hasWarrantyInfo = computed(() => {
  const item = detail.value
  if (!item) return false
  return item.lifetimeWarranty || !!item.warrantyExpiresOn || !!item.warrantyNote
})

function daysUntil(dateText: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText)) return null
  const [year, month, day] = dateText.split("-").map(Number)
  const target = new Date(year, month - 1, day)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
}

const warranty = computed<{ label: string; tone: string } | null>(() => {
  const item = detail.value
  if (!item) return null
  if (item.lifetimeWarranty) return { label: "终身保修", tone: "ok" }
  if (!item.warrantyExpiresOn) return null
  const days = daysUntil(item.warrantyExpiresOn)
  if (days === null) return null
  if (days < 0) return { label: "已过保", tone: "danger" }
  if (days === 0) return { label: "今天到期", tone: "warn" }
  if (days <= 30) return { label: `还剩 ${days} 天`, tone: "warn" }
  return { label: "保修中", tone: "ok" }
})

function maintenanceTone(entry: MaintenanceEntry): string {
  if (entry.scheduledOn) {
    const days = daysUntil(entry.scheduledOn)
    if (days !== null && days < 0) return "danger"
    if (days !== null && days === 0) return "warn"
  }
  return entry.completedOn ? "ok" : "warn"
}

function maintenanceStatus(entry: MaintenanceEntry): string {
  if (entry.scheduledOn) {
    const days = daysUntil(entry.scheduledOn)
    if (days !== null && days < 0) return "已逾期"
    if (days !== null && days === 0) return "今天"
    if (days !== null) return `${days} 天后`
  }
  return entry.completedOn ? "已完成" : "计划中"
}

function maintenanceMeta(entry: MaintenanceEntry): string {
  const parts: string[] = []
  if (entry.completedOn) parts.push(`完成于 ${entry.completedOn}`)
  if (entry.scheduledOn) parts.push(`下次 ${entry.scheduledOn}`)
  return parts.join(" · ")
}

function openMaintenance(entry?: MaintenanceEntry): void {
  if (entry) {
    maintenanceDraft.id = entry.id
    maintenanceDraft.name = entry.name
    maintenanceDraft.completedOn = entry.completedOn
    maintenanceDraft.scheduledOn = entry.scheduledOn
    maintenanceDraft.cost = entry.costCents > 0 ? formatCents(entry.costCents) : ""
    maintenanceDraft.description = entry.description
  } else {
    maintenanceDraft.id = ""
    maintenanceDraft.name = ""
    maintenanceDraft.completedOn = ""
    maintenanceDraft.scheduledOn = ""
    maintenanceDraft.cost = ""
    maintenanceDraft.description = ""
  }
  maintenanceVisible.value = true
}

function closeMaintenance(): void {
  maintenanceVisible.value = false
}

function setDate(
  field: "completedOn" | "scheduledOn",
  event: { detail?: { value?: string } },
): void {
  const value = event.detail?.value
  if (value) maintenanceDraft[field] = value
}

async function saveMaintenance(): Promise<void> {
  if (!detail.value || savingMaintenance.value) return
  if (!maintenanceDraft.name.trim()) {
    uni.showToast({ title: "请填写维护名称", icon: "none" })
    return
  }
  if (!maintenanceDraft.completedOn && !maintenanceDraft.scheduledOn) {
    uni.showToast({ title: "完成日期和下次日期至少填一个", icon: "none" })
    return
  }

  let costCents = 0
  if (maintenanceDraft.cost.trim()) {
    try {
      costCents = decimalToCents(maintenanceDraft.cost)
      if (costCents < 0) throw new Error("费用不能为负数")
    } catch (error) {
      uni.showToast({ title: errorText(error), icon: "none" })
      return
    }
  }

  const input = {
    name: maintenanceDraft.name.trim(),
    completedOn: maintenanceDraft.completedOn,
    scheduledOn: maintenanceDraft.scheduledOn,
    costCents,
    description: maintenanceDraft.description.trim(),
  }

  savingMaintenance.value = true
  try {
    if (maintenanceDraft.id) {
      await updateMaintenance(maintenanceDraft.id, input)
    } else {
      await createMaintenance(detail.value.id, input)
    }
    maintenanceVisible.value = false
    uni.$emit("refreshInventoryData")
    await load()
    uni.showToast({ title: "已保存", icon: "success" })
  } catch (error) {
    uni.showToast({ title: errorText(error), icon: "none" })
  } finally {
    savingMaintenance.value = false
  }
}

function removeMaintenance(): void {
  const id = maintenanceDraft.id
  if (!id) return
  uni.showModal({
    title: "删除维护记录",
    content: "删除后不可恢复，确定继续吗？",
    confirmText: "删除",
    confirmColor: "#f54a45",
    success: async (result) => {
      if (!result.confirm) return
      try {
        await deleteMaintenance(id)
        maintenanceVisible.value = false
        uni.$emit("refreshInventoryData")
        await load()
      } catch (error) {
        uni.showToast({ title: errorText(error), icon: "none" })
      }
    },
  })
}

function goEdit(): void {
  if (!detail.value) return
  uni.navigateTo({ url: `/pages/Storage/edit?id=${encodeURIComponent(detail.value.id)}` })
}

function goQr(): void {
  if (!detail.value) return
  uni.navigateTo({
    url: `/pages/Storage/qr?id=${encodeURIComponent(detail.value.id)}`,
  })
}

function openMore(): void {
  if (!detail.value) return
  const archived = detail.value.archived
  uni.showActionSheet({
    itemList: [archived ? "取消归档" : "归档物品", "删除物品"],
    success: (result) => {
      if (result.tapIndex === 0) toggleArchived()
      if (result.tapIndex === 1) confirmDelete()
    },
  })
}

async function toggleArchived(): Promise<void> {
  if (!detail.value) return
  const next = !detail.value.archived
  try {
    await setItemArchived(detail.value.id, next)
    uni.$emit("refreshInventoryData")
    await load()
    uni.showToast({ title: next ? "已归档" : "已取消归档", icon: "success" })
  } catch (error) {
    uni.showToast({ title: errorText(error), icon: "none" })
  }
}

function confirmDelete(): void {
  if (!detail.value) return
  const id = detail.value.id
  const name = detail.value.name
  uni.showModal({
    title: "删除物品",
    content: `「${name}」及其照片、维护记录会一并删除，且不可恢复。`,
    confirmText: "删除",
    confirmColor: "#f54a45",
    success: async (result) => {
      if (!result.confirm) return
      try {
        uni.showLoading({ title: "删除中...", mask: true })
        await deleteItem(id)
        uni.hideLoading()
        uni.$emit("refreshInventoryData")
        const pages = getCurrentPages()
        if (pages.length > 1) {
          uni.navigateBack()
        } else {
          uni.switchTab({ url: "/pages/index/index" })
        }
      } catch (error) {
        uni.hideLoading()
        uni.showToast({ title: errorText(error), icon: "none" })
      }
    },
  })
}

onLoad((options) => {
  const query = (options || {}) as Record<string, string | undefined>
  rawId.value = query.id || query.code || ""
  load()
})

onShow(() => {
  // 从编辑页返回时刷新；首次展示由 onLoad 负责
  if (loaded) {
    flushQuantity()
    load()
  }
})

onHide(() => {
  flushQuantity()
})

onBeforeUnmount(() => {
  window.clearTimeout(quantityTimer)
  flushQuantity()
})
</script>

<style scoped lang="scss">
.detail-page {
  min-height: 100vh;
  background: var(--inv-bg);
}

.nav-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
}

.nav-icon:active {
  background: #f2f3f5;
}

.page-state {
  padding-top: 120rpx;
}

.page-body {
  padding: 20rpx 24rpx calc(180rpx + env(safe-area-inset-bottom));
}

.gallery {
  position: relative;
  overflow: hidden;
  background: #eef1f4;
  border-radius: 24rpx;
}

.gallery-scroll {
  width: 100%;
  height: 480rpx;
  white-space: nowrap;
}

.gallery-slide {
  display: inline-block;
  width: 100%;
  height: 480rpx;
  vertical-align: top;
}

.gallery-image {
  width: 100%;
  height: 480rpx;
}

.gallery-dots {
  position: absolute;
  right: 0;
  bottom: 16rpx;
  left: 0;
  display: flex;
  gap: 10rpx;
  justify-content: center;
}

.gallery-dot {
  width: 12rpx;
  height: 12rpx;
  background: rgb(255 255 255 / 55%);
  border-radius: 50%;
}

.gallery-dot.active {
  width: 26rpx;
  background: #fff;
  border-radius: 999rpx;
}

.gallery-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300rpx;
}

.gallery-empty-text {
  margin-top: 12rpx;
  font-size: 23rpx;
  color: var(--inv-text-tertiary);
}

.head-card {
  padding: 28rpx;
  margin-top: 20rpx;
  background: #fff;
  border-radius: 24rpx;
  box-shadow: 0 4rpx 16rpx rgb(31 35 41 / 4%);
}

.head-title-line {
  display: flex;
  gap: 14rpx;
  align-items: center;
}

.head-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  font-size: 40rpx;
  font-weight: 700;
  line-height: 1.35;
  color: var(--inv-text);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.head-archived {
  flex-shrink: 0;
  padding: 4rpx 12rpx;
  font-size: 20rpx;
  color: var(--inv-text-tertiary);
  background: #f2f3f5;
  border-radius: 8rpx;
}

.head-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  align-items: center;
  margin-top: 14rpx;
}

.asset-code {
  padding: 4rpx 12rpx;
  font-size: 22rpx;
  font-weight: 600;
  color: var(--inv-primary-dark);
  letter-spacing: 0.6rpx;
  background: var(--inv-primary-soft);
  border-radius: 8rpx;
}

.head-location {
  display: flex;
  flex: 1;
  gap: 6rpx;
  align-items: center;
  min-width: 0;
}

.head-location-text {
  overflow: hidden;
  font-size: 24rpx;
  color: var(--inv-text-secondary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.head-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
  margin-top: 16rpx;
}

.head-tag {
  padding: 4rpx 16rpx;
  font-size: 21rpx;
  border-radius: 999rpx;
}

.card {
  padding: 26rpx 28rpx;
  margin-top: 18rpx;
  background: #fff;
  border-radius: 24rpx;
  box-shadow: 0 4rpx 16rpx rgb(31 35 41 / 4%);
}

.card-title {
  display: block;
  margin-bottom: 8rpx;
  font-size: 26rpx;
  font-weight: 600;
  color: var(--inv-text);
}

.card-title-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8rpx;
}

.card-title-line .card-title {
  margin-bottom: 0;
}

.card-action {
  display: flex;
  gap: 4rpx;
  align-items: center;
  min-height: 72rpx;
  padding: 0 12rpx;
}

.card-action-text {
  font-size: 23rpx;
  color: var(--inv-primary-dark);
}

.quantity-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.quantity-main {
  display: flex;
  flex-direction: column;
}

.card-label {
  font-size: 23rpx;
  color: var(--inv-text-tertiary);
}

.quantity-value {
  margin-top: 4rpx;
  font-size: 38rpx;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--inv-text);
}

.quantity-unit {
  margin-left: 6rpx;
  font-size: 24rpx;
  font-weight: 500;
  color: var(--inv-text-secondary);
}

.stepper {
  display: flex;
  gap: 12rpx;
}

.stepper-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 88rpx;
  height: 88rpx;
  background: #f4f5f7;
  border-radius: 20rpx;
}

.stepper-btn:active {
  background: #e9ebee;
}

.stepper-btn.disabled {
  opacity: 0.4;
}

.info-row {
  display: flex;
  gap: 24rpx;
  align-items: flex-start;
  justify-content: space-between;
  padding: 18rpx 0;
  border-bottom: 1rpx solid #f4f5f7;
}

.info-row:last-child {
  border-bottom: 0;
}

.info-label {
  flex-shrink: 0;
  font-size: 25rpx;
  color: var(--inv-text-tertiary);
}

.info-value {
  flex: 1;
  font-size: 26rpx;
  color: var(--inv-text);
  text-align: right;
  word-break: break-all;
}

.info-value.muted {
  color: var(--inv-text-tertiary);
}

.info-block {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
  padding: 18rpx 0;
}

.info-text {
  font-size: 26rpx;
  line-height: 1.7;
  color: var(--inv-text);
  white-space: pre-wrap;
}

.warranty-badge {
  padding: 4rpx 14rpx;
  font-size: 21rpx;
  font-weight: 600;
  border-radius: 999rpx;
}

.warranty-badge.ok {
  color: #1f8f5f;
  background: #e8f7f0;
}

.warranty-badge.warn {
  color: #b76b00;
  background: #fff5e6;
}

.warranty-badge.danger {
  color: #c93b36;
  background: #fff1f0;
}

.maintenance-empty {
  padding: 26rpx 0 10rpx;
  font-size: 23rpx;
  line-height: 1.6;
  color: var(--inv-text-tertiary);
}

.maintenance-row {
  display: flex;
  gap: 16rpx;
  align-items: flex-start;
  padding: 22rpx 0;
  border-bottom: 1rpx solid #f4f5f7;
}

.maintenance-row:last-child {
  padding-bottom: 4rpx;
  border-bottom: 0;
}

.maintenance-dot {
  flex-shrink: 0;
  width: 16rpx;
  height: 16rpx;
  margin-top: 10rpx;
  border-radius: 50%;
}

.maintenance-dot.ok {
  background: var(--inv-primary);
}

.maintenance-dot.warn {
  background: #ff9f0a;
}

.maintenance-dot.danger {
  background: #f54a45;
}

.maintenance-main {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.maintenance-title-line {
  display: flex;
  gap: 12rpx;
  align-items: center;
}

.maintenance-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  font-size: 27rpx;
  font-weight: 600;
  color: var(--inv-text);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.maintenance-status {
  flex-shrink: 0;
  font-size: 21rpx;
}

.maintenance-status.ok {
  color: var(--inv-primary-dark);
}

.maintenance-status.warn {
  color: #b76b00;
}

.maintenance-status.danger {
  color: #c93b36;
}

.maintenance-meta {
  margin-top: 6rpx;
  font-size: 21rpx;
  color: var(--inv-text-tertiary);
}

.maintenance-desc {
  margin-top: 6rpx;
  font-size: 23rpx;
  line-height: 1.55;
  color: var(--inv-text-secondary);
}

.maintenance-cost {
  flex-shrink: 0;
  font-size: 24rpx;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--inv-text);
}

.bottom-bar {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 40;
  display: flex;
  padding: 14rpx 24rpx calc(14rpx + env(safe-area-inset-bottom));
  background: rgb(255 255 255 / 96%);
  backdrop-filter: blur(12px);
  border-top: 1rpx solid #f0f0f0;
}

.bottom-btn {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 4rpx;
  align-items: center;
  justify-content: center;
  min-height: 88rpx;
}

.bottom-btn:active {
  opacity: 0.6;
}

.bottom-btn-text {
  font-size: 21rpx;
  color: var(--inv-text-secondary);
}

.maintenance-sheet {
  max-height: 88vh;
  overflow-y: auto;
  overscroll-behavior-y: contain;
}

.form-row {
  display: flex;
  gap: 20rpx;
  align-items: center;
  min-height: 96rpx;
  border-bottom: 1rpx solid #f2f3f5;
}

.form-label {
  flex-shrink: 0;
  width: 150rpx;
  font-size: 26rpx;
  color: var(--inv-text-secondary);
}

.form-input {
  flex: 1;
  height: 96rpx;
  font-size: 16px;
  color: var(--inv-text);
}

.form-placeholder {
  color: var(--inv-text-tertiary);
}

.form-picker {
  flex: 1;
}

.form-value {
  flex: 1;
  font-size: 26rpx;
  color: var(--inv-text);
  text-align: right;
}

.form-value.muted {
  color: var(--inv-text-tertiary);
}

.form-clear {
  flex-shrink: 0;
  padding: 12rpx 8rpx 12rpx 20rpx;
  font-size: 22rpx;
  color: var(--inv-text-tertiary);
}

.form-block {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f2f3f5;
}

.form-block .form-label {
  width: auto;
}

.form-textarea {
  box-sizing: border-box;
  width: 100%;
  height: 150rpx;
  padding: 18rpx;
  font-size: 16px;
  line-height: 1.6;
  color: var(--inv-text);
  background: #f7f8fa;
  border-radius: 16rpx;
}

.maintenance-actions {
  display: flex;
  gap: 20rpx;
  margin-top: 30rpx;
}

.maintenance-delete,
.maintenance-save {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  height: 92rpx;
  font-size: 30rpx;
  font-weight: 600;
  border-radius: 999rpx;
}

.maintenance-delete {
  color: #f54a45;
  background: #fff1f0;
}

.maintenance-save {
  color: #fff;
  background: var(--inv-primary);
}

.maintenance-save.disabled {
  opacity: 0.5;
}
</style>
