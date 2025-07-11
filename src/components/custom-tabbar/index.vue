<!-- components/custom-tabbar.vue -->
<template>
  <wd-sticky style="position: absolute; bottom: 0upx">
    <view
      class="custom-tabbar"
      :style="{
        paddingBottom: safeAreaInsets?.bottom + 'px',
        width: screenWidth + 'px',
      }"
    >
      <view class="tab-item" v-for="(item, index) in tabList" :key="index" @click="switchTab(item)">
        <image
          class="icon"
          :src="activeIndex === index ? item.selectedIcon : item.icon"
          mode="aspectFit"
        />
        <text :class="['label', { active: activeIndex === index }]">{{ item.text }}</text>
      </view>

      <!-- 凸起加号按钮 -->
      <view class="add-button" @click="showBillTypeModal">
        <wd-icon name="add" size="22px"></wd-icon>
      </view>
    </view>

    <!-- 分类选择弹窗 -->
    <wd-action-sheet
      v-model="showTypeSelect"
      :actions="billTypes"
      @select="handleTypeSelect"
      title="选择账单类型"
    >
      <template #header>
        <view class="action-sheet-header">
          <text class="title">新建账单</text>
          <wd-icon name="close" @click="showTypeSelect = false" />
        </view>
      </template>
    </wd-action-sheet>

    <!-- 金额输入弹窗 -->
    <!-- <wd-number-box
      v-model="amount"
      v-model:show="showNumberPad"
      title="输入金额"
      confirm-text="保存"
      @confirm="saveBill"
    /> -->
  </wd-sticky>
</template>

<script setup>
import { ref } from "vue"
const emit = defineEmits(["tabChange"])
const props = defineProps({
  activeIndex: {
    type: Number,
    default: 0,
  },
})
const screenWidth = computed(() => {
  const systemInfo = uni.getSystemInfoSync()
  return systemInfo.screenWidth
})
// 选项卡数据
const tabList = ref([
  {
    pagePath: "/",
    icon: "/static/tabbar/activity.png",
    selectedIcon: "/static/tabbar/activity_active.png",
    text: "首页",
  },
  {
    pagePath: "/pages/my/index",
    icon: "/static/tabbar/my.png",
    selectedIcon: "/static/tabbar/my_active.png",
    text: "我的",
  },
])

// 账单类型
const billTypes = ref([
  { name: "餐饮", value: "meal", icon: "restaurant", color: "#ff9f43" },
  { name: "购物", value: "shopping", icon: "cart", color: "#54bab9" },
  { name: "交通", value: "transport", icon: "car", color: "#5d87ff" },
  { name: "收入", value: "income", icon: "money", color: "#4cd964" },
])

// 控制变量
const showTypeSelect = ref(false)
const showNumberPad = ref(false)
const selectedType = ref(null)
const amount = ref(0)

// 切换选项卡
const switchTab = (item) => {
  console.log("🚀 ~ switchTab ~ item:", item)
  uni.switchTab({ url: item.pagePath })
  emit(
    "tabChange",
    tabList.value.findIndex((t) => t.pagePath === item.pagePath),
  )
}

// 显示分类选择
const showBillTypeModal = () => {
  showTypeSelect.value = true
}

// 选择账单类型
const handleTypeSelect = (type) => {
  selectedType.value = type
  showTypeSelect.value = false
  showNumberPad.value = true
}

// 保存账单
const saveBill = () => {
  const billData = {
    type: selectedType.value,
    amount: amount.value,
    date: new Date().toISOString(),
  }
  console.log("保存账单:", billData)

  // 这里添加保存逻辑
  uni.showToast({ title: "保存成功", icon: "success" })

  // 重置数据
  amount.value = 0
  selectedType.value = null
}
</script>

<style scoped>
.custom-tabbar {
  display: flex;
  border-top: 1px solid #f5f5f5;
}

.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.icon {
  width: 48rpx;
  height: 48rpx;
}

.label {
  font-size: 22rpx;
  color: #999;
  margin-top: 8rpx;
}
.label.active {
  color: #e95412;
}

.add-button {
  position: absolute;
  left: 50%;
  top: -40rpx;
  transform: translateX(-50%);
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff9d3c, #e95412);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 16rpx rgba(233, 84, 18, 0.3);
  z-index: 100;
}
.action-sheet-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32rpx;
  font-size: 32rpx;
  font-weight: bold;
}
</style>
