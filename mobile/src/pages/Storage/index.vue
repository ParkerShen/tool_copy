<route lang="json5" type="page">
{
  layout: "default",
  style: {
    navigationBarTitleText: "收纳",
    navigationBarBackgroundColor: "#FFFFFF",
    enablePullDownRefresh: true,
  },
}
</route>

<template>
  <view class="storage-page">
    <app-navbar title="收纳" fallback="/pages/index/index">
      <template #right>
        <view class="nav-actions">
          <view class="nav-icon" @click="goScan">
            <wd-icon name="scan" size="20px" color="#1f2329" />
          </view>
          <view class="nav-icon" @click="openMore">
            <wd-icon name="more" size="20px" color="#1f2329" />
          </view>
        </view>
      </template>
    </app-navbar>

    <view class="page-body">
      <view class="search-box">
        <wd-icon name="search" size="17px" color="#8f959e" />
        <input
          v-model="keyword"
          class="search-input"
          type="text"
          confirm-type="search"
          placeholder="搜索名称、编号、位置或标签"
          placeholder-class="search-placeholder"
        />
        <view v-if="keyword" class="search-clear" @click="keyword = ''">
          <wd-icon name="close-circle" size="16px" color="#c2c7cf" />
        </view>
      </view>

      <view class="summary-card">
        <view class="summary-top">
          <view class="summary-main">
            <text class="summary-label">家中物品</text>
            <text class="summary-value">
              {{ summary.itemCount }}
              <text class="summary-unit">件</text>
            </text>
          </view>
          <view class="summary-side">
            <text class="summary-side-label">估算价值</text>
            <text class="summary-side-value">
              {{ summary.totalValueCents > 0 ? `¥${money(summary.totalValueCents)}` : "未记录" }}
            </text>
          </view>
        </view>
        <view class="summary-grid">
          <view class="summary-item">
            <text class="summary-num">{{ summary.locationCount }}</text>
            <text class="summary-item-label">个位置</text>
          </view>
          <view class="summary-item">
            <text class="summary-num">{{ summary.warrantyExpiringCount }}</text>
            <text class="summary-item-label">保修将到期</text>
          </view>
          <view class="summary-item">
            <text class="summary-num">{{ summary.maintenanceDueCount }}</text>
            <text class="summary-item-label">待维护</text>
          </view>
        </view>
      </view>

      <scroll-view scroll-x class="location-scroll" :show-scrollbar="false">
        <view class="location-chips">
          <view
            class="location-chip"
            :class="{ active: !filters.locationId && !filters.onlyUnassigned }"
            @click="selectAllLocations"
          >
            全部
          </view>
          <view
            v-for="location in topLocations"
            :key="location.id"
            class="location-chip"
            :class="{ active: filters.locationId === location.id }"
            @click="selectLocation(location.id)"
          >
            {{ location.name }}
          </view>
          <view
            class="location-chip"
            :class="{ active: filters.onlyUnassigned }"
            @click="selectUnassigned"
          >
            未指定
          </view>
        </view>
      </scroll-view>

      <view class="list-toolbar">
        <text class="list-total">共 {{ total }} 件</text>
        <view class="filter-btn" :class="{ active: hasFilters }" @click="openFilter">
          <wd-icon name="filter" size="14px" :color="hasFilters ? '#2ba471' : '#646a73'" />
          <text class="filter-text">筛选</text>
          <text v-if="filterCount > 0" class="filter-count">{{ filterCount }}</text>
        </view>
      </view>

      <page-state v-if="state === 'loading'" state="loading" class="page-state" />

      <page-state
        v-else-if="state === 'error'"
        state="error"
        class="page-state"
        :description="errorMessage"
        @retry="load(true)"
      />

      <page-state
        v-else-if="items.length === 0"
        state="empty"
        class="page-state"
        :title="hasFilters ? '没有匹配的物品' : '还没有物品'"
        :description="
          hasFilters ? '换个关键词，或清除筛选条件再试试。' : '从一件常用物品开始，记录它的位置。'
        "
      >
        <view v-if="hasFilters" class="empty-secondary" @click="resetAllFilters">清除筛选</view>
        <view v-else class="inv-empty-btn" @click="goCreateItem">新增物品</view>
      </page-state>

      <view v-else class="item-list">
        <item-card v-for="item in items" :key="item.id" :item="item" @click="goDetail(item.id)" />
        <view class="list-footer">{{ hasMore ? "加载中…" : "没有更多了" }}</view>
      </view>
    </view>

    <view class="fab" @click="openCreateActions">
      <wd-icon name="add" size="26px" color="#fff" />
    </view>

    <view v-if="filterVisible" class="inv-sheet-mask" @click="closeFilter">
      <view class="inv-sheet filter-sheet" @click.stop>
        <view class="inv-sheet-head">
          <text class="inv-sheet-title">筛选与排序</text>
          <text class="inv-sheet-cancel" @click="closeFilter">取消</text>
        </view>

        <text class="filter-label">位置</text>
        <scroll-view scroll-y class="filter-location-list">
          <view
            class="filter-location"
            :class="{ active: !draft.locationId && !draft.onlyUnassigned }"
            @click="setDraftLocation(null)"
          >
            全部位置
          </view>
          <view
            class="filter-location"
            :class="{ active: draft.onlyUnassigned }"
            @click="setDraftUnassigned"
          >
            未指定位置
          </view>
          <view
            v-for="row in flatLocations"
            :key="row.id"
            class="filter-location"
            :class="{ active: draft.locationId === row.id }"
            :style="{ paddingLeft: `${24 + row.depth * 28}rpx` }"
            @click="setDraftLocation(row.id)"
          >
            {{ row.name }}
          </view>
        </scroll-view>

        <text class="filter-label">标签</text>
        <view v-if="tags.length > 0" class="filter-tags">
          <view
            v-for="tag in tags"
            :key="tag.id"
            class="filter-tag"
            :class="{ active: draft.tagIds.includes(tag.id) }"
            :style="
              draft.tagIds.includes(tag.id)
                ? { background: tag.color, borderColor: tag.color, color: '#fff' }
                : { color: tag.color, borderColor: `${tag.color}66` }
            "
            @click="toggleDraftTag(tag.id)"
          >
            {{ tag.name }}
          </view>
        </view>
        <text v-else class="filter-placeholder">还没有标签</text>

        <text class="filter-label">状态</text>
        <view class="filter-switch-row" @click="draft.warrantyExpiring = !draft.warrantyExpiring">
          <text class="filter-switch-text">只看保修将到期</text>
          <view class="filter-switch" :class="{ on: draft.warrantyExpiring }">
            <view class="filter-switch-dot" />
          </view>
        </view>
        <view class="filter-switch-row" @click="draft.hasPhoto = !draft.hasPhoto">
          <text class="filter-switch-text">只看有照片</text>
          <view class="filter-switch" :class="{ on: draft.hasPhoto }">
            <view class="filter-switch-dot" />
          </view>
        </view>
        <view class="filter-switch-row" @click="draft.includeArchived = !draft.includeArchived">
          <text class="filter-switch-text">显示已归档</text>
          <view class="filter-switch" :class="{ on: draft.includeArchived }">
            <view class="filter-switch-dot" />
          </view>
        </view>

        <text class="filter-label">排序</text>
        <view class="filter-sorts">
          <view
            v-for="option in sortOptions"
            :key="option.value"
            class="filter-sort"
            :class="{ active: draft.sort === option.value }"
            @click="draft.sort = option.value"
          >
            {{ option.label }}
          </view>
        </view>

        <view class="filter-actions">
          <view class="filter-reset" @click="resetDraft">重置</view>
          <view class="filter-apply" @click="applyFilter">应用</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from "vue"
