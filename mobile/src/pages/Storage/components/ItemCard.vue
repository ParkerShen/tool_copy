<template>
  <view class="item-card" @click="emit('click')">
    <image v-if="item.thumbUrl" class="item-photo" :src="item.thumbUrl" mode="aspectFill" />
    <view v-else class="item-photo item-photo-empty">
      <wd-icon name="picture" size="26px" color="#c2c7cf" />
    </view>

    <view class="item-main">
      <view class="item-title-line">
        <text class="item-name">{{ item.name }}</text>
        <text class="item-qty">×{{ quantityText }}</text>
      </view>
      <text class="item-location">{{ item.locationPath || "未指定位置" }}</text>
      <view class="item-foot">
        <text class="item-code">{{ item.assetCode }}</text>
        <view class="item-tags">
          <text
            v-for="tag in item.tags.slice(0, 2)"
            :key="tag.id"
            class="item-tag"
            :style="{ color: tag.color, background: `${tag.color}1a` }"
          >
            {{ tag.name }}
          </text>
        </view>
        <text v-if="item.purchasePriceCents > 0" class="item-price">¥{{ priceText }}</text>
      </view>
    </view>

    <view v-if="item.archived" class="item-archived">已归档</view>
    <wd-icon v-else name="chevron-right" size="16px" color="#c9cdd4" />
  </view>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { formatCents } from "@/api/bookkeeping/money"
import type { InventoryItemSummary } from "@/api/inventory"

const props = defineProps<{
  item: InventoryItemSummary
}>()

const emit = defineEmits<{
  (event: "click"): void
}>()

const quantityText = computed(() => {
  const value = Number(props.item.quantity || 0)
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 1000) / 1000)
})

const priceText = computed(() => formatCents(props.item.purchasePriceCents))
</script>

<style scoped lang="scss">
.item-card {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 168rpx;
  padding: 20rpx 22rpx;
  background: #fff;
  border-radius: 24rpx;
  box-shadow: 0 4rpx 16rpx rgb(31 35 41 / 4%);
}

.item-card:active {
  background: #fafbfc;
}

.item-photo {
  flex-shrink: 0;
  width: 128rpx;
  height: 128rpx;
  background: #f2f3f5;
  border-radius: 18rpx;
}

.item-photo-empty {
  display: flex;
  align-items: center;
  justify-content: center;
}

.item-main {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  margin: 0 18rpx;
}

.item-title-line {
  display: flex;
  align-items: baseline;
  min-width: 0;
}

.item-name {
  flex: 1;
  overflow: hidden;
  font-size: 30rpx;
  font-weight: 600;
  color: var(--inv-text);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-qty {
  flex-shrink: 0;
  margin-left: 10rpx;
  font-size: 22rpx;
  color: var(--inv-text-tertiary);
}

.item-location {
  margin-top: 8rpx;
  overflow: hidden;
  font-size: 23rpx;
  color: var(--inv-text-secondary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-foot {
  display: flex;
  align-items: center;
  min-width: 0;
  margin-top: 10rpx;
}

.item-code {
  flex-shrink: 0;
  font-size: 21rpx;
  color: var(--inv-text-tertiary);
  letter-spacing: 0.5rpx;
}

.item-tags {
  display: flex;
  flex: 1;
  gap: 8rpx;
  min-width: 0;
  margin-left: 12rpx;
  overflow: hidden;
}

.item-tag {
  flex-shrink: 0;
  max-width: 140rpx;
  padding: 2rpx 10rpx;
  overflow: hidden;
  font-size: 19rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
  border-radius: 999rpx;
}

.item-price {
  flex-shrink: 0;
  margin-left: 12rpx;
  font-size: 24rpx;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--inv-text);
}

.item-archived {
  flex-shrink: 0;
  padding: 4rpx 12rpx;
  font-size: 20rpx;
  color: var(--inv-text-tertiary);
  background: #f2f3f5;
  border-radius: 8rpx;
}
</style>
