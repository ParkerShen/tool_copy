<!--
 * 日记子页面顶部的返回栏。
 * H5 使用自定义导航栏，没有系统返回按钮，因此由这个组件统一提供返回入口。
-->
<template>
  <view class="diary-navbar">
    <view class="nav-side nav-back" @click="handleBack">
      <wd-icon name="arrow-left" size="20px" color="#333" />
    </view>
    <text class="nav-title">{{ title }}</text>
    <view class="nav-side nav-right">
      <slot name="right" />
    </view>
  </view>
</template>

<script setup lang="ts">
defineProps<{
  title?: string
}>()

function handleBack(): void {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack()
    return
  }
  // 直接打开或刷新子页面时没有历史记录，回到日记首页
  uni.switchTab({ url: "/pages/Diary/index" })
}
</script>

<style scoped lang="scss">
.diary-navbar {
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
  align-items: center;
  width: 160rpx;
}

.nav-right {
  justify-content: flex-end;
}

.nav-title {
  flex: 1;
  overflow: hidden;
  font-size: 32rpx;
  font-weight: 600;
  color: #222;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
