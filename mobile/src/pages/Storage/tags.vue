<route lang="json5" type="page">
{
  layout: "default",
  style: {
    navigationBarTitleText: "标签管理",
    navigationBarBackgroundColor: "#FFFFFF",
    enablePullDownRefresh: true,
  },
}
</route>

<template>
  <view class="tags-page">
    <app-navbar title="标签管理" fallback="/pages/index/index">
      <template #right>
        <view class="nav-add" @click="openCreate">新增</view>
      </template>
    </app-navbar>

    <view class="page-body">
      <page-state v-if="state === 'loading'" state="loading" class="page-state" />

      <page-state
        v-else-if="state === 'error'"
        state="error"
        class="page-state"
        :description="errorMessage"
        @retry="load"
      />

      <page-state
        v-else-if="tags.length === 0"
        state="empty"
        class="page-state"
        title="还没有标签"
        description="用标签给物品分组，例如「数码」「厨房」「重要」。"
      >
        <view class="inv-empty-btn" @click="openCreate">新建标签</view>
      </page-state>

      <view v-else class="tag-list">
        <view v-for="tag in tags" :key="tag.id" class="tag-row" @click="openEdit(tag)">
          <view class="tag-dot" :style="{ background: tag.color }" />
          <text class="tag-name">{{ tag.name }}</text>
          <text class="tag-count">{{ tag.itemCount || 0 }} 件</text>
          <wd-icon name="arrow-right" size="14px" color="#c9cdd4" />
        </view>
      </view>
    </view>

    <view v-if="sheetVisible" class="inv-sheet-mask" @click="sheetVisible = false">
      <view class="inv-sheet tag-sheet" @click.stop>
        <view class="inv-sheet-head">
          <text class="inv-sheet-title">{{ editingId ? "编辑标签" : "新建标签" }}</text>
          <text class="inv-sheet-cancel" @click="sheetVisible = false">取消</text>
        </view>

        <input
          v-model="draftName"
          class="sheet-input"
          type="text"
          maxlength="12"
          placeholder="标签名称，最多 12 个字"
          placeholder-class="sheet-placeholder"
          @confirm="saveTag"
        />

        <view class="color-row">
          <view
            v-for="color in COLORS"
            :key="color"
            class="color-dot"
            :class="{ active: draftColor === color }"
            :style="{ background: color }"
            @click="draftColor = color"
          >
            <wd-icon v-if="draftColor === color" name="check" size="12px" color="#fff" />
          </view>
        </view>

        <view class="tag-preview">
          <text class="tag-preview-label">预览</text>
          <text
            class="tag-preview-chip"
            :style="{ color: draftColor, background: `${draftColor}1a` }"
          >
            {{ draftName.trim() || "标签" }}
          </text>
        </view>

        <view class="sheet-actions">
          <view v-if="editingId" class="sheet-delete" @click="confirmDelete">删除</view>
          <view class="sheet-save" :class="{ disabled: saving }" @click="saveTag">
            {{ saving ? "保存中…" : "保存" }}
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from "vue"
import { onPullDownRefresh } from "@dcloudio/uni-app"
import {
  createTag,
  deleteTag,
  isInventoryAvailable,
  listTags,
  updateTag,
  type InventoryTag,
} from "@/api/inventory"

const COLORS = ["#2ba471", "#3370ff", "#7f3bf5", "#ff8800", "#f54a45", "#00b8d9", "#8f959e"]

const state = ref<"loading" | "ready" | "error">("loading")
const errorMessage = ref("")
const tags = ref<InventoryTag[]>([])

const sheetVisible = ref(false)
const editingId = ref("")
const draftName = ref("")
const draftColor = ref(COLORS[0])
const saving = ref(false)

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
    state.value = tags.value.length > 0 ? state.value : "loading"
    tags.value = await listTags()
    state.value = "ready"
  } catch (error) {
    console.error("[inventory] 标签加载失败:", error)
    state.value = "error"
    errorMessage.value = errorText(error)
  }
}

function openCreate(): void {
  editingId.value = ""
  draftName.value = ""
  draftColor.value = COLORS[Math.floor(Math.random() * COLORS.length)]
  sheetVisible.value = true
}

function openEdit(tag: InventoryTag): void {
  editingId.value = tag.id
  draftName.value = tag.name
  draftColor.value = tag.color
  sheetVisible.value = true
}

