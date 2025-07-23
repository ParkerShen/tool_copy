<!--
 * @Date: 2025-07-03 15:10:43
 * @LastEditors: parker 960822987@qq.com
 * @LastEditTime: 2025-07-23 14:36:18
 * @FilePath: \serveradminc:\Users\Administrator\Desktop\project\mobile\src\layouts\default.vue
-->
<template>
  <view class="layout-container">
    <view class="content" :style="{ paddingBottom: isTabBarPage ? '100rpx' : '0' }">
      <slot />
    </view>
    <custom-tabbar
      v-if="isTabBarPage"
      :activeIndex="currentTabIndex"
      @tabChange="handleTabChange"
    />
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from "vue"
import { getIsTabbar } from "@/utils/index"

const currentTabIndex = ref(0)
const isTabBarPage = computed(() => getIsTabbar())

// tabBar页面路径映射
const tabBarPages = [
  "pages/index/index",
  "pages/chart/index",
  "", // 记账按钮
  "pages/account/index",
  "pages/my/index",
]

const handleTabChange = (index) => {
  currentTabIndex.value = index
}

onMounted(() => {
  // 根据当前页面设置activeIndex
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  const currentRoute = currentPage.route

  const index = tabBarPages.findIndex((path) => path === currentRoute)
  if (index !== -1) {
    currentTabIndex.value = index
  }
})
</script>

<style scoped>
.layout-container {
  position: relative;
  min-height: 100vh;
}

.content {
  min-height: 100vh;
}
</style>
