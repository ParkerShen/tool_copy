<template>
  <view class="tab-bar">
    <view
      v-for="(item, index) in tabs"
      :key="index"
      class="tab-item"
      :class="{ active: current === index }"
      @tap="switchTab(index, item.pagePath)"
    >
      <image :src="current === index ? item.selectedIcon : item.icon" />
      <text>{{ item.text }}</text>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from "vue"
import { useRoute } from "vue-router"

const current = ref(0)

const tabs = [
  {
    text: "首页",
    icon: "/static/tabbar/home.png",
    selectedIcon: "/static/tabbar/home_active.png",
    pagePath: "/pages/index/index",
  },
  {
    text: "记账",
    icon: "/static/tabbar/bookkeeping.png",
    selectedIcon: "/static/tabbar/bookkeeping_active.png",
    pagePath: "/pages/BookKeeping/index",
  },
  {
    text: "倒数日",
    icon: "/static/tabbar/calendar.png",
    selectedIcon: "/static/tabbar/calendar_active.png",
    pagePath: "/pages/DayMaster/index",
  },
  {
    text: "日记",
    icon: "/static/tabbar/write.png",
    selectedIcon: "/static/tabbar/write_active.png",
    pagePath: "/pages/Diary/index",
  },
  {
    text: "我的",
    icon: "/static/tabbar/user.png",
    selectedIcon: "/static/tabbar/user_active.png",
    pagePath: "/pages/my/index",
  },
]

function switchTab(index, path) {
  current.value = index
  uni.switchTab({ url: path })
}

// 根据当前页面路径设置选中项
onMounted(() => {
  const currentPath = getCurrentPages().at(-1)?.route
  const matchedIndex = tabs.findIndex((tab) => tab.pagePath === `/${currentPath}`)
  if (matchedIndex !== -1) {
    current.value = matchedIndex
  }
})
</script>

<style scoped>
.tab-bar {
  position: fixed;
  bottom: 0;
  width: 100%;
  height: 88rpx;
  background-color: #fff;
  border-top: 1rpx solid #eee;
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding-bottom: env(safe-area-inset-bottom);
}
.tab-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 24rpx;
  color: #666;
}
.tab-item.active {
  color: #2f88ff;
}
.tab-item image {
  width: 56rpx;
  height: 56rpx;
}
</style>