async function saveTag(): Promise<void> {
  const name = draftName.value.trim()
  if (!name || saving.value) {
    if (!name) uni.showToast({ title: "请输入标签名称", icon: "none" })
    return
  }
  saving.value = true
  try {
    if (editingId.value) {
      await updateTag(editingId.value, { name, color: draftColor.value })
    } else {
      await createTag({ name, color: draftColor.value })
    }
    sheetVisible.value = false
    uni.$emit("refreshInventoryData")
    uni.$emit("refreshInventoryTags")
    await load()
    uni.showToast({ title: "已保存", icon: "success" })
  } catch (error) {
    uni.showToast({ title: errorText(error), icon: "none" })
  } finally {
    saving.value = false
  }
}

function confirmDelete(): void {
  const tag = tags.value.find((item) => item.id === editingId.value)
  if (!tag) return
  uni.showModal({
    title: `删除「${tag.name}」`,
    content:
      tag.itemCount && tag.itemCount > 0
        ? `有 ${tag.itemCount} 件物品使用了这个标签。删除后只会移除标签，物品不会被删除。`
        : "删除后不可恢复，确定继续吗？",
    confirmText: "删除",
    confirmColor: "#f54a45",
    success: async (result) => {
      if (!result.confirm) return
      try {
        await deleteTag(tag.id)
        sheetVisible.value = false
        uni.$emit("refreshInventoryData")
        uni.$emit("refreshInventoryTags")
        await load()
        uni.showToast({ title: "已删除", icon: "success" })
      } catch (error) {
        uni.showToast({ title: errorText(error), icon: "none" })
      }
    },
  })
}

onPullDownRefresh(async () => {
  await load()
  uni.stopPullDownRefresh()
})

load()
</script>

<style scoped lang="scss">
.tags-page {
  min-height: 100vh;
  background: var(--inv-bg);
}

.nav-add {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  min-width: 96rpx;
  min-height: 88rpx;
  font-size: 26rpx;
  font-weight: 600;
  color: var(--inv-primary-dark);
}

.page-body {
  padding: 20rpx 24rpx calc(60rpx + env(safe-area-inset-bottom));
}

.page-state {
  padding-top: 100rpx;
}

.tag-list {
  overflow: hidden;
  background: #fff;
  border-radius: 24rpx;
  box-shadow: 0 4rpx 16rpx rgb(31 35 41 / 4%);
}

.tag-row {
  display: flex;
  gap: 18rpx;
  align-items: center;
  min-height: 108rpx;
  padding: 0 28rpx;
  border-bottom: 1rpx solid #f4f5f7;
}

.tag-row:last-child {
  border-bottom: 0;
}

.tag-row:active {
  background: #fafbfc;
}

.tag-dot {
  flex-shrink: 0;
  width: 24rpx;
  height: 24rpx;
  border-radius: 50%;
}

.tag-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  font-size: 28rpx;
  font-weight: 500;
  color: var(--inv-text);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tag-count {
  flex-shrink: 0;
  font-size: 22rpx;
  color: var(--inv-text-tertiary);
}

.tag-sheet {
  max-height: 80vh;
}

.sheet-input {
  box-sizing: border-box;
  width: 100%;
  height: 92rpx;
  padding: 0 24rpx;
  margin-top: 20rpx;
  font-size: 16px;
  color: var(--inv-text);
  background: #f7f8fa;
  border-radius: 16rpx;
}

.sheet-placeholder {
  color: var(--inv-text-tertiary);
}

.color-row {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
  margin-top: 24rpx;
}

.color-dot {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56rpx;
  height: 56rpx;
  border: 4rpx solid transparent;
  border-radius: 50%;
}

.color-dot.active {
  box-shadow: 0 0 0 3rpx rgb(31 35 41 / 15%);
}

.tag-preview {
  display: flex;
  gap: 16rpx;
  align-items: center;
  margin-top: 24rpx;
}

.tag-preview-label {
  font-size: 23rpx;
  color: var(--inv-text-tertiary);
}

.tag-preview-chip {
  padding: 6rpx 18rpx;
  font-size: 24rpx;
  border-radius: 999rpx;
}

.sheet-actions {
  display: flex;
  gap: 20rpx;
  margin-top: 30rpx;
}

.sheet-delete,
.sheet-save {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  height: 92rpx;
  font-size: 30rpx;
  font-weight: 600;
  border-radius: 999rpx;
}

.sheet-delete {
  color: #f54a45;
  background: #fff1f0;
}

.sheet-save {
  color: #fff;
  background: var(--inv-primary);
}

.sheet-save.disabled {
  opacity: 0.6;
}
</style>
