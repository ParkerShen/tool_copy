<route lang="json5" type="page">
{
  layout: "default",
  style: {
    navigationBarTitleText: "物品",
    navigationBarBackgroundColor: "#FFFFFF",
  },
}
</route>

<template>
  <view class="edit-page">
    <app-navbar :title="isEdit ? '编辑物品' : '新增物品'" fallback="/pages/index/index" />

    <page-state v-if="state === 'loading'" state="loading" class="page-state" />

    <page-state
      v-else-if="state === 'error'"
      state="error"
      class="page-state"
      :description="errorMessage"
      @retry="load"
    />

    <template v-else>
      <view class="page-body">
        <view class="form-card">
          <text class="form-card-title">照片</text>
          <photo-picker v-model="form.photos" />
          <text class="form-hint">最多 5 张，第一张作为封面</text>
        </view>

        <view class="form-card">
          <text class="form-card-title">基本信息</text>

          <view class="form-row">
            <text class="form-label required">名称</text>
            <input
              v-model="form.name"
              class="form-input"
              type="text"
              maxlength="60"
              placeholder="例如：戴森吸尘器"
              placeholder-class="form-placeholder"
            />
          </view>

          <view class="form-row">
            <text class="form-label">数量</text>
            <input
              v-model="form.quantity"
              class="form-input"
              type="digit"
              placeholder="1"
              placeholder-class="form-placeholder"
            />
            <input
              v-model="form.unit"
              class="form-unit"
              type="text"
              maxlength="8"
              placeholder="单位"
              placeholder-class="form-placeholder"
            />
          </view>

          <view class="form-row" @click="locationPickerVisible = true">
            <text class="form-label">位置</text>
            <text class="form-value" :class="{ muted: !locationText }">
              {{ locationText || "未指定位置" }}
            </text>
            <wd-icon name="arrow-right" size="14px" color="#c9cdd4" />
          </view>

          <view class="form-row">
            <text class="form-label">位置快捷</text>
            <view class="form-inline-actions">
              <view class="form-inline-btn" @click="openLocationCreate">
                <wd-icon name="add" size="13px" color="#2ba471" />
                <text class="form-inline-text">新建位置</text>
              </view>
              <view v-if="form.locationId" class="form-inline-btn" @click="form.locationId = null">
                清除位置
              </view>
            </view>
          </view>

          <view class="form-row" @click="tagPickerVisible = true">
            <text class="form-label">标签</text>
            <view class="tag-values">
              <text
                v-for="tag in selectedTags"
                :key="tag.id"
                class="tag-value"
                :style="{ color: tag.color, background: `${tag.color}1a` }"
              >
                {{ tag.name }}
              </text>
              <text v-if="selectedTags.length === 0" class="form-value muted">未添加标签</text>
            </view>
            <wd-icon name="arrow-right" size="14px" color="#c9cdd4" />
          </view>

          <view class="form-block">
            <text class="form-label">备注</text>
            <textarea
              v-model="form.description"
              class="form-textarea"
              maxlength="500"
              placeholder="外观、用途、存放说明等"
              placeholder-class="form-placeholder"
            />
          </view>
        </view>

        <view class="form-card">
          <text class="form-card-title">识别信息</text>

          <view class="form-row">
            <text class="form-label">序列号</text>
            <input
              v-model="form.serialNumber"
              class="form-input"
              type="text"
              maxlength="60"
              placeholder="SN / IMEI"
              placeholder-class="form-placeholder"
            />
          </view>

          <view class="form-row">
            <text class="form-label">型号</text>
            <input
              v-model="form.modelNumber"
              class="form-input"
              type="text"
              maxlength="60"
              placeholder="型号或规格"
              placeholder-class="form-placeholder"
            />
          </view>

          <view class="form-row">
            <text class="form-label">厂商</text>
            <input
              v-model="form.manufacturer"
              class="form-input"
              type="text"
              maxlength="60"
              placeholder="品牌 / 厂商"
              placeholder-class="form-placeholder"
            />
          </view>
        </view>

        <view class="form-card">
          <text class="form-card-title">购买与保修</text>

          <view class="form-row">
            <text class="form-label">购买价格</text>
            <view class="price-input-wrap">
              <text class="price-prefix">¥</text>
              <input
                v-model="form.price"
                class="form-input price-input"
                type="digit"
                placeholder="0.00"
                placeholder-class="form-placeholder"
              />
            </view>
          </view>

          <view class="form-row">
            <text class="form-label">购买日期</text>
            <picker
              class="form-picker"
              mode="date"
              :value="form.purchaseDate"
              @change="setDate('purchaseDate', $event)"
            >
              <view class="form-value" :class="{ muted: !form.purchaseDate }">
                {{ form.purchaseDate || "未填写" }}
              </view>
            </picker>
            <view v-if="form.purchaseDate" class="form-clear" @click="form.purchaseDate = ''">
              清除
            </view>
          </view>

          <view class="form-row">
            <text class="form-label">购买渠道</text>
            <input
              v-model="form.purchaseFrom"
              class="form-input"
              type="text"
              maxlength="60"
              placeholder="京东、门店等"
              placeholder-class="form-placeholder"
            />
          </view>

          <view class="form-row">
            <text class="form-label">终身保修</text>
            <view class="form-switch-wrap" @click="form.lifetimeWarranty = !form.lifetimeWarranty">
              <view class="form-switch" :class="{ on: form.lifetimeWarranty }">
                <view class="form-switch-dot" />
              </view>
            </view>
          </view>

          <view v-if="!form.lifetimeWarranty" class="form-row">
            <text class="form-label">保修到期</text>
            <picker
              class="form-picker"
              mode="date"
              :value="form.warrantyExpiresOn"
              @change="setDate('warrantyExpiresOn', $event)"
            >
              <view class="form-value" :class="{ muted: !form.warrantyExpiresOn }">
                {{ form.warrantyExpiresOn || "未填写" }}
              </view>
            </picker>
            <view
              v-if="form.warrantyExpiresOn"
              class="form-clear"
              @click="form.warrantyExpiresOn = ''"
            >
              清除
            </view>
          </view>

          <view class="form-row">
            <text class="form-label">保修备注</text>
            <input
              v-model="form.warrantyNote"
              class="form-input"
              type="text"
              maxlength="100"
              placeholder="保修范围、凭证位置等"
              placeholder-class="form-placeholder"
            />
          </view>
        </view>

        <view class="form-card">
          <view class="form-card-title-line">
            <text class="form-card-title">自定义属性</text>
            <text class="form-card-hint">{{ form.fields.length }}/{{ MAX_ITEM_FIELDS }}</text>
          </view>

          <view v-for="(field, index) in form.fields" :key="index" class="field-row">
            <input
              v-model="field.name"
              class="field-name"
              type="text"
              maxlength="20"
              placeholder="属性名"
              placeholder-class="form-placeholder"
            />
            <input
              v-model="field.value"
              class="field-value"
              type="text"
              maxlength="200"
              placeholder="值"
              placeholder-class="form-placeholder"
            />
            <view class="field-remove" @click="form.fields.splice(index, 1)">
              <wd-icon name="close" size="14px" color="#8f959e" />
            </view>
          </view>

          <view
            v-if="form.fields.length < MAX_ITEM_FIELDS"
            class="field-add"
            @click="form.fields.push({ name: '', value: '' })"
          >
            <wd-icon name="add" size="14px" color="#2ba471" />
            <text class="field-add-text">添加属性</text>
          </view>
        </view>
      </view>

      <view v-show="keyboardOffset < 120" class="bottom-bar">
        <view v-if="isEdit" class="bottom-delete" @click="confirmDelete">删除</view>
        <view class="bottom-save" :class="{ disabled: saving }" @click="save">
          {{ saving ? "保存中…" : "保存" }}
        </view>
      </view>
    </template>

    <location-picker
      v-model:visible="locationPickerVisible"
      :selected-id="form.locationId"
      :locations="locations"
      @select="onLocationSelect"
    />

    <tag-picker
      v-model:visible="tagPickerVisible"
      v-model:selected-ids="form.tagIds"
      @update:visible="onTagPickerVisibleChange"
    />

    <view v-if="locationSheetVisible" class="inv-sheet-mask" @click="closeLocationCreate">
      <view class="inv-sheet location-create-sheet" @click.stop>
        <view class="inv-sheet-head">
          <text class="inv-sheet-title">新建位置</text>
          <text class="inv-sheet-cancel" @click="closeLocationCreate">取消</text>
        </view>
        <text class="location-create-hint">
          {{
            form.locationId && locationText
              ? `将创建在「${locationText}」下面`
              : "将创建一个顶层位置，例如：客厅"
          }}
        </text>
        <input
          v-model="newLocationName"
          class="location-create-input"
          type="text"
          maxlength="30"
          placeholder="位置名称"
          placeholder-class="form-placeholder"
          @confirm="createLocationInline"
        />
        <view
          class="location-create-btn"
          :class="{ disabled: creatingLocation }"
          @click="createLocationInline"
        >
          {{ creatingLocation ? "创建中…" : "创建并选中" }}
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue"
import { onLoad } from "@dcloudio/uni-app"
import {
  createItem,
  createLocation,
  deleteItem,
  getItemDetail,
  isInventoryAvailable,
  listLocations,
  listTags,
  updateItem,
  MAX_ITEM_FIELDS,
  type InventoryLocation,
  type InventoryTag,
  type ItemPhotoInput,
} from "@/api/inventory"
import { decimalToCents, formatCents } from "@/api/bookkeeping/money"
import { useKeyboardOffset } from "@/utils/keyboard"
import PhotoPicker from "./components/PhotoPicker.vue"
import LocationPicker from "./components/LocationPicker.vue"
import TagPicker from "./components/TagPicker.vue"

