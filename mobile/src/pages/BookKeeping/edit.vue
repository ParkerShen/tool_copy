<!--
 * 新建 / 编辑记账记录。
 * /pages/BookKeeping/edit           新建
 * /pages/BookKeeping/edit?id=xxx    编辑
 * /pages/BookKeeping/edit?type=income&date=YYYY-MM-DD
 *
 * 布局与常见记账 App 一致：上方分类网格，下方金额 + 备注 + 数字键盘。
 * 点击分类即可输入金额；键盘第四列同时提供日期按钮。
-->
<route lang="json5" type="page">
{
  layout: "default",
  style: {
    navigationStyle: "custom",
    navigationBarTitleText: "记一笔",
  },
}
</route>

<template>
  <view class="entry-page">
    <view class="entry-head">
      <view class="head-inner">
        <view class="type-tabs">
          <text
            class="type-tab"
            :class="{ active: form.type === 'expense' }"
            @click="setType('expense')"
          >
            支出
          </text>
          <text
            class="type-tab"
            :class="{ active: form.type === 'income' }"
            @click="setType('income')"
          >
            收入
          </text>
        </view>

        <view class="head-actions">
          <view v-if="isEdit" class="head-icon" @click="handleDelete">
            <wd-icon name="delete" size="20px" color="#8f959e" />
          </view>
          <text class="head-cancel" @click="handleCancel">取消</text>
        </view>
      </view>
    </view>

    <page-state
      v-if="state !== 'ready'"
      class="entry-state"
      :state="state === 'loading' ? 'loading' : 'error'"
      :description="errorMessage"
      @retry="load"
    />

    <template v-else>
      <scroll-view scroll-y class="category-scroll">
        <view class="category-grid">
          <view
            v-for="category in filteredCategories"
            :key="category.id"
            class="category-cell"
            @click="selectCategory(category)"
          >
            <view class="category-icon" :class="{ selected: isSelected(category) }">
              <wd-icon
                :name="category.icon || 'star'"
                size="21px"
                :color="isSelected(category) ? '#ffffff' : '#646a73'"
              />
            </view>
            <text class="category-name" :class="{ selected: isSelected(category) }">
              {{ category.name }}
            </text>
          </view>

          <view class="category-cell" @click="openCategoryModal">
            <view class="category-icon add">
              <wd-icon name="add" size="21px" color="#8f959e" />
            </view>
            <text class="category-name">新建</text>
          </view>
        </view>
      </scroll-view>

      <view
        class="entry-bottom"
        :style="noteFocused ? { paddingBottom: `${keyboardOffset + 8}px` } : undefined"
      >
        <view v-if="form.images.length > 0" class="image-strip">
          <view v-for="(image, index) in form.images" :key="index" class="image-item">
            <image class="image-thumb" :src="image" mode="aspectFill" @click="previewImage(index)" />
            <view class="image-remove" @click.stop="removeImage(index)">
              <wd-icon name="close" size="11px" color="#ffffff" />
            </view>
          </view>
          <view v-if="form.images.length < MAX_RECORD_IMAGES" class="image-add" @click="addImage">
            <wd-icon name="add" size="20px" color="#8f959e" />
          </view>
        </view>

        <view class="amount-row" @click="focusAmount">
          <text class="amount-currency" :class="form.type">¥</text>
          <text class="amount-value bk-amount" :class="form.type">{{ amountDisplay }}</text>
          <text v-if="previewText" class="amount-preview">{{ previewText }}</text>
        </view>

        <view class="note-row">
          <text class="note-label">备注：</text>
          <input
            v-model="form.remark"
            class="note-input"
            type="text"
            maxlength="100"
            placeholder="点击填写备注"
            placeholder-class="note-placeholder"
            confirm-type="done"
            @focus="handleNoteFocus"
            @blur="handleNoteBlur"
            @confirm="blurNote"
          />
          <view class="note-tools">
            <view class="note-tool" @click="addImage">
              <wd-icon name="picture" size="21px" color="#8f959e" />
              <text v-if="form.images.length > 0" class="tool-count">{{ form.images.length }}</text>
            </view>
            <view class="note-tool" @click="openTagSheet">
              <wd-icon name="discount" size="21px" color="#8f959e" />
              <text v-if="form.tags.length > 0" class="tool-count">{{ form.tags.length }}</text>
            </view>
          </view>
        </view>

        <view v-if="form.tags.length > 0" class="tag-strip">
          <view v-for="tag in form.tags" :key="tag" class="tag-chip" @click="removeTag(tag)">
            #{{ tag }}
            <wd-icon name="close" size="11px" color="#ff9f00" />
          </view>
        </view>

        <view class="account-row">
          <view class="account-chip" @click="openAccountPicker">
            <view class="account-dot" :style="{ background: selectedAccount?.color || '#f7b731' }" />
            <text class="account-name">{{ selectedAccount?.name || "请选择账户" }}</text>
            <wd-icon name="chevron-down" size="14px" color="#8f959e" />
          </view>
          <text v-if="selectedAccount" class="account-balance bk-amount">
            余额 ¥{{ formatCents(selectedAccount.balanceCents) }}
          </text>
        </view>

        <keypad
          v-show="!noteFocused"
          v-model="amountExpression"
          :date="form.recordDate"
          @update:date="handleDateChange"
          @done="handleSave"
        />
      </view>
    </template>

    <account-picker
      :model-value="form.accountId"
      :visible="accountPickerVisible"
      :accounts="accounts"
      @update:model-value="handleAccountChange"
      @close="accountPickerVisible = false"
      @manage="goAccounts"
    />

    <tag-sheet
      v-model="form.tags"
      :visible="tagSheetVisible"
      :suggestions="tagSuggestions"
      @update:modelValue="handleTagsUpdate"
      @close="tagSheetVisible = false"
    />

    <add-category-modal
      :visible="categoryModalVisible"
      :category-type="form.type"
      :existing-categories="filteredCategories"
      @close="categoryModalVisible = false"
      @add="handleAddCategory"
    />
  </view>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from "vue"
