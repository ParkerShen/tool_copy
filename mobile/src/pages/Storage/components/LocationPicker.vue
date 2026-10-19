<template>
  <view v-if="visible" class="picker-mask" @click="close">
    <view class="picker-sheet" @click.stop>
      <view class="picker-head">
        <text class="picker-title">选择位置</text>
        <text class="picker-cancel" @click="close">取消</text>
      </view>

      <view class="picker-search">
        <wd-icon name="search" size="16px" color="#8f959e" />
        <input
          v-model="keyword"
          class="picker-input"
          type="text"
          placeholder="搜索位置"
          placeholder-class="picker-placeholder"
        />
      </view>

      <scroll-view scroll-y class="picker-list">
        <view
          class="picker-row picker-row-none"
          :class="{ active: !selectedId }"
          @click="choose(null)"
        >
          <wd-icon name="close-circle" size="18px" color="#8f959e" />
          <text class="picker-name">不指定位置</text>
          <wd-icon v-if="!selectedId" name="check" size="16px" color="#2ba471" />
        </view>

        <view
          v-for="row in rows"
          :key="row.id"
          class="picker-row"
          :class="{ active: selectedId === row.id }"
          :style="{ paddingLeft: `${24 + row.depth * 32}rpx` }"
          @click="choose(row.location)"
        >
          <wd-icon :name="row.location.icon || 'folder'" size="18px" color="#2ba471" />
          <view class="picker-main">
            <text class="picker-name">{{ row.location.name }}</text>
            <text v-if="row.path" class="picker-path">{{ row.path }}</text>
          </view>
          <wd-icon v-if="selectedId === row.id" name="check" size="16px" color="#2ba471" />
        </view>

        <view v-if="rows.length === 0" class="picker-empty">还没有位置，可在位置管理里新建</view>
      </scroll-view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue"
import type { InventoryLocation } from "@/api/inventory"

const props = defineProps<{
  visible: boolean
  selectedId: string | null
  locations: InventoryLocation[]
}>()

const emit = defineEmits<{
  (event: "update:visible", value: boolean): void
  (event: "select", value: InventoryLocation | null): void
}>()

interface FlatRow {
  id: string
  depth: number
  path: string
  location: InventoryLocation
}

const keyword = ref("")

watch(
  () => props.visible,
  (visible) => {
    if (visible) keyword.value = ""
  },
)

const rows = computed<FlatRow[]>(() => {
  const byId = new Map(props.locations.map((location) => [location.id, location]))
  const children = new Map<string, InventoryLocation[]>()
  for (const location of props.locations) {
    const key = location.parentId || ""
    const list = children.get(key) || []
    list.push(location)
    children.set(key, list)
  }

  const result: FlatRow[] = []
  const needle = keyword.value.trim().toLowerCase()

  function pathOf(location: InventoryLocation): string {
    const names: string[] = []
    let current: InventoryLocation | undefined = location
    const visited = new Set<string>()
    while (current && !visited.has(current.id)) {
      visited.add(current.id)
      names.unshift(current.name)
      current = current.parentId ? byId.get(current.parentId) : undefined
    }
    return names.join(" / ")
  }

  function walk(parentId: string, depth: number): void {
    const list = children.get(parentId) || []
    for (const location of list) {
      const path = pathOf(location)
      if (!needle || path.toLowerCase().includes(needle)) {
        result.push({ id: location.id, depth, path: depth > 0 ? pathOf(location) : "", location })
      }
      walk(location.id, depth + 1)
    }
  }

  walk("", 0)
  return result
})

function close(): void {
  emit("update:visible", false)
}

function choose(location: InventoryLocation | null): void {
  emit("select", location)
  close()
}
</script>

<style scoped lang="scss">
.picker-mask {
  position: fixed;
  inset: 0;
  z-index: 500;
  display: flex;
  align-items: flex-end;
  background: rgb(0 0 0 / 40%);
}

.picker-sheet {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-height: 82vh;
  padding: 26rpx 28rpx calc(24rpx + env(safe-area-inset-bottom));
  background: #fff;
  border-radius: 28rpx 28rpx 0 0;
  animation: sheet-up 0.18s ease-out;
}

.picker-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 18rpx;
}

.picker-title {
  font-size: 32rpx;
  font-weight: 600;
  color: var(--inv-text);
}

.picker-cancel {
  padding: 8rpx;
  font-size: 26rpx;
  color: var(--inv-text-secondary);
}

.picker-search {
  display: flex;
  align-items: center;
  height: 76rpx;
  padding: 0 22rpx;
  margin-bottom: 14rpx;
  background: #f7f8fa;
  border-radius: 999rpx;
}

.picker-input {
  flex: 1;
  height: 76rpx;
  margin-left: 10rpx;
  font-size: 16px;
  color: var(--inv-text);
}

.picker-placeholder {
  color: var(--inv-text-tertiary);
}

.picker-list {
  flex: 1;
  min-height: 300rpx;
  max-height: 60vh;
}

.picker-row {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  min-height: 92rpx;
  padding: 14rpx 12rpx;
  border-bottom: 1rpx solid #f2f3f5;
}

.picker-row.active {
  background: var(--inv-primary-soft);
}

.picker-row-none {
  padding-left: 24rpx;
}

.picker-main {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  margin: 0 14rpx;
}

.picker-name {
  overflow: hidden;
  font-size: 28rpx;
  color: var(--inv-text);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.picker-path {
  margin-top: 4rpx;
  overflow: hidden;
  font-size: 20rpx;
  color: var(--inv-text-tertiary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.picker-empty {
  padding: 60rpx 0;
  font-size: 24rpx;
  color: var(--inv-text-tertiary);
  text-align: center;
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