import { onPullDownRefresh, onReachBottom, onShow } from "@dcloudio/uni-app"
import {
  clearInventory,
  getInventorySummary,
  getLocationTree,
  isInventoryAvailable,
  listItems,
  listTags,
  type InventoryFilters,
  type InventoryItemSummary,
  type InventorySort,
  type InventorySummary,
  type InventoryTag,
  type LocationNode,
} from "@/api/inventory"
import { formatCents } from "@/api/bookkeeping/money"
import ItemCard from "./components/ItemCard.vue"

const defaults: InventorySummary = {
  itemCount: 0,
  locationCount: 0,
  totalValueCents: 0,
  warrantyExpiringCount: 0,
  maintenanceDueCount: 0,
}

const state = ref<"loading" | "ready" | "error">("loading")
const errorMessage = ref("")
const keyword = ref("")
const items = ref<InventoryItemSummary[]>([])
const total = ref(0)
const page = ref(1)
const hasMore = ref(false)
const loadingMore = ref(false)
const summary = ref<InventorySummary>({ ...defaults })
const tree = ref<LocationNode[]>([])
const tags = ref<InventoryTag[]>([])
const filterVisible = ref(false)

const filters = reactive<{
  locationId: string
  onlyUnassigned: boolean
  tagIds: string[]
  includeArchived: boolean
  warrantyExpiring: boolean
  hasPhoto: boolean
  sort: InventorySort
}>({
  locationId: "",
  onlyUnassigned: false,
  tagIds: [],
  includeArchived: false,
  warrantyExpiring: false,
  hasPhoto: false,
  sort: "updated",
})