import { onLoad, onShow } from "@dcloudio/uni-app"
import dayjs from "dayjs"
import {
  createCategory,
  createRecord,
  deleteRecord,
  getAccountBalances,
  getCategories,
  getRecord,
  isLocalDataMode,
  listTags,
  MAX_RECORD_IMAGES,
  updateRecord,
} from "@/api/bookkeeping"
import type { AccountBalance, Category, TagUsage } from "@/api/bookkeeping"
import { centsToAmount, evaluateAmountExpression, formatCents } from "@/api/bookkeeping/money"
import { getDefaultAccountId, setDefaultAccountId } from "@/utils/bookkeeping-prefs"
import { chooseCompressedImages } from "@/utils/image"
import { useKeyboardOffset } from "@/utils/keyboard"
import AddCategoryModal from "./components/AddCategoryModal.vue"
import AccountPicker from "./components/AccountPicker.vue"
import Keypad from "./components/Keypad.vue"
import TagSheet from "./components/TagSheet.vue"

const state = ref<"loading" | "ready" | "error">("loading")
const errorMessage = ref("")
const saving = ref(false)
const recordId = ref("")
const initialType = ref<"income" | "expense">("expense")
const categories = ref<Category[]>([])
const accounts = ref<AccountBalance[]>([])
const tagSuggestions = ref<TagUsage[]>([])
const amountExpression = ref("")
const originalAmountCents = ref<number | null>(null)
const accountPickerVisible = ref(false)
const categoryModalVisible = ref(false)
const tagSheetVisible = ref(false)
const noteFocused = ref(false)
const pickingImage = ref(false)
const baseline = ref("")
const {
  offset: keyboardOffset,
  attach: attachKeyboard,
  detach: detachKeyboard,
} = useKeyboardOffset()

