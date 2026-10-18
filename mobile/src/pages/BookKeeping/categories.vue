<!--
 * 分类管理：支出/收入分组、使用次数、新增/编辑/删除。
 * 系统分类可以改名称/图标/颜色，但不能删除；有记录的分类禁止删除。
-->
<route lang="json5" type="page">
{
  layout: "default",
  style: {
    navigationBarTitleText: "分类管理",
    navigationBarBackgroundColor: "#FFFFFF",
    enablePullDownRefresh: true,
  },
}
</route>

<template>
  <view class="categories-page">
    <app-navbar title="分类管理">
      <template #right>
        <view class="nav-add" @click="openCreate">新增</view>
      </template>
    </app-navbar>

    <view class="page-body">
      <view class="type-switch">
        <view
          class="type-item"
          :class="{ active: activeType === 'expense' }"
          @click="setType('expense')"
        >
          支出
        </view>
        <view
          class="type-item"
          :class="{ active: activeType === 'income' }"
          @click="setType('income')"
        >
          收入
        </view>
      </view>

      <page-state v-if="state === 'loading'" state="loading" class="page-state" />

      <page-state
        v-else-if="state === 'error'"
        state="error"
        class="page-state"
        :description="errorMessage"
        @retry="load"
      />

      <page-state
        v-else-if="visibleCategories.length === 0"
        state="empty"
        class="page-state"
        title="还没有分类"
        description="新建一个分类，记账时就能选到它。"
      >
        <view class="empty-btn" @click="openCreate">新建分类</view>
      </page-state>

      <view v-else class="category-list">
        <view
          v-for="category in visibleCategories"
          :key="category.id"
          class="category-row"
          @click="openEdit(category)"
        >
          <view class="category-icon" :style="{ background: `${category.color}1a` }">
            <wd-icon :name="category.icon || 'star'" size="22px" :color="category.color" />
          </view>
          <view class="category-main">
            <view class="category-name-line">
              <text class="category-name">{{ category.name }}</text>
              <text v-if="category.isSystem" class="system-badge">系统</text>
            </view>
            <text class="category-usage">{{ usageCount(category) }} 笔记录</text>
          </view>
          <wd-icon name="chevron-right" size="16px" color="#c9cdd4" />
        </view>

        <text class="list-tip">点击分类可修改名称、图标和颜色</text>
      </view>
    </view>

    <view v-if="editorVisible" class="editor-mask" @click="closeEditor">
      <view class="editor-sheet" @click.stop>
        <view class="editor-head">
          <text class="editor-title">{{ editingId ? "编辑分类" : "新增分类" }}</text>
          <text class="editor-cancel" @click="closeEditor">取消</text>
        </view>

        <view class="editor-preview">
          <view class="preview-icon" :style="{ background: form.color }">
            <wd-icon :name="form.icon" size="32px" color="#fff" />
          </view>
        </view>

        <input
          v-model="form.name"
          class="name-input"
          type="text"
          maxlength="4"
          placeholder="分类名称（不超过 4 个字）"
          placeholder-class="name-placeholder"
        />

        <text class="editor-label">图标</text>
        <view class="icon-grid">
          <view
            v-for="icon in iconOptions"
            :key="icon"
            class="icon-cell"
            :class="{ active: form.icon === icon }"
            :style="form.icon === icon ? { background: form.color } : undefined"
            @click="form.icon = icon"
          >
            <wd-icon :name="icon" size="20px" :color="form.icon === icon ? '#fff' : '#646a73'" />
          </view>
        </view>

        <text class="editor-label">颜色</text>
        <view class="color-grid">
          <view
            v-for="color in colorOptions"
            :key="color"
            class="color-cell"
            :class="{ active: form.color === color }"
            :style="{ background: color }"
            @click="form.color = color"
          >
            <wd-icon v-if="form.color === color" name="check" size="14px" color="#fff" />
          </view>
        </view>

        <view class="editor-actions">
          <view v-if="editingId && !editingIsSystem" class="delete-btn" @click="handleDelete">
            删除
          </view>
          <view class="save-btn" :class="{ disabled: saving }" @click="handleSave">
            {{ saving ? "保存中" : "保存" }}
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from "vue"
import { onPullDownRefresh, onShow } from "@dcloudio/uni-app"
import {
  CATEGORY_COLOR_OPTIONS,
  CATEGORY_ICON_OPTIONS,
  createCategory,
  deleteCategory,
  getCategories,
  getCategoryUsage,
  isLocalDataMode,
  updateCategory,
} from "@/api/bookkeeping"
import type { Category } from "@/api/bookkeeping"

const iconOptions = CATEGORY_ICON_OPTIONS
const colorOptions = CATEGORY_COLOR_OPTIONS