const draft = reactive({ ...filters, tagIds: [] as string[] })

let requestSeq = 0
let keywordTimer = 0

const sortOptions: Array<{ label: string; value: InventorySort }> = [
  { label: "最近更新", value: "updated" },
  { label: "名称", value: "name" },
  { label: "编号", value: "assetNo" },
  { label: "价格从高到低", value: "priceDesc" },
]

const topLocations = computed(() => tree.value)

const flatLocations = computed(() => {
  const result: Array<{ id: string; name: string; depth: number }> = []
  function walk(nodes: LocationNode[], depth: number): void {
    for (const node of nodes) {
      result.push({ id: node.id, name: node.name, depth })
      walk(node.children, depth + 1)
    }
  }
  walk(tree.value, 0)
  return result
})

const filterCount = computed(() => {
  let count = 0
  if (filters.locationId || filters.onlyUnassigned) count += 1
  if (filters.tagIds.length > 0) count += 1
  if (filters.includeArchived) count += 1
  if (filters.warrantyExpiring) count += 1
  if (filters.hasPhoto) count += 1
  return count
})

const hasFilters = computed(
  () => filterCount.value > 0 || keyword.value.trim().length > 0 || filters.sort !== "updated",
)

function money(cents: number): string {
  return formatCents(cents)
}

function errorText(error: unknown): string {
  if (typeof error === "string" && error) return error
  if (error instanceof Error && error.message) return error.message
  const raw = error as { errMsg?: string; message?: string } | null
  return raw?.errMsg || raw?.message || "未知错误"
}

function queryFilters(): InventoryFilters {
  return {
    keyword: keyword.value.trim(),
    locationId: filters.onlyUnassigned ? undefined : filters.locationId || undefined,
    onlyUnassigned: filters.onlyUnassigned,
    tagIds: filters.tagIds,
    includeArchived: filters.includeArchived,
    warrantyExpiring: filters.warrantyExpiring,
    hasPhoto: filters.hasPhoto,
    sort: filters.sort,
    page: page.value,
    pageSize: 30,
  }
}

async function load(reset = true): Promise<void> {
  if (!isInventoryAvailable) {
    state.value = "error"
    errorMessage.value = "收纳仅支持本地数据模式，请使用 standalone 构建。"
    return
  }
  if (!reset && (!hasMore.value || loadingMore.value)) return

  const seq = ++requestSeq
  if (reset) {
    state.value = items.value.length > 0 ? state.value : "loading"
    page.value = 1
    errorMessage.value = ""
  } else {
    loadingMore.value = true
  }

  try {
    if (reset) {
      const [result, summaryData, treeData, tagData] = await Promise.all([
        listItems(queryFilters()),
        getInventorySummary(),
        getLocationTree(),
        listTags(),
      ])
      if (seq !== requestSeq) return
      items.value = result.items
      total.value = result.total
      hasMore.value = result.items.length < result.total
      summary.value = summaryData
      tree.value = treeData
      tags.value = tagData
    } else {
      page.value += 1
      const result = await listItems(queryFilters())
      if (seq !== requestSeq) return
      items.value = [...items.value, ...result.items]
      total.value = result.total
      hasMore.value = items.value.length < result.total
    }
    state.value = "ready"
  } catch (error) {
    if (seq !== requestSeq) return
    console.error("[inventory] 列表加载失败:", error)
    if (reset) {
      state.value = "error"
      errorMessage.value = errorText(error)
    } else {
      page.value = Math.max(1, page.value - 1)
      uni.showToast({ title: errorText(error), icon: "none" })
    }
  } finally {
    loadingMore.value = false
  }
}

