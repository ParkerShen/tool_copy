<!-- 4 列分类网格，最后一格为「新建分类」 -->
<template>
  <view class="category-picker">
    <view class="category-grid">
      <view
        v-for="category in categories"
        :key="category.id"
        class="category-cell"
        @click="select(category)"
      >
        <view
          class="category-icon"
          :class="{ active: isSelected(category) }"
          :style="iconStyle(category)"
        >
          <wd-icon
            :name="category.icon || 'star'"
            size="20px"
            :color="isSelected(category) ? '#fff' : category.color || '#666'"
          />
        </view>
        <text class="category-name" :class="{ active: isSelected(category) }">
          {{ category.name }}
        </text>
      </view>

      <view v-if="categories.length === 0" class="category-tip">还没有分类</view>

      <view class="category-cell" @click="emit('create')">
        <view class="category-icon add">
          <wd-icon name="add" size="20px" color="#8f959e" />
        </view>
        <text class="category-name">新建</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import type { Category } from "@/api/bookkeeping"

const props = defineProps<{
  modelValue: string | number | null
  categories: Category[]
}>()

const emit = defineEmits<{
  (event: "update:modelValue", value: string): void
  (event: "create"): void
}>()

function isSelected(category: Category): boolean {
  return String(props.modelValue ?? "") === String(category.id)
}

function iconStyle(category: Category): Record<string, string> {
  if (isSelected(category)) {
    return { background: category.color || "#ffc000" }
  }
  return { background: `${category.color || "#8f959e"}1a` }
}

function select(category: Category): void {
  emit("update:modelValue", String(category.id))
}
</script>

<style scoped lang="scss">
.category-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 20rpx 8rpx;
}

.category-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 0;
  padding: 6rpx 0;
}

.category-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 78rpx;
  height: 78rpx;
  border-radius: 50%;
  transition: background 0.15s ease;
}

.category-icon.add {
  background: #f2f3f5;
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

.category-name.active {
  font-weight: 600;
  color: var(--bk-primary-dark);
}

.category-tip {
  grid-column: 1 / -1;
  padding: 16rpx 0;
  font-size: 24rpx;
  color: var(--bk-text-tertiary);
  text-align: center;
}
</style>