const state = ref<"loading" | "ready" | "error">("loading")
const errorMessage = ref("")
const activeType = ref<"income" | "expense">("expense")
const categories = ref<Category[]>([])
const usage = ref<Record<string, number>>({})
const editorVisible = ref(false)
const editingId = ref("")
const saving = ref(false)
let requestSeq = 0

const form = reactive({
  name: "",
  icon: "star",
  color: "#409eff",
})

const visibleCategories = computed(() =>
  categories.value.filter((category) => category.type === activeType.value),
)

const editingIsSystem = computed(() => {
  const target = categories.value.find((category) => String(category.id) === editingId.value)
  return !!target?.isSystem
})

function toast(title: string): void {
  uni.showToast({ title, icon: "none" })
}

function errorText(error: unknown): string {
  if (typeof error === "string" && error) return error
  if (error instanceof Error && error.message) return error.message
  const raw = error as { errMsg?: string; message?: string } | null
  return raw?.errMsg || raw?.message || "未知错误"
}

function usageCount(category: Category): number {
  return usage.value[String(category.id)] || 0
}

async function load(): Promise<void> {
  if (!isLocalDataMode) {
    state.value = "error"
    errorMessage.value = "当前为远程接口模式，分类管理仅支持本地数据模式。"
    return
  }

  const seq = ++requestSeq
  state.value = "loading"
  errorMessage.value = ""

  try {
    const [categoryResponse, usageResponse] = await Promise.all([
      getCategories(),
      getCategoryUsage(),
    ])
    if (seq !== requestSeq) return

    categories.value = categoryResponse.data || []
    usage.value = usageResponse.data || {}
    state.value = "ready"
  } catch (error) {
    if (seq !== requestSeq) return
    state.value = "error"
    console.error("[bookkeeping] 分类加载失败:", error)
    errorMessage.value = errorText(error)
  }
}

function setType(type: "income" | "expense"): void {
  activeType.value = type
}

function openCreate(): void {
  editingId.value = ""
  form.name = ""
  form.icon = "star"
  form.color = "#409eff"
  editorVisible.value = true
}

function openEdit(category: Category): void {
  editingId.value = String(category.id)
  form.name = category.name
  form.icon = category.icon || "star"
  form.color = category.color || "#409eff"
  editorVisible.value = true
}

function closeEditor(): void {
  if (saving.value) return
  editorVisible.value = false
}

async function handleSave(): Promise<void> {
  if (saving.value) return

  const name = form.name.trim()
  if (!name) {
    toast("请输入分类名称")
    return
  }
  if (name.length > 4) {
    toast("分类名称不超过 4 个字")
    return
  }

  saving.value = true
  try {
    if (editingId.value) {
      await updateCategory(editingId.value, {
        name,
        icon: form.icon,
        color: form.color,
      })
    } else {
      await createCategory({
        name,
        type: activeType.value,
        icon: form.icon,
        color: form.color,
      })
    }
    editorVisible.value = false
    uni.showToast({ title: editingId.value ? "已保存" : "已添加", icon: "success" })
    await load()
  } catch (error) {
    toast(error instanceof Error ? error.message : "保存失败")
  } finally {
    saving.value = false
  }
}

function handleDelete(): void {
  if (!editingId.value) return
  if (editingIsSystem.value) {
    toast("系统分类无法删除")
    return
  }

  const target = categories.value.find((category) => String(category.id) === editingId.value)
  uni.showModal({
    title: "删除分类",
    content: `确定删除「${target?.name || "该分类"}」吗？`,
    confirmText: "删除",
    confirmColor: "#f54a45",
    cancelText: "取消",
    success: async (result) => {
      if (!result.confirm) return
      try {
        await deleteCategory(editingId.value)
        editorVisible.value = false
        uni.showToast({ title: "已删除", icon: "success" })
        await load()
      } catch (error) {
        toast(error instanceof Error ? error.message : "删除失败")
      }
    },
  })
}

onShow(() => {
  load()
})

onPullDownRefresh(async () => {
  await load()
  uni.stopPullDownRefresh()
})
</script>

<style scoped lang="scss">
.categories-page {
  min-height: 100vh;
  background: var(--bk-bg);
}

.nav-add {
  padding: 8rpx 20rpx;
  font-size: 28rpx;
  font-weight: 600;
  color: var(--bk-primary-dark);
}

.page-body {
  padding: 24rpx 24rpx calc(48rpx + env(safe-area-inset-bottom));
}

.type-switch {
  display: flex;
  padding: 6rpx;
  margin-bottom: 24rpx;
  background: #eef0f2;
  border-radius: 999rpx;
}

