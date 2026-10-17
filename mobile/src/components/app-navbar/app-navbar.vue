<!--
 * 记账子页面统一返回栏。
 * 直接打开/刷新子页面时没有历史栈，此时回退到 fallback 页面。
-->
<template>
  <view class="app-navbar">
    <view class="nav-side nav-back" @click="handleBack">
      <wd-icon name="arrow-left" size="20px" color="#1f2329" />
    </view>
    <text class="nav-title">{{ title }}</text>
    <view class="nav-side nav-right">
      <slot name="right" />
    </view>
  </view>
</template>

<script setup lang="ts">
const TAB_PAGES = new Set([
  "/pages/index/index",
  "/pages/BookKeeping/index",
  "/pages/Diary/index",
  "/pages/my/index",
  "/pages/DayMaster/index",
])

const props = withDefaults(
  defineProps<{
    title?: string
    fallback?: string
  }>(),
  {
    title: "",
    fallback: "/pages/BookKeeping/index",
  },
)

function handleBack(): void {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack()
    return
  }
  if (TAB_PAGES.has(props.fallback)) {
    uni.switchTab({ url: props.fallback })
    return
  }
  uni.redirectTo({ url: props.fallback })
}
</script>

<style scoped lang="scss">
.app-navbar {
  position: sticky;
  top: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(env(safe-area-inset-top) + 16rpx) 24rpx 16rpx;
  background: #fff;
  border-bottom: 1rpx solid #f0f0f0;
}

.nav-side {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  min-width: 120rpx;
}

.nav-right {
  justify-content: flex-end;
}

.nav-title {
  flex: 1;
  overflow: hidden;
  font-size: 32rpx;
  font-weight: 600;
  color: var(--bk-text);
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