watch(keyword, () => {
  window.clearTimeout(keywordTimer)
  keywordTimer = window.setTimeout(() => {
    load(true)
  }, 280)
})

function selectAllLocations(): void {
  filters.locationId = ""
  filters.onlyUnassigned = false
  load(true)
}

function selectLocation(id: string): void {
  filters.locationId = filters.locationId === id ? "" : id
  filters.onlyUnassigned = false
  load(true)
}

function selectUnassigned(): void {
  filters.onlyUnassigned = !filters.onlyUnassigned
  if (filters.onlyUnassigned) filters.locationId = ""
  load(true)
}

function openFilter(): void {
  draft.locationId = filters.locationId
  draft.onlyUnassigned = filters.onlyUnassigned
  draft.tagIds = filters.tagIds.slice()
  draft.includeArchived = filters.includeArchived
  draft.warrantyExpiring = filters.warrantyExpiring
  draft.hasPhoto = filters.hasPhoto
  draft.sort = filters.sort
  filterVisible.value = true
}

function closeFilter(): void {
  filterVisible.value = false
}

function setDraftLocation(id: string | null): void {
  draft.locationId = id || ""
  draft.onlyUnassigned = false
}

function setDraftUnassigned(): void {
  draft.onlyUnassigned = true
  draft.locationId = ""
}

function toggleDraftTag(id: string): void {
  if (draft.tagIds.includes(id)) {
    draft.tagIds = draft.tagIds.filter((tagId) => tagId !== id)
  } else {
    draft.tagIds = [...draft.tagIds, id]
  }
}

function resetDraft(): void {
  draft.locationId = ""
  draft.onlyUnassigned = false
  draft.tagIds = []
  draft.includeArchived = false
  draft.warrantyExpiring = false
  draft.hasPhoto = false
  draft.sort = "updated"
}

function applyFilter(): void {
  filters.locationId = draft.locationId
  filters.onlyUnassigned = draft.onlyUnassigned
  filters.tagIds = draft.tagIds.slice()
  filters.includeArchived = draft.includeArchived
  filters.warrantyExpiring = draft.warrantyExpiring
  filters.hasPhoto = draft.hasPhoto
  filters.sort = draft.sort
  filterVisible.value = false
  load(true)
}

function resetAllFilters(): void {
  keyword.value = ""
  filters.locationId = ""
  filters.onlyUnassigned = false
  filters.tagIds = []
  filters.includeArchived = false
  filters.warrantyExpiring = false
  filters.hasPhoto = false
  filters.sort = "updated"
  load(true)
}

function goDetail(id: string): void {
  uni.navigateTo({ url: `/pages/Storage/item?id=${encodeURIComponent(id)}` })
}

function goCreateItem(): void {
  const location = filters.onlyUnassigned ? "" : filters.locationId
  const query = location ? `?locationId=${encodeURIComponent(location)}` : ""
  uni.navigateTo({ url: `/pages/Storage/edit${query}` })
}

function goScan(): void {
  uni.navigateTo({ url: "/pages/Storage/scan" })
}

function openCreateActions(): void {
  uni.showActionSheet({
    itemList: ["新增物品", "新增位置"],
    success: (result) => {
      if (result.tapIndex === 0) goCreateItem()
      if (result.tapIndex === 1) {
        uni.navigateTo({ url: "/pages/Storage/locations?create=1" })
      }
    },
  })
}

function openMore(): void {
  uni.showActionSheet({
    itemList: ["位置管理", "标签管理", "清空收纳数据"],
    success: (result) => {
      if (result.tapIndex === 0) uni.navigateTo({ url: "/pages/Storage/locations" })
      if (result.tapIndex === 1) uni.navigateTo({ url: "/pages/Storage/tags" })
      if (result.tapIndex === 2) confirmClear()
    },
  })
}