interface FieldDraft {
  name: string
  value: string
}

const editId = ref("")
const isEdit = computed(() => !!editId.value)
const state = ref<"loading" | "ready" | "error">("loading")
const errorMessage = ref("")
const saving = ref(false)

const locations = ref<InventoryLocation[]>([])
const allTags = ref<InventoryTag[]>([])
const locationPickerVisible = ref(false)
const tagPickerVisible = ref(false)

const locationSheetVisible = ref(false)
const newLocationName = ref("")
const creatingLocation = ref(false)

const { offset: keyboardOffset, attach } = useKeyboardOffset()

const form = reactive({
  name: "",
  description: "",
  quantity: "1",
  unit: "",
  locationId: null as string | null,
  serialNumber: "",
  modelNumber: "",
  manufacturer: "",
  price: "",
  purchaseDate: "",
  purchaseFrom: "",
  lifetimeWarranty: false,
  warrantyExpiresOn: "",
  warrantyNote: "",
  photos: [] as ItemPhotoInput[],
  tagIds: [] as string[],
  fields: [] as FieldDraft[],
})

const selectedTags = computed(() => allTags.value.filter((tag) => form.tagIds.includes(tag.id)))

const locationText = computed(() => {
  if (!form.locationId) return ""
  const byId = new Map(locations.value.map((location) => [location.id, location]))
  const names: string[] = []
  let current = byId.get(form.locationId)
  const visited = new Set<string>()
  while (current && !visited.has(current.id)) {
    visited.add(current.id)
    names.unshift(current.name)
    current = current.parentId ? byId.get(current.parentId) : undefined
  }
  return names.join(" / ")
})