const form = reactive({
  type: "expense" as "income" | "expense",
  categoryId: "" as string,
  accountId: "" as string,
  recordDate: dayjs().format("YYYY-MM-DD"),
  remark: "",
  images: [] as string[],
  tags: [] as string[],
})

const isEdit = computed(() => !!recordId.value)

const filteredCategories = computed(() =>
  categories.value.filter((category) => category.type === form.type),
)

const selectedAccount = computed(() =>
  accounts.value.find((account) => String(account.id) === form.accountId),
)

const parsedCents = computed<number | null>(() => {
  const expression = amountExpression.value.trim()
  if (!expression) return null
  try {
    return evaluateAmountExpression(expression)
  } catch {
    return null
  }
})

const amountValid = computed(() => {
  const cents = parsedCents.value
  if (cents === null || cents === 0) return false
  if (cents > 0) return true
  // 历史退款记录本身是负数时，允许保持原值保存
  return isEdit.value && cents === originalAmountCents.value
})

const canSave = computed(
  () =>
    !saving.value &&
    state.value === "ready" &&
    amountValid.value &&
    !!form.categoryId &&
    !!form.accountId &&
    !!form.recordDate,
)

const amountDisplay = computed(() => amountExpression.value || "0.00")

const previewText = computed(() => {
  if (parsedCents.value === null) return ""
  if (/^\d+(\.\d{0,2})?$/.test(amountExpression.value.trim())) return ""
  return `= ¥${formatCents(parsedCents.value)}`
})

const currentSignature = computed(() =>
  JSON.stringify({
    type: form.type,
    categoryId: form.categoryId,
    accountId: form.accountId,
    recordDate: form.recordDate,
    remark: form.remark,
    images: form.images,
    tags: form.tags,
    amount: amountExpression.value,
  }),
)

const hasChanges = computed(() => !!baseline.value && currentSignature.value !== baseline.value)

function rememberBaseline(): void {
  baseline.value = currentSignature.value
}

function toast(title: string): void {
  uni.showToast({ title, icon: "none" })
}

function errorText(error: unknown): string {
  if (typeof error === "string" && error) return error
  if (error instanceof Error && error.message) return error.message
  const raw = error as { errMsg?: string; message?: string } | null
  return raw?.errMsg || raw?.message || "操作失败"
}

function isSelected(category: Category): boolean {
  return form.categoryId === String(category.id)
}

function selectDefaultCategory(): void {
  const first = filteredCategories.value[0]
  form.categoryId = first ? String(first.id) : ""
}

function defaultAccountId(): string {
  const active = accounts.value.filter((account) => !account.archived)
  const stored = getDefaultAccountId()
  if (stored && active.some((account) => String(account.id) === stored)) {
    return stored
  }
  const system = active.find((account) => account.isSystem)
  return system ? String(system.id) : active[0] ? String(active[0].id) : ""
}

async function load(): Promise<void> {
  state.value = "loading"
  errorMessage.value = ""

  if (!isLocalDataMode) {
    state.value = "error"
    errorMessage.value = "当前构建使用远程接口，编辑页仅支持本地数据模式。"
    return
  }

  try {
    const [categoryResponse, accountResponse, tagResponse] = await Promise.all([
      getCategories(),
      getAccountBalances(true),
      listTags(),
    ])
    categories.value = categoryResponse.data || []
    accounts.value = accountResponse.data || []
    tagSuggestions.value = tagResponse.data || []

    if (isEdit.value) {
      const response = await getRecord(recordId.value)
      const record = response.data
      if (!record) throw new Error("记录不存在或已删除")

      form.type = record.type
      form.categoryId = String(record.categoryId)
      form.accountId = record.accountId || defaultAccountId()
      form.recordDate = record.recordDate
      form.remark = record.remark || ""
      form.images = [...(record.images || [])]
      form.tags = [...(record.tags || [])]
      originalAmountCents.value =
        record.amountCents !== undefined && record.amountCents !== null
          ? record.amountCents
          : Math.round(Number(record.amount) * 100)
      amountExpression.value =
        record.amountCents !== undefined && record.amountCents !== null
          ? (record.amountCents / 100).toFixed(2)
          : record.amount
    } else {
      form.type = initialType.value
      selectDefaultCategory()
      form.accountId = defaultAccountId()
    }

    state.value = "ready"
    rememberBaseline()
  } catch (error) {
    state.value = "error"
    errorMessage.value = errorText(error)
  }
}