function confirmClear(): void {
  uni.showModal({
    title: "清空收纳数据",
    content: "会删除所有位置、物品、照片和维护记录，记账和日记不受影响。建议先导出备份。",
    confirmText: "继续",
    confirmColor: "#f54a45",
    success: (first) => {
      if (!first.confirm) return
      uni.showModal({
        title: "再次确认",
        content: "此操作不可撤销，确定清空吗？",
        confirmText: "确认清空",
        confirmColor: "#f54a45",
        success: async (second) => {
          if (!second.confirm) return
          try {
            uni.showLoading({ title: "清空中..." })
            await clearInventory()
            uni.hideLoading()
            uni.$emit("refreshInventoryData")
            await load(true)
            uni.showToast({ title: "已清空", icon: "success" })
          } catch (error) {
            uni.hideLoading()
            uni.showToast({ title: errorText(error), icon: "none" })
          }
        },
      })
    },
  })
}

function refresh(): void {
  load(true)
}

onShow(() => {
  load(true)
})

onMounted(() => {
  uni.$on("refreshInventoryData", refresh)
})

onUnmounted(() => {
  uni.$off("refreshInventoryData", refresh)
})

onPullDownRefresh(async () => {
  await load(true)
  uni.stopPullDownRefresh()
})

onReachBottom(() => {
  load(false)
})
</script>

<style scoped lang="scss">
.storage-page {
  min-height: 100vh;
  background: var(--inv-bg);
}

.nav-actions {
  display: flex;
  gap: 6rpx;
  align-items: center;
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

.page-body {
  padding: 20rpx 24rpx calc(180rpx + env(safe-area-inset-bottom));
}

.search-box {
  display: flex;
  align-items: center;
  height: 82rpx;
  padding: 0 24rpx;
  background: #fff;
  border-radius: 999rpx;
  box-shadow: 0 4rpx 16rpx rgb(31 35 41 / 4%);
}

.search-input {
  flex: 1;
  height: 82rpx;
  margin-left: 12rpx;
  font-size: 16px;
  color: var(--inv-text);
}

.search-placeholder {
  color: var(--inv-text-tertiary);
}

.search-clear {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56rpx;
  height: 56rpx;
}

.summary-card {
  padding: 30rpx;
  margin-top: 22rpx;
  color: #fff;
  background: linear-gradient(135deg, #35b982, #1f8f5f);
  border-radius: 28rpx;
  box-shadow: 0 12rpx 28rpx rgb(43 164 113 / 24%);
}

.summary-top {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
}

.summary-main {
  display: flex;
  flex-direction: column;
}

.summary-label {
  font-size: 24rpx;
  opacity: 0.85;
}

.summary-value {
  margin-top: 4rpx;
  font-size: 64rpx;
  font-weight: 700;
  line-height: 1.1;
}

.summary-unit {
  font-size: 26rpx;
  font-weight: 500;
}

.summary-side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  padding-bottom: 6rpx;
}

.summary-side-label {
  font-size: 22rpx;
  opacity: 0.8;
}

.summary-side-value {
  margin-top: 6rpx;
  font-size: 30rpx;
  font-weight: 600;
}

.summary-grid {
  display: flex;
  gap: 16rpx;
  margin-top: 26rpx;
}

.summary-item {
  display: flex;
  flex: 1;
  flex-direction: column;
  padding: 16rpx 18rpx;
  background: rgb(255 255 255 / 16%);
  border-radius: 16rpx;
}

.summary-num {
  font-size: 30rpx;
  font-weight: 700;
}

.summary-item-label {
  margin-top: 4rpx;
  font-size: 20rpx;
  opacity: 0.85;
}

.location-scroll {
  height: 88rpx;
  margin-top: 20rpx;
  white-space: nowrap;
}

.location-chips {
  display: flex;
  gap: 14rpx;
  align-items: center;
  height: 88rpx;
}

.location-chip {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  height: 76rpx;
  padding: 0 28rpx;
  font-size: 25rpx;
  color: var(--inv-text-secondary);
  background: #fff;
  border-radius: 999rpx;
  box-shadow: 0 2rpx 8rpx rgb(31 35 41 / 4%);
}

.location-chip.active {
  font-weight: 600;
  color: #fff;
  background: var(--inv-primary);
}

.list-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 20rpx 4rpx 16rpx;
}