function errorText(error: unknown): string {
  if (typeof error === "string" && error) return error
  if (error instanceof Error && error.message) return error.message
  const raw = error as { errMsg?: string; message?: string } | null
  return raw?.errMsg || raw?.message || "未知错误"
}

async function load(): Promise<void> {
  if (!isInventoryAvailable) {
    state.value = "error"
    errorMessage.value = "收纳仅支持本地数据模式，请使用 standalone 构建。"
    return
  }

  try {
    state.value = state.value === "ready" ? state.value : "loading"
    const [locationList, tags] = await Promise.all([listLocations(), listTags()])
    locations.value = locationList
    allTags.value = tags

    if (editId.value) {
      const detail = await getItemDetail(editId.value)
      if (!detail) {
        state.value = "error"
        errorMessage.value = "物品不存在或已被删除。"
        return
      }
      form.name = detail.name
      form.description = detail.description
      form.quantity = String(detail.quantity)
      form.unit = detail.unit
      form.locationId = detail.locationId
      form.serialNumber = detail.serialNumber
      form.modelNumber = detail.modelNumber
      form.manufacturer = detail.manufacturer
      form.price = detail.purchasePriceCents > 0 ? formatCents(detail.purchasePriceCents) : ""
      form.purchaseDate = detail.purchaseDate
      form.purchaseFrom = detail.purchaseFrom
      form.lifetimeWarranty = detail.lifetimeWarranty
      form.warrantyExpiresOn = detail.warrantyExpiresOn
      form.warrantyNote = detail.warrantyNote
      form.photos = detail.photos.map((photo) => ({
        dataUrl: photo.dataUrl,
        thumbUrl: photo.thumbUrl,
      }))
      form.tagIds = detail.tags.map((tag) => tag.id)
      form.fields = detail.fields.map((field) => ({ name: field.name, value: field.value }))
    }

    state.value = "ready"
  } catch (error) {
    console.error("[inventory] 编辑页加载失败:", error)
    state.value = "error"
    errorMessage.value = errorText(error)
  }
}

