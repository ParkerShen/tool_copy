<route lang="json5" type="page">
{
  layout: "default",
  style: {
    navigationBarTitleText: "位置管理",
    navigationBarBackgroundColor: "#FFFFFF",
    enablePullDownRefresh: true,
  },
}
</route>

<template>
  <view class="locations-page">
    <app-navbar title="位置管理" fallback="/pages/index/index">
      <template #right>
        <view class="nav-add" @click="openCreate(null)">新增</view>
      </template>
    </app-navbar>

    <view class="page-body">
      <view class="tip-card">
        <wd-icon name="info-circle" size="16px" color="#2ba471" />
        <text class="tip-text">
          按「房间 → 柜子 → 抽屉 → 收纳箱」逐层建立，物品只需挂到最末一级。
        </text>
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
        v-else-if="rows.length === 0"
        state="empty"
        class="page-state"
        title="还没有位置"
        description="先建一个房间，例如「客厅」「主卧」「储藏室」。"
      >
        <view class="inv-empty-btn" @click="openCreate(null)">新增位置</view>
      </page-state>

      <view v-else class="location-list">
        <view
          v-for="row in rows"
          :key="row.id"
          class="location-row"
          :style="{ paddingLeft: `${24 + row.depth * 36}rpx` }"
          @click="toggle(row)"
        >
          <view
            class="location-arrow"
            :class="{ hidden: !row.hasChildren, expanded: expanded.has(row.id) }"
          >
            <wd-icon name="arrow-right" size="13px" color="#8f959e" />
          </view>
          <view class="location-icon" :style="{ background: `${row.color}1a` }">
            <wd-icon name="folder" size="18px" :color="row.color" />
          </view>
          <view class="location-main">
            <text class="location-name">{{ row.name }}</text>
            <text class="location-meta">
              {{ row.totalItemCount }} 件物品
              <template v-if="row.itemCount !== row.totalItemCount">
                · 本级 {{ row.itemCount }} 件
              </template>
            </text>
          </view>
          <view class="location-more" @click.stop="openActions(row)">
            <wd-icon name="more" size="18px" color="#8f959e" />
          </view>
        </view>
      </view>
    </view>

    <view v-if="sheetVisible" class="inv-sheet-mask" @click="sheetVisible = false">
      <view class="inv-sheet location-sheet" @click.stop>
        <view class="inv-sheet-head">
          <text class="inv-sheet-title">{{ sheetTitle }}</text>
          <text class="inv-sheet-cancel" @click="sheetVisible = false">取消</text>
        </view>

        <text v-if="sheetParentText" class="sheet-parent">上级：{{ sheetParentText }}</text>

        <input
          v-model="draftName"
          class="sheet-input"
          type="text"
          maxlength="30"
          placeholder="位置名称，例如：电视柜"
          placeholder-class="sheet-placeholder"
          @confirm="saveLocation"
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

        <view class="sheet-actions">
          <view class="sheet-cancel" @click="sheetVisible = false">取消</view>
          <view class="sheet-save" :class="{ disabled: saving }" @click="saveLocation">
            {{ saving ? "保存中…" : "保存" }}
          </view>
        </view>
      </view>
    </view>

    <view v-if="moveVisible" class="inv-sheet-mask" @click="moveVisible = false">
      <view class="inv-sheet move-sheet" @click.stop>
        <view class="inv-sheet-head">
          <text class="inv-sheet-title">移动「{{ movingName }}」</text>
          <text class="inv-sheet-cancel" @click="moveVisible = false">取消</text>
        </view>

        <scroll-view scroll-y class="move-list">
          <view class="move-row" :class="{ active: !moveParentId }" @click="moveParentId = null">
            <text class="move-name">移到顶层</text>
            <wd-icon v-if="!moveParentId" name="check" size="14px" color="#2ba471" />
          </view>
          <view
            v-for="option in moveOptions"
            :key="option.id"
            class="move-row"
            :class="{ active: moveParentId === option.id }"
            :style="{ paddingLeft: `${24 + option.depth * 28}rpx` }"
            @click="moveParentId = option.id"
          >
            <text class="move-name">{{ option.name }}</text>
            <wd-icon v-if="moveParentId === option.id" name="check" size="14px" color="#2ba471" />
          </view>
        </scroll-view>

        <view class="sheet-actions">
          <view class="sheet-cancel" @click="moveVisible = false">取消</view>
          <view class="sheet-save" :class="{ disabled: moving }" @click="confirmMove">
            {{ moving ? "移动中…" : "移动到这里" }}
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from "vue"
import { onLoad, onPullDownRefresh } from "@dcloudio/uni-app"
import {
  createLocation,
  deleteLocation,
  getLocationTree,
  isInventoryAvailable,
  moveLocation,
  updateLocation,
  MAX_LOCATION_DEPTH,
  type LocationNode,
} from "@/api/inventory"

const COLORS = ["#2ba471", "#3370ff", "#7f3bf5", "#ff8800", "#f54a45", "#00b8d9"]