.list-total {
  font-size: 23rpx;
  color: var(--inv-text-tertiary);
}

.filter-btn {
  display: flex;
  gap: 6rpx;
  align-items: center;
  min-height: 80rpx;
  padding: 0 24rpx;
  background: #fff;
  border-radius: 999rpx;
}

.filter-btn.active {
  background: var(--inv-primary-soft);
}

.filter-text {
  font-size: 24rpx;
  color: var(--inv-text-secondary);
}

.filter-btn.active .filter-text {
  color: var(--inv-primary-dark);
}

.filter-count {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 30rpx;
  height: 30rpx;
  padding: 0 8rpx;
  font-size: 18rpx;
  color: #fff;
  background: var(--inv-primary);
  border-radius: 999rpx;
}

.page-state {
  padding-top: 100rpx;
}

.item-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.list-footer {
  padding: 30rpx 0 10rpx;
  font-size: 22rpx;
  color: var(--inv-text-tertiary);
  text-align: center;
}

.fab {
  position: fixed;
  right: 36rpx;
  bottom: calc(48rpx + env(safe-area-inset-bottom));
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 108rpx;
  height: 108rpx;
  background: var(--inv-primary);
  border-radius: 50%;
  box-shadow: 0 12rpx 26rpx rgb(43 164 113 / 35%);
}

.fab:active {
  transform: scale(0.95);
}

.empty-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 84rpx;
  padding: 0 42rpx;
  font-size: 27rpx;
  font-weight: 600;
  color: var(--inv-primary-dark);
  background: var(--inv-primary-soft);
  border-radius: 999rpx;
}

.filter-sheet {
  max-height: 88vh;
}

.filter-label {
  display: block;
  margin: 24rpx 0 14rpx;
  font-size: 24rpx;
  font-weight: 600;
  color: var(--inv-text-secondary);
}

.filter-location-list {
  max-height: 280rpx;
  background: #f7f8fa;
  border-radius: 16rpx;
}

.filter-location {
  box-sizing: border-box;
  min-height: 70rpx;
  padding: 18rpx 24rpx;
  font-size: 25rpx;
  color: var(--inv-text);
}

.filter-location.active {
  font-weight: 600;
  color: var(--inv-primary-dark);
  background: var(--inv-primary-soft);
}

.filter-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 14rpx;
}

.filter-tag {
  display: flex;
  align-items: center;
  min-height: 62rpx;
  padding: 0 24rpx;
  font-size: 24rpx;
  border: 2rpx solid #d9dde3;
  border-radius: 999rpx;
}

.filter-placeholder {
  font-size: 23rpx;
  color: var(--inv-text-tertiary);
}

.filter-switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 88rpx;
  border-bottom: 1rpx solid #f2f3f5;
}

.filter-switch-text {
  font-size: 27rpx;
  color: var(--inv-text);
}

.filter-switch {
  position: relative;
  width: 88rpx;
  height: 52rpx;
  background: #e5e6eb;
  border-radius: 999rpx;
  transition: background 0.15s ease;
}

.filter-switch.on {
  background: var(--inv-primary);
}

.filter-switch-dot {
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

.filter-switch.on .filter-switch-dot {
  transform: translateX(36rpx);
}

.filter-sorts {
  display: flex;
  flex-wrap: wrap;
  gap: 14rpx;
}

.filter-sort {
  display: flex;
  align-items: center;
  min-height: 64rpx;
  padding: 0 24rpx;
  font-size: 24rpx;
  color: var(--inv-text-secondary);
  background: #f7f8fa;
  border-radius: 999rpx;
}

.filter-sort.active {
  font-weight: 600;
  color: #fff;
  background: var(--inv-primary);
}

.filter-actions {
  display: flex;
  gap: 20rpx;
  margin-top: 32rpx;
}

.filter-reset,
.filter-apply {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  height: 92rpx;
  font-size: 30rpx;
  font-weight: 600;
  border-radius: 999rpx;
}

.filter-reset {
  color: var(--inv-text-secondary);
  background: #f2f3f5;
}

.filter-apply {
  color: #fff;
  background: var(--inv-primary);
}
</style>