.type-item {
  flex: 1;
  padding: 14rpx 0;
  font-size: 26rpx;
  color: var(--bk-text-secondary);
  text-align: center;
  border-radius: 999rpx;
}

.type-item.active {
  font-weight: 600;
  color: var(--bk-text);
  background: #fff;
  box-shadow: 0 2rpx 8rpx rgb(31 35 41 / 8%);
}

.page-state {
  padding-top: 100rpx;
}

.category-list {
  overflow: hidden;
  background: #fff;
  border-radius: 24rpx;
  box-shadow: 0 4rpx 16rpx rgb(31 35 41 / 4%);
}

.category-row {
  display: flex;
  align-items: center;
  min-height: 112rpx;
  padding: 18rpx 24rpx;
  border-bottom: 1rpx solid #f2f3f5;
}

.category-row:active {
  background: #fafafa;
}

.category-icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 76rpx;
  height: 76rpx;
  border-radius: 22rpx;
}

.category-main {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  margin: 0 20rpx;
}

.category-name-line {
  display: flex;
  align-items: center;
  min-width: 0;
}

.category-name {
  overflow: hidden;
  font-size: 30rpx;
  font-weight: 500;
  color: var(--bk-text);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.system-badge {
  flex-shrink: 0;
  padding: 2rpx 10rpx;
  margin-left: 10rpx;
  font-size: 18rpx;
  color: var(--bk-text-tertiary);
  background: #f2f3f5;
  border-radius: 6rpx;
}

.category-usage {
  margin-top: 6rpx;
  font-size: 22rpx;
  color: var(--bk-text-tertiary);
}

.list-tip {
  display: block;
  padding: 22rpx 24rpx;
  font-size: 22rpx;
  color: var(--bk-text-tertiary);
  text-align: center;
}

.empty-btn {
  padding: 18rpx 48rpx;
  font-size: 28rpx;
  font-weight: 600;
  color: #fff;
  background: var(--bk-primary);
  border-radius: 999rpx;
}

.editor-mask {
  position: fixed;
  inset: 0;
  z-index: 300;
  display: flex;
  align-items: flex-end;
  background: rgb(0 0 0 / 40%);
}

.editor-sheet {
  box-sizing: border-box;
  width: 100%;
  max-height: 88vh;
  padding: 26rpx 28rpx calc(24rpx + env(safe-area-inset-bottom));
  overflow-y: auto;
  background: #fff;
  border-radius: 28rpx 28rpx 0 0;
  animation: sheet-up 0.18s ease-out;
}

.editor-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 20rpx;
}

.editor-title {
  font-size: 32rpx;
  font-weight: 600;
  color: var(--bk-text);
}

.editor-cancel {
  font-size: 26rpx;
  color: var(--bk-text-secondary);
}

.editor-preview {
  display: flex;
  justify-content: center;
  padding: 8rpx 0 22rpx;
}

.preview-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  box-shadow: 0 8rpx 20rpx rgb(31 35 41 / 12%);
}

.name-input {
  box-sizing: border-box;
  width: 100%;
  height: 88rpx;
  padding: 0 24rpx;
  font-size: 16px;
  color: var(--bk-text);
  background: #f7f8fa;
  border-radius: 16rpx;
}

.name-placeholder {
  color: var(--bk-text-tertiary);
}

.editor-label {
  display: block;
  margin: 26rpx 0 14rpx;
  font-size: 24rpx;
  font-weight: 500;
  color: var(--bk-text-secondary);
}

.icon-grid {
  display: grid;
  grid-template-columns: repeat(8, minmax(0, 1fr));
  gap: 12rpx;
}

.icon-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 1;
  background: #f2f3f5;
  border-radius: 14rpx;
}

.color-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 16rpx;
}

.color-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 1;
  border-radius: 50%;
  box-shadow: inset 0 0 0 2rpx rgb(255 255 255 / 60%);
}

.color-cell.active {
  box-shadow:
    inset 0 0 0 4rpx #fff,
    0 2rpx 8rpx rgb(31 35 41 / 20%);
}

.editor-actions {
  display: flex;
  gap: 20rpx;
  margin-top: 32rpx;
}

.delete-btn,
.save-btn {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  height: 92rpx;
  font-size: 30rpx;
  font-weight: 600;
  border-radius: 999rpx;
}

.delete-btn {
  color: var(--bk-danger);
  background: #fff1f0;
}

.save-btn {
  color: #fff;
  background: var(--bk-primary);
}

.save-btn.disabled {
  opacity: 0.6;
}

@keyframes sheet-up {
  from {
    transform: translateY(100%);
  }

  to {
    transform: translateY(0);
  }
}
</style>