interface FlatRow {
  id: string
  name: string
  color: string
  depth: number
  itemCount: number
  totalItemCount: number
  hasChildren: boolean
}

const state = ref<"loading" | "ready" | "error">("loading")
const errorMessage = ref("")
const tree = ref<LocationNode[]>([])
const expanded = ref<Set<string>>(new Set())

const sheetVisible = ref(false)
const sheetMode = ref<"create" | "edit">("create")
const editingId = ref("")
const editingParentId = ref<string | null>(null)
const draftName = ref("")
const draftColor = ref(COLORS[0])
const saving = ref(false)

const moveVisible = ref(false)
const movingId = ref("")
const movingName = ref("")
const moveParentId = ref<string | null>(null)
const moving = ref(false)

const rows = computed<FlatRow[]>(() => {
  const result: FlatRow[] = []
  function walk(nodes: LocationNode[], depth: number): void {
    for (const node of nodes) {
      result.push({
        id: node.id,
        name: node.name,
        color: node.color,
        depth,
        itemCount: node.itemCount,
        totalItemCount: node.totalItemCount,
        hasChildren: node.children.length > 0,
      })
      if (expanded.value.has(node.id)) {
        walk(node.children, depth + 1)
      }
    }
  }
  walk(tree.value, 0)
  return result
})

const allRows = computed<FlatRow[]>(() => {
  const result: FlatRow[] = []
  function walk(nodes: LocationNode[], depth: number): void {
    for (const node of nodes) {
      result.push({
        id: node.id,
        name: node.name,
        color: node.color,
        depth,
        itemCount: node.itemCount,
        totalItemCount: node.totalItemCount,
        hasChildren: node.children.length > 0,
      })
      walk(node.children, depth + 1)
    }
  }
  walk(tree.value, 0)
  return result
})

const sheetTitle = computed(() => (sheetMode.value === "create" ? "新增位置" : "编辑位置"))

const sheetParentText = computed(() => {
  if (sheetMode.value === "edit") return ""
  if (!editingParentId.value) return ""
  return allRows.value.find((row) => row.id === editingParentId.value)?.name || ""
})

const moveOptions = computed(() => {
  const node = findNode(tree.value, movingId.value)
  if (!node) return []
  const blocked = new Set<string>([node.id, ...collectIds(node.children)])
  return allRows.value.filter((row) => !blocked.has(row.id) && row.depth < MAX_LOCATION_DEPTH - 1)
})

function findNode(nodes: LocationNode[], id: string): LocationNode | null {
  for (const node of nodes) {
    if (node.id === id) return node
    const found = findNode(node.children, id)
    if (found) return found
  }
  return null
}

function collectIds(nodes: LocationNode[]): string[] {
  const ids: string[] = []
  for (const node of nodes) {
    ids.push(node.id)
    ids.push(...collectIds(node.children))
  }
  return ids
}

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
    state.value = tree.value.length > 0 ? state.value : "loading"
    const data = await getLocationTree()
    tree.value = data
    if (expanded.value.size === 0) expandAll(data)
    state.value = "ready"
  } catch (error) {
    console.error("[inventory] 位置加载失败:", error)
    state.value = "error"
    errorMessage.value = errorText(error)
  }
}

function expandAll(nodes: LocationNode[]): void {
  const next = new Set(expanded.value)
  function walk(list: LocationNode[]): void {
    for (const node of list) {
      if (node.children.length > 0) {
        next.add(node.id)
        walk(node.children)
      }
    }
  }
  walk(nodes)
  expanded.value = next
}

function toggle(row: FlatRow): void {
  if (!row.hasChildren) return
  const next = new Set(expanded.value)
  if (next.has(row.id)) {
    next.delete(row.id)
  } else {
    next.add(row.id)
  }
  expanded.value = next
}

function openCreate(parentId: string | null): void {
  sheetMode.value = "create"
  editingId.value = ""
  editingParentId.value = parentId
  draftName.value = ""
  draftColor.value = COLORS[Math.floor(Math.random() * COLORS.length)]
  sheetVisible.value = true
}

function openEdit(row: FlatRow): void {
  sheetMode.value = "edit"
  editingId.value = row.id
  editingParentId.value = null
  draftName.value = row.name
  draftColor.value = row.color
  sheetVisible.value = true
}

async function saveLocation(): Promise<void> {
  const name = draftName.value.trim()
  if (!name || saving.value) {
    if (!name) uni.showToast({ title: "请输入位置名称", icon: "none" })
    return
  }
  saving.value = true
  try {
    if (sheetMode.value === "create") {
      await createLocation({
        name,
        parentId: editingParentId.value,
        color: draftColor.value,
      })
      if (editingParentId.value) {
        expanded.value = new Set([...expanded.value, editingParentId.value])
      }
    } else {
      await updateLocation(editingId.value, { name, color: draftColor.value })
    }
    sheetVisible.value = false
    uni.$emit("refreshInventoryData")
    await load()
    uni.showToast({ title: "已保存", icon: "success" })
  } catch (error) {
    uni.showToast({ title: errorText(error), icon: "none" })
  } finally {
    saving.value = false
  }
}