function setDate(
  field: "purchaseDate" | "warrantyExpiresOn",
  event: { detail?: { value?: string } },
): void {
  const value = event.detail?.value
  if (value) form[field] = value
}

function onLocationSelect(location: InventoryLocation | null): void {
  form.locationId = location?.id || null
}

function onTagPickerVisibleChange(visible: boolean): void {
  if (visible) return
  listTags()
    .then((tags) => {
      allTags.value = tags
    })
    .catch(() => {
      // 标签刷新失败不影响已选内容
    })
}

function openLocationCreate(): void {
  newLocationName.value = ""
  locationSheetVisible.value = true
}

function closeLocationCreate(): void {
  locationSheetVisible.value = false
}

async function createLocationInline(): Promise<void> {
  const name = newLocationName.value.trim()
  if (!name || creatingLocation.value) {
    if (!name) uni.showToast({ title: "请输入位置名称", icon: "none" })
    return
  }
  creatingLocation.value = true
  try {
    const created = await createLocation({ name, parentId: form.locationId || null })
    locations.value = await listLocations()
    form.locationId = created.id
    locationSheetVisible.value = false
    uni.$emit("refreshInventoryData")
    uni.showToast({ title: "位置已创建", icon: "success" })
  } catch (error) {
    uni.showToast({ title: errorText(error), icon: "none" })
  } finally {
    creatingLocation.value = false
  }
}

function normalizeQuantity(text: string): number {
  const trimmed = text.trim()
  if (!trimmed) return 1
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    throw new Error("数量格式不正确")
  }
  const value = Number(trimmed)
  if (!Number.isFinite(value) || value < 0) {
    throw new Error("数量不能为负数")
  }
  if (value > 999_999) {
    throw new Error("数量过大")
  }
  return Math.round(value * 1000) / 1000
}

async function save(): Promise<void> {
  if (saving.value) return

  const name = form.name.trim()
  if (!name) {
    uni.showToast({ title: "请填写物品名称", icon: "none" })
    return
  }

  let quantity = 1
  let priceCents = 0
  const fields: FieldDraft[] = []
  try {
    quantity = normalizeQuantity(form.quantity)
    if (form.price.trim()) {
      priceCents = decimalToCents(form.price)
      if (priceCents < 0) throw new Error("价格不能为负数")
    }
    for (const field of form.fields) {
      const fieldName = field.name.trim()
      const fieldValue = field.value.trim()
      if (!fieldName && !fieldValue) continue
      if (!fieldName) throw new Error("自定义属性需要填写名称")
      fields.push({ name: fieldName, value: fieldValue })
    }
  } catch (error) {
    uni.showToast({ title: errorText(error), icon: "none" })
    return
  }

  const input = {
    name,
    description: form.description.trim(),
    quantity,
    unit: form.unit.trim(),
    locationId: form.locationId,
    serialNumber: form.serialNumber.trim(),
    modelNumber: form.modelNumber.trim(),
    manufacturer: form.manufacturer.trim(),
    purchasePriceCents: priceCents,
    purchaseDate: form.purchaseDate,
    purchaseFrom: form.purchaseFrom.trim(),
    warrantyExpiresOn: form.lifetimeWarranty ? "" : form.warrantyExpiresOn,
    lifetimeWarranty: form.lifetimeWarranty,
    warrantyNote: form.warrantyNote.trim(),
    photos: form.photos,
    tagIds: form.tagIds,
    fields,
  }

  saving.value = true
  uni.showLoading({ title: "保存中...", mask: true })
  try {
    if (isEdit.value) {
      await updateItem(editId.value, input)
    } else {
      await createItem(input)
    }
    uni.hideLoading()
    uni.$emit("refreshInventoryData")
    uni.showToast({ title: "已保存", icon: "success" })
    setTimeout(() => {
      goBackAfterSave()
    }, 350)
  } catch (error) {
    uni.hideLoading()
    uni.showToast({ title: errorText(error), icon: "none" })
  } finally {
    saving.value = false
  }
}