async function refreshAccounts(): Promise<void> {
  if (!isLocalDataMode || state.value !== "ready") return
  try {
    const response = await getAccountBalances(true)
    accounts.value = response.data || []
    if (!selectedAccount.value) {
      form.accountId = defaultAccountId()
    }
  } catch (error) {
    console.warn("[bookkeeping] 刷新账户失败:", error)
  }
}

function setType(type: "income" | "expense"): void {
  if (form.type === type) return
  form.type = type
  const selected = filteredCategories.value.some((category) => isSelected(category))
  if (!selected) selectDefaultCategory()
}

function selectCategory(category: Category): void {
  form.categoryId = String(category.id)
  blurNote()
}

function handleNoteFocus(): void {
  noteFocused.value = true
  attachKeyboard()
}

function handleNoteBlur(): void {
  noteFocused.value = false
  detachKeyboard()
}

function blurNote(): void {
  noteFocused.value = false
  detachKeyboard()
  uni.hideKeyboard()
}

function focusAmount(): void {
  blurNote()
}

function handleDateChange(value: string): void {
  form.recordDate = value
}

async function addImage(): Promise<void> {
  if (pickingImage.value) return
  const remaining = MAX_RECORD_IMAGES - form.images.length
  if (remaining <= 0) {
    toast(`最多 ${MAX_RECORD_IMAGES} 张图片`)
    return
  }
  pickingImage.value = true
  try {
    const images = await chooseCompressedImages(remaining)
    if (images.length > 0) {
      form.images = [...form.images, ...images].slice(0, MAX_RECORD_IMAGES)
    }
  } catch (error) {
    toast(errorText(error))
  } finally {
    pickingImage.value = false
  }
}

function removeImage(index: number): void {
  form.images = form.images.filter((_, itemIndex) => itemIndex !== index)
}

function previewImage(index: number): void {
  uni.previewImage({ urls: form.images, current: form.images[index] })
}

function openTagSheet(): void {
  blurNote()
  tagSheetVisible.value = true
}

function handleTagsUpdate(tags: string[]): void {
  form.tags = tags
  for (const tag of tags) {
    if (!tagSuggestions.value.some((item) => item.name === tag)) {
      tagSuggestions.value = [{ name: tag, count: 0 }, ...tagSuggestions.value]
    }
  }
}

function removeTag(tag: string): void {
  form.tags = form.tags.filter((item) => item !== tag)
}

function openAccountPicker(): void {
  blurNote()
  accountPickerVisible.value = true
}

function handleAccountChange(id: string): void {
  form.accountId = id
  // 新建记录时选的账户，下次默认使用；编辑旧记录不改变默认账户
  if (!isEdit.value) setDefaultAccountId(id)
}

function openCategoryModal(): void {
  blurNote()
  categoryModalVisible.value = true
}

async function handleAddCategory(payload: {
  name: string
  icon: string
  color: string
}): Promise<void> {
  try {
    const response = await createCategory({
      name: payload.name,
      type: form.type,
      icon: payload.icon,
      color: payload.color,
    })
    const categoryResponse = await getCategories()
    categories.value = categoryResponse.data || []
    form.categoryId = String(response.data.id)
    uni.showToast({ title: "分类已添加", icon: "success" })
  } catch (error) {
    toast(errorText(error))
  }
}

