<!-- components/custom-tabbar.vue -->
<template>
  <view class="custom-tabbar" :style="{ paddingBottom: safeAreaInsets?.bottom + 'px' }">
    <view
      class="tab-item"
      v-for="(item, index) in tabbarStore.tabList"
      :key="index"
      @click="switchTab(item, index)"
      :class="{ active: tabbarStore.activeIndex === index }"
    >
      <view class="icon-wrapper">
        <image
          class="icon-image"
          :src="tabbarStore.activeIndex === index ? item.selectedIconPath : item.iconPath"
          mode="aspectFit"
        />
      </view>
      <text class="label">{{ item.text }}</text>
    </view>

    <!-- 凸起加号按钮 -->
    <view class="add-button" @click="showActionSheet">
      <text class="add-icon">+</text>
    </view>

    <!-- 操作选择弹窗 -->
    <wd-action-sheet v-model="showActions" :actions="actionList" @select="handleActionSelect" />
  </view>
</template>

<script setup>
import { ref, onMounted } from "vue"
import { useTabbarStore } from "@/store/tabbar"

const tabbarStore = useTabbarStore()

// 获取安全区域，添加默认值
const systemInfo = uni.getSystemInfoSync()
const safeAreaInsets = systemInfo.safeAreaInsets || { bottom: 0 }

const showActions = ref(false)
const actionList = ref([
  { name: "添加记账", value: "bookkeeping" },
  { name: "添加倒数日", value: "countdown" },
  { name: "添加日记", value: "diary" },
])

// 切换选项卡
const switchTab = (item, index) => {
  tabbarStore.setActiveIndex(index)
  uni.switchTab({
    url: `/${item.pagePath}`,
    success: () => {
      console.log("切换成功:", item.text)
    },
    fail: (err) => {
      console.error("切换失败:", err)
    },
  })
}

// 显示操作选择
const showActionSheet = () => {
  showActions.value = true
}

// 处理操作选择
const handleActionSelect = (action) => {
  switch (action.value) {
    case "bookkeeping":
      // 跳转到记账页面并显示添加弹窗
      uni.navigateTo({
        url: "/pages/BookKeeping/index?showAdd=true",
      })
      break
    case "countdown":
      // TODO: 跳转到添加倒数日页面
      uni.showToast({
        title: "添加倒数日功能开发中",
        icon: "none",
      })
      break
    case "diary":
      // TODO: 跳转到添加日记页面
      uni.showToast({
        title: "添加日记功能开发中",
        icon: "none",
      })
      break
  }
  showActions.value = false
}

// 组件挂载时根据当前页面设置激活状态
onMounted(() => {
  const pages = getCurrentPages()
  if (pages.length > 0) {
    const currentPage = pages[pages.length - 1]
    const currentRoute = currentPage.route
    tabbarStore.setActiveByPath(currentRoute)
  }
})
</script>

<style scoped>
.custom-tabbar {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: space-around;
  height: 100rpx;
  background: #fff;
  border-top: 1rpx solid #f0f0f0;
}

.tab-item {
  position: relative;
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48rpx;
  height: 48rpx;
}

.icon-image {
  width: 44rpx;
  height: 44rpx;
}

.label {
  margin-top: 8rpx;
  font-size: 20rpx;
  color: #999;
}

.tab-item.active .label {
  color: #2f88ff;
}
/* 中间的记账按钮 */
.add-button {
  position: absolute;
  top: -60rpx;
  left: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80rpx;
  height: 80rpx;
  background: linear-gradient(135deg, #2f84f5 0%, #1e6fd9 100%);
  border-radius: 50%;
  box-shadow: 0 2rpx 8rpx rgb(47 132 245 / 30%);
  transition: all 0.2s ease;
  transform: translateX(-50%);
}

.add-button:active {
  box-shadow: 0 1rpx 4rpx rgb(47 132 245 / 40%);
  transform: translateX(-50%) scale(0.95);
}

.add-icon {
  font-size: 36rpx;
  font-weight: bold;
  color: #fff;
}
/* 响应式适配 */
@media screen and (width <= 375px) {
  .add-button {
    top: -55rpx;
    width: 70rpx;
    height: 70rpx;
  }

  .add-icon {
    font-size: 32rpx;
  }
}

@media screen and (width >= 414px) {
  .add-button {
    top: -63rpx;
    width: 85rpx;
    height: 85rpx;
  }

  .add-icon {
    font-size: 38rpx;
  }
}
/* 图标字体类 - 你需要根据实际图标字体调整 */
.icon-mingxi::before {
  content: "≡";
}

.icon-tubiao::before {
  content: "📊";
}

.icon-zhangdan::before {
  content: "📋";
}

.icon-wode::before {
  content: "👤";
}
</style>