function goBackAfterSave(): void {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack()
  } else {
    uni.redirectTo({ url: "/pages/Storage/index" })
  }
}

function confirmDelete(): void {
  if (!editId.value) return
  uni.showModal({
    title: "删除物品",
    content: "物品的照片、标签关联和维护记录会一并删除，且不可恢复。",
    confirmText: "删除",
    confirmColor: "#f54a45",
    success: async (result) => {
      if (!result.confirm) return
      try {
        uni.showLoading({ title: "删除中...", mask: true })
        await deleteItem(editId.value)
        uni.hideLoading()
        uni.$emit("refreshInventoryData")
        uni.showToast({ title: "已删除", icon: "success" })
        setTimeout(goBackAfterSave, 350)
      } catch (error) {
        uni.hideLoading()
        uni.showToast({ title: errorText(error), icon: "none" })
      }
    },
  })
}

onLoad((options) => {
  const query = (options || {}) as Record<string, string | undefined>
  editId.value = query.id || ""
  if (query.locationId) form.locationId = query.locationId
  load()
})

onMounted(attach)
</script>

<style scoped lang="scss">
.edit-page {
  min-height: 100vh;
  background: var(--inv-bg);
}

.page-state {
  padding-top: 120rpx;
}

.page-body {
  padding: 20rpx 24rpx calc(170rpx + env(safe-area-inset-bottom));
}

.form-card {
  padding: 24rpx 28rpx;
  margin-bottom: 18rpx;
  background: #fff;
  border-radius: 24rpx;
  box-shadow: 0 4rpx 16rpx rgb(31 35 41 / 4%);
}

.form-card-title {
  display: block;
  margin-bottom: 12rpx;
  font-size: 26rpx;
  font-weight: 600;
  color: var(--inv-text);
}

.form-card-title-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12rpx;
}

.form-card-title-line .form-card-title {
  margin-bottom: 0;
}

.form-card-hint {
  font-size: 21rpx;
  color: var(--inv-text-tertiary);
}

.form-hint {
  display: block;
  margin-top: 12rpx;
  font-size: 21rpx;
  color: var(--inv-text-tertiary);
}

.form-row {
  display: flex;
  gap: 20rpx;
  align-items: center;
  min-height: 96rpx;
  border-bottom: 1rpx solid #f2f3f5;
}

.form-row:last-child {
  border-bottom: 0;
}

.form-label {
  flex-shrink: 0;
  width: 150rpx;
  font-size: 26rpx;
  color: var(--inv-text-secondary);
}