async function handleSave(): Promise<void> {
  if (saving.value) return
  if (!amountValid.value) {
    toast(amountExpression.value ? "请输入有效金额" : "请输入金额")
    return
  }
  if (!form.categoryId) {
    toast("请选择分类")
    return
  }
  if (!form.accountId) {
    toast("请选择账户")
    return
  }

  saving.value = true
  try {
    const cents = parsedCents.value
    if (cents === null) throw new Error("金额不正确")

    const payload = {
      categoryId: form.categoryId,
      type: form.type,
      amount: centsToAmount(cents),
      accountId: form.accountId,
      recordDate: form.recordDate,
      remark: form.remark.trim(),
      images: [...form.images],
      tags: [...form.tags],
    }

    if (isEdit.value) {
      await updateRecord(recordId.value, payload)
    } else {
      await createRecord(payload)
    }

    if (!isEdit.value) setDefaultAccountId(form.accountId)
    uni.$emit("refreshBookkeepingData")
    uni.showToast({ title: isEdit.value ? "已更新" : "已记账", icon: "success" })
    setTimeout(goBack, 300)
  } catch (error) {
    toast(errorText(error))
  } finally {
    saving.value = false
  }
}

function handleDelete(): void {
  uni.showModal({
    title: "删除记录",
    content: "删除后不可恢复，确定删除吗？",
    confirmText: "删除",
    confirmColor: "#f54a45",
    cancelText: "取消",
    success: async (result) => {
      if (!result.confirm) return
      try {
        await deleteRecord(recordId.value)
        uni.$emit("refreshBookkeepingData")
        uni.showToast({ title: "已删除", icon: "success" })
        setTimeout(goBack, 300)
      } catch (error) {
        toast(errorText(error))
      }
    },
  })
}

function handleCancel(): void {
  if (saving.value) return
  if (!hasChanges.value) {
    goBack()
    return
  }
  uni.showModal({
    title: "放弃编辑",
    content: "当前填写的内容还没有保存，确定离开吗？",
    confirmText: "离开",
    cancelText: "继续编辑",
    success: (result) => {
      if (result.confirm) goBack()
    },
  })
}

function goBack(): void {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack()
    return
  }
  uni.switchTab({ url: "/pages/BookKeeping/index" })
}

function goAccounts(): void {
  accountPickerVisible.value = false
  uni.navigateTo({ url: "/pages/BookKeeping/accounts" })
}

onLoad((query) => {
  recordId.value = query?.id ? String(query.id) : ""
  if (query?.type === "income") initialType.value = "income"
  if (query?.date && /^\d{4}-\d{2}-\d{2}$/.test(String(query.date))) {
    form.recordDate = String(query.date)
  }
  load()
})

onShow(() => {
  refreshAccounts()
})
</script>

<style scoped lang="scss">
.entry-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  background: #fff;
}

.entry-head {
  flex-shrink: 0;
  padding: calc(env(safe-area-inset-top) + 14rpx) 28rpx 0;
  background: #fff;
}

.head-inner {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 76rpx;
}

.type-tabs {
  display: flex;
  gap: 56rpx;
}

.type-tab {
  position: relative;
  padding-bottom: 8rpx;
  font-size: 34rpx;
  color: #8f959e;
}

.type-tab.active {
  font-weight: 600;
  color: var(--bk-text);
}

.type-tab.active::after {
  position: absolute;
  bottom: 0;
  left: 50%;
  width: 44rpx;
  height: 6rpx;
  content: "";
  background: var(--bk-primary);
  border-radius: 3rpx;
  transform: translateX(-50%);
}

.head-actions {
  position: absolute;
  right: 0;
  display: flex;
  align-items: center;
  gap: 24rpx;
}

.head-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56rpx;
  height: 56rpx;
}

.head-cancel {
  font-size: 30rpx;
  color: var(--bk-text-secondary);
}

.entry-state {
  flex: 1;
}

.category-scroll {
  flex: 1;
  height: 0;
  min-height: 0;
}

.category-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 26rpx 0;
  padding: 22rpx 20rpx 18rpx;
}