function openActions(row: FlatRow): void {
  uni.showActionSheet({
    itemList: ["新增子位置", "重命名", "移动", "删除"],
    success: (result) => {
      if (result.tapIndex === 0) openCreate(row.id)
      if (result.tapIndex === 1) openEdit(row)
      if (result.tapIndex === 2) openMove(row)
      if (result.tapIndex === 3) confirmDelete(row)
    },
  })
}

function openMove(row: FlatRow): void {
  movingId.value = row.id
  movingName.value = row.name
  moveParentId.value = null
  moveVisible.value = true
}

async function confirmMove(): Promise<void> {
  if (!movingId.value || moving.value) return
  moving.value = true
  try {
    await moveLocation(movingId.value, moveParentId.value)
    moveVisible.value = false
    uni.$emit("refreshInventoryData")
    await load()
    uni.showToast({ title: "已移动", icon: "success" })
  } catch (error) {
    uni.showToast({ title: errorText(error), icon: "none" })
  } finally {
    moving.value = false
  }
}

function confirmDelete(row: FlatRow): void {
  uni.showModal({
    title: `删除「${row.name}」`,
    content:
      row.totalItemCount > 0
        ? `该位置及子位置下的 ${row.totalItemCount} 件物品不会被删除，物品会变为「未指定位置」；子位置会移到顶层。`
        : "子位置会移到顶层。此操作不可撤销。",
    confirmText: "删除",
    confirmColor: "#f54a45",
    success: async (result) => {
      if (!result.confirm) return
      try {
        await deleteLocation(row.id)
        uni.$emit("refreshInventoryData")
        await load()
        uni.showToast({ title: "已删除", icon: "success" })
      } catch (error) {
        uni.showToast({ title: errorText(error), icon: "none" })
      }
    },
  })
}

onLoad((options) => {
  const query = (options || {}) as Record<string, string | undefined>
  load().then(() => {
    if (query.create === "1") openCreate(null)
  })
})

onPullDownRefresh(async () => {
  await load()
  uni.stopPullDownRefresh()
})
</script>

<style scoped lang="scss">
.locations-page {
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

.tip-card {
  display: flex;
  gap: 12rpx;
  align-items: flex-start;
  padding: 20rpx 24rpx;
  margin-bottom: 18rpx;
  background: var(--inv-primary-soft);
  border-radius: 18rpx;
}

.tip-text {
  flex: 1;
  font-size: 22rpx;
  line-height: 1.6;
  color: var(--inv-primary-dark);
}

.page-state {
  padding-top: 100rpx;
}

.location-list {
  overflow: hidden;
  background: #fff;
  border-radius: 24rpx;
  box-shadow: 0 4rpx 16rpx rgb(31 35 41 / 4%);
}

.location-row {
  display: flex;
  gap: 14rpx;
  align-items: center;
  min-height: 108rpx;
  padding-right: 16rpx;
  border-bottom: 1rpx solid #f4f5f7;
}

.location-row:last-child {
  border-bottom: 0;
}

.location-row:active {
  background: #fafbfc;
}

.location-arrow {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 36rpx;
  height: 60rpx;
  transition: transform 0.15s ease;
}

.location-arrow.hidden {
  visibility: hidden;
}

.location-arrow.expanded {
  transform: rotate(90deg);
}

.location-icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 68rpx;
  height: 68rpx;
  border-radius: 16rpx;
}

.location-main {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.location-name {
  overflow: hidden;
  font-size: 28rpx;
  font-weight: 500;
  color: var(--inv-text);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.location-meta {
  margin-top: 4rpx;
  font-size: 21rpx;
  color: var(--inv-text-tertiary);
}

.location-more {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 76rpx;
  height: 76rpx;
  border-radius: 50%;
}

.location-more:active {
  background: #f2f3f5;
}

.location-sheet {
  max-height: 70vh;
}

.sheet-parent {
  display: block;
  margin-top: 4rpx;
  font-size: 23rpx;
  color: var(--inv-text-tertiary);
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

.sheet-actions {
  display: flex;
  gap: 20rpx;
  margin-top: 30rpx;
}

.sheet-cancel,
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

.sheet-cancel {
  color: var(--inv-text-secondary);
  background: #f2f3f5;
}

.sheet-save {
  color: #fff;
  background: var(--inv-primary);
}

.sheet-save.disabled {
  opacity: 0.6;
}

.move-sheet {
  max-height: 80vh;
}

.move-list {
  max-height: 50vh;
  margin-top: 12rpx;
  background: #f7f8fa;
  border-radius: 16rpx;
}

.move-row {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 80rpx;
  padding: 16rpx 24rpx;
  border-bottom: 1rpx solid #eef0f2;
}

.move-row:last-child {
  border-bottom: 0;
}

.move-row.active {
  background: var(--inv-primary-soft);
}

.move-name {
  overflow: hidden;
  font-size: 26rpx;
  color: var(--inv-text);
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
