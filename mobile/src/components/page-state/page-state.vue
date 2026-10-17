<!--
 * 页面三态：加载中 / 空数据 / 错误。
 * 默认插槽用于放置空态的操作按钮或额外说明。
-->
<template>
  <view class="page-state" :class="state">
    <view v-if="state === 'loading'" class="spinner" />
    <view v-else class="state-icon" :class="state">
      <wd-icon
        :name="state === 'error' ? 'warning' : 'note'"
        size="28px"
        :color="state === 'error' ? '#f54a45' : '#8f959e'"
      />
    </view>

    <text class="state-title">{{ displayTitle }}</text>
    <text v-if="description" class="state-desc">{{ description }}</text>

    <view v-if="state === 'error' || $slots.default" class="state-actions">
      <view v-if="state === 'error' && retryText" class="state-btn" @click="emit('retry')">
        {{ retryText }}
      </view>
      <slot />
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from "vue"

const props = withDefaults(
  defineProps<{
    state: "loading" | "empty" | "error"
    title?: string
    description?: string
    retryText?: string
  }>(),
  {
    title: "",
    description: "",
    retryText: "重试",
  },
)

const emit = defineEmits<{
  (event: "retry"): void
}>()

const displayTitle = computed(() => {
  if (props.title) return props.title
  if (props.state === "loading") return "加载中…"
  if (props.state === "error") return "加载失败"
  return "还没有数据"
})
</script>

<style scoped lang="scss">
.page-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 96rpx 40rpx;
  text-align: center;
}

.state-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 112rpx;
  height: 112rpx;
  background: #f2f3f5;
  border-radius: 50%;
}

.state-icon.error {
  background: #fff1f0;
}

.state-title {
  margin-top: 24rpx;
  font-size: 30rpx;
  font-weight: 600;
  color: var(--bk-text-secondary);
}

.state-desc {
  max-width: 520rpx;
  margin-top: 12rpx;
  font-size: 24rpx;
  line-height: 1.6;
  color: var(--bk-text-tertiary);
}

.state-actions {
  display: flex;
  gap: 20rpx;
  align-items: center;
  margin-top: 28rpx;
}

.state-btn {
  padding: 16rpx 48rpx;
  font-size: 28rpx;
  color: var(--bk-text);
  background: #fff;
  border: 1rpx solid var(--bk-border);
  border-radius: 999rpx;
}

.spinner {
  width: 56rpx;
  height: 56rpx;
  border: 5rpx solid #ececec;
  border-top-color: var(--bk-primary);
  border-radius: 50%;
  animation: bk-spin 0.8s linear infinite;
}

@keyframes bk-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