.form-label.required::after {
  margin-left: 4rpx;
  color: #f54a45;
  content: "*";
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

.form-unit {
  flex-shrink: 0;
  width: 120rpx;
  height: 64rpx;
  padding: 0 16rpx;
  font-size: 16px;
  color: var(--inv-text);
  text-align: center;
  background: #f7f8fa;
  border-radius: 12rpx;
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
  padding: 12rpx 0 12rpx 20rpx;
  font-size: 22rpx;
  color: var(--inv-text-tertiary);
}

.form-block {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  padding: 20rpx 0 8rpx;
}

.form-block .form-label {
  width: auto;
}

.form-textarea {
  box-sizing: border-box;
  width: 100%;
  height: 170rpx;
  padding: 18rpx;
  font-size: 16px;
  line-height: 1.6;
  color: var(--inv-text);
  background: #f7f8fa;
  border-radius: 16rpx;
}

.form-inline-actions {
  display: flex;
  flex: 1;
  gap: 20rpx;
  justify-content: flex-end;
}

.form-inline-btn {
  display: flex;
  gap: 4rpx;
  align-items: center;
  min-height: 64rpx;
  font-size: 23rpx;
  color: var(--inv-primary-dark);
}

.tag-values {
  display: flex;
  flex: 1;
  flex-wrap: wrap;
  gap: 8rpx;
  justify-content: flex-end;
}

.tag-value {
  padding: 4rpx 14rpx;
  font-size: 21rpx;
  border-radius: 999rpx;
}

.price-input-wrap {
  display: flex;
  flex: 1;
  align-items: center;
}

.price-prefix {
  margin-right: 6rpx;
  font-size: 28rpx;
  color: var(--inv-text-secondary);
}

.price-input {
  flex: 1;
}

.form-switch-wrap {
  display: flex;
  flex: 1;
  justify-content: flex-end;
}

.form-switch {
  position: relative;
  width: 88rpx;
  height: 52rpx;
  background: #e5e6eb;
  border-radius: 999rpx;
  transition: background 0.15s ease;
}

.form-switch.on {
  background: var(--inv-primary);
}

.form-switch-dot {
  position: absolute;
  top: 4rpx;
  left: 4rpx;
  width: 44rpx;
  height: 44rpx;
  background: #fff;
  border-radius: 50%;
  box-shadow: 0 2rpx 6rpx rgb(0 0 0 / 18%);
  transition: transform 0.15s ease;
}

.form-switch.on .form-switch-dot {
  transform: translateX(36rpx);
}

.field-row {
  display: flex;
  gap: 14rpx;
  align-items: center;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f2f3f5;
}

.field-name {
  box-sizing: border-box;
  width: 200rpx;
  height: 72rpx;
  padding: 0 16rpx;
  font-size: 16px;
  color: var(--inv-text);
  background: #f7f8fa;
  border-radius: 12rpx;
}

.field-value {
  box-sizing: border-box;
  flex: 1;
  height: 72rpx;
  padding: 0 16rpx;
  font-size: 16px;
  color: var(--inv-text);
  background: #f7f8fa;
  border-radius: 12rpx;
}

.field-remove {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64rpx;
  height: 64rpx;
}

.field-add {
  display: flex;
  gap: 8rpx;
  align-items: center;
  justify-content: center;
  min-height: 80rpx;
  margin-top: 16rpx;
  font-size: 24rpx;
  color: var(--inv-primary-dark);
  background: var(--inv-primary-soft);
  border-radius: 14rpx;
}

.field-add-text {
  font-size: 24rpx;
}

.bottom-bar {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 40;
  display: flex;
  gap: 20rpx;
  padding: 14rpx 24rpx calc(14rpx + env(safe-area-inset-bottom));
  background: rgb(255 255 255 / 96%);
  backdrop-filter: blur(12px);
  border-top: 1rpx solid #f0f0f0;
}

.bottom-delete {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 160rpx;
  height: 92rpx;
  font-size: 27rpx;
  color: #f54a45;
  background: #fff1f0;
  border-radius: 999rpx;
}

.bottom-save {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  height: 92rpx;
  font-size: 30rpx;
  font-weight: 600;
  color: #fff;
  background: var(--inv-primary);
  border-radius: 999rpx;
}

.bottom-save.disabled {
  opacity: 0.6;
}

.location-create-sheet {
  max-height: 70vh;
}

.location-create-hint {
  display: block;
  margin-top: 8rpx;
  font-size: 23rpx;
  line-height: 1.6;
  color: var(--inv-text-tertiary);
}

.location-create-input {
  box-sizing: border-box;
  width: 100%;
  height: 92rpx;
  padding: 0 24rpx;
  margin-top: 22rpx;
  font-size: 16px;
  color: var(--inv-text);
  background: #f7f8fa;
  border-radius: 16rpx;
}

.location-create-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 92rpx;
  margin-top: 24rpx;
  font-size: 30rpx;
  font-weight: 600;
  color: #fff;
  background: var(--inv-primary);
  border-radius: 999rpx;
}

.location-create-btn.disabled {
  opacity: 0.6;
}
</style>