.category-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 0;
}

.category-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 92rpx;
  height: 92rpx;
  background: #f4f5f6;
  border-radius: 50%;
  transition:
    background 0.15s ease,
    transform 0.15s ease;
}

.category-icon.selected {
  background: var(--bk-primary);
  box-shadow: 0 6rpx 16rpx rgb(255 192 0 / 35%);
  transform: scale(1.04);
}

.category-icon.add {
  background: #fff;
  border: 1rpx dashed #c9cdd4;
}

.category-name {
  max-width: 100%;
  margin-top: 10rpx;
  overflow: hidden;
  font-size: 24rpx;
  color: var(--bk-text-secondary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.category-name.selected {
  font-weight: 600;
  color: var(--bk-text);
}

.entry-bottom {
  flex-shrink: 0;
  padding-bottom: env(safe-area-inset-bottom);
  background: #fff;
}

.image-strip {
  display: flex;
  gap: 16rpx;
  padding: 14rpx 28rpx 0;
}

.image-item {
  position: relative;
  width: 112rpx;
  height: 112rpx;
}

.image-thumb {
  width: 112rpx;
  height: 112rpx;
  border-radius: 14rpx;
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
  align-items: center;
  justify-content: center;
  width: 112rpx;
  height: 112rpx;
  background: #f7f8fa;
  border: 1rpx dashed #c9cdd4;
  border-radius: 14rpx;
}

.amount-row {
  display: flex;
  align-items: baseline;
  justify-content: flex-end;
  padding: 18rpx 28rpx 6rpx;
}

.amount-currency {
  flex-shrink: 0;
  margin-right: 8rpx;
  font-size: 32rpx;
  font-weight: 600;
}

.amount-currency.expense {
  color: var(--bk-expense);
}

.amount-currency.income {
  color: var(--bk-income);
}

.amount-value {
  min-width: 0;
  overflow: hidden;
  font-size: 68rpx;
  font-weight: 600;
  line-height: 1.15;
  color: var(--bk-text);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.amount-preview {
  flex-shrink: 0;
  margin-left: 16rpx;
  font-size: 24rpx;
  color: var(--bk-text-tertiary);
}

.note-row {
  display: flex;
  align-items: center;
  padding: 14rpx 20rpx;
  margin: 8rpx 24rpx;
  background: #f7f8fa;
  border-radius: 14rpx;
}

.note-label {
  flex-shrink: 0;
  font-size: 28rpx;
  color: var(--bk-text-secondary);
}

.note-input {
  flex: 1;
  min-width: 0;
  height: 52rpx;
  font-size: 28rpx;
  color: var(--bk-text);
}

.note-placeholder {
  color: #b7bcc4;
}

.note-tools {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 30rpx;
  padding-left: 12rpx;
}

.note-tool {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44rpx;
  height: 44rpx;
}

.tool-count {
  position: absolute;
  top: -8rpx;
  right: -12rpx;
  min-width: 28rpx;
  height: 28rpx;
  padding: 0 6rpx;
  font-size: 18rpx;
  line-height: 28rpx;
  color: #fff;
  text-align: center;
  background: var(--bk-primary);
  border-radius: 14rpx;
}

.tag-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  padding: 4rpx 28rpx 0;
}

.tag-chip {
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
  padding: 6rpx 16rpx;
  font-size: 23rpx;
  color: var(--bk-primary-dark);
  background: #fff7e0;
  border-radius: 999rpx;
}

.account-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10rpx 28rpx 10rpx;
}

.account-chip {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  padding: 8rpx 18rpx;
  background: #f2f3f5;
  border-radius: 999rpx;
}

.account-dot {
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
}

.account-name {
  max-width: 260rpx;
  overflow: hidden;
  font-size: 24rpx;
  color: var(--bk-text-secondary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.account-balance {
  font-size: 22rpx;
  color: var(--bk-text-tertiary);
}
</style>
