<!--
 * @Date: 2025-07-03 15:10:43
 * @LastEditors: parker 960822987@qq.com
 * @LastEditTime: 2025-07-23 14:36:18
 * @FilePath: \serveradminc:\Users\Administrator\Desktop\project\mobile\src\layouts\default.vue
-->
<template>
  <view class="layout-container">
    <view class="content">
      <slot />
    </view>
    <!-- 工具页不再显示底部导航，用左下角悬浮按钮返回首页 -->
    <view v-if="showHomeButton" class="home-btn" @click="goHome">
      <wd-icon name="home" size="20px" color="#fff" />
    </view>
  </view>
</template>

<script setup>
import { computed } from "vue"
import { getIsTabbar } from "@/utils/index"

const isTabBarPage = computed(() => getIsTabbar())

const showHomeButton = computed(() => {
  if (!isTabBarPage.value) return false
  const pages = getCurrentPages()
  const current = pages[pages.length - 1]
  return !!current && current.route !== "pages/index/index"
})

function goHome() {
  uni.switchTab({ url: "/pages/index/index" })
}
</script>

<style scoped>
.layout-container {
  position: relative;
  min-height: 100vh;
}

.content {
  min-height: 100vh;
}

.home-btn {
  position: fixed;
  bottom: calc(40rpx + env(safe-area-inset-bottom));
  left: 32rpx;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 88rpx;
  height: 88rpx;
  background: rgb(40 40 40 / 70%);
  border-radius: 50%;
  box-shadow: 0 8rpx 24rpx rgb(0 0 0 / 15%);
}

.home-btn:active {
  transform: scale(0.94);
}
</style>
