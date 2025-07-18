<template>
  <view class="page-container">
    <!-- 顶部导航栏 -->
    <view class="tabs-container">
      <text
        class="tab-item"
        :class="{ active: activeTab === 'expense' }"
        @click="handleTabChange('expense')"
      >
        支出
      </text>
      <text
        class="tab-item"
        :class="{ active: activeTab === 'income' }"
        @click="handleTabChange('income')"
      >
        收入
      </text>
      <text class="tab-cancel" @click="handleCancel">取消</text>
    </view>

    <!-- 分类图标区域 -->
    <view class="category-container">
      <view
        v-for="(item, index) in currentCategories"
        :key="index"
        class="category-item"
        @click="handleCategoryClick(item)"
      >
        <!-- 普通分类图标 -->
        <view
          v-if="item.type !== 'config'"
          class="icon-circle"
          :class="{ selected: selectedCategory === item }"
        >
          {{ item.icon }}
        </view>
        <!-- 配置按钮 -->
        <view v-else class="icon-circle config-button">+</view>
        <text class="icon-text">{{ item.name }}</text>
      </view>
    </view>

    <!-- 添加分类的弹窗组件 -->
    <add-category-modal
      :visible="showAddModal"
      :category-type="activeTab"
      @close="showAddModal = false"
      @add="handleAddCategory"
    />
    <wd-popup :modal="false" v-model="showAmountKeyboard" position="bottom" round>
      <AmountKeyboard />
    </wd-popup>
  </view>
</template>

<script setup>
import { ref, computed } from "vue"
import AddCategoryModal from "@/pages/BookKeeping/components/AddCategoryModal.vue"
import AmountKeyboard from "@/pages/BookKeeping/components/AmountKeyboard.vue"
// 当前激活标签（支出/收入）
const activeTab = ref("expense")
const showAddModal = ref(false) // 控制添加分类弹窗的显示
const showAmountKeyboard = ref(false) // 控制金额键盘的显示
const selectedCategory = ref(null) // 存储当前选中的分类
const emit = defineEmits(["close"])

// 支出分类数据
const expenseCategories = ref([
  { icon: "🍔", name: "餐饮", type: "category" },
  { icon: "🛒", name: "购物", type: "category" },
  { icon: "🏠", name: "住房", type: "category" },
  { icon: "🚗", name: "交通", type: "category" },
  { icon: "👚", name: "服饰", type: "category" },
  { icon: "💄", name: "美容", type: "category" },
  { icon: "🎁", name: "礼物", type: "category" },
  { icon: "🏥", name: "医疗", type: "category" },
  { type: "config", name: "设置", configAction: "manage" },
])

// 收入分类数据
const incomeCategories = ref([
  { icon: "💰", name: "工资", type: "category" },
  { icon: "🏆", name: "奖金", type: "category" },
  { icon: "📈", name: "理财", type: "category" },
  { icon: "💼", name: "兼职", type: "category" },
  { type: "config", name: "设置", configAction: "manage" },
])

// 当前显示的分类列表
const currentCategories = computed(() =>
  activeTab.value === "expense" ? expenseCategories.value : incomeCategories.value,
)

// 标签切换处理
const handleTabChange = (tabType) => {
  activeTab.value = tabType
  selectedCategory.value = null
}

// 分类点击处理
const handleCategoryClick = (item) => {
  if (item.type === "config") {
    // 打开配置管理弹窗
    showConfigModal(item.configAction)
  } else {
    selectedCategory.value = item
    // 正常分类选择
    console.log("选中分类:", item.name)
    uni.showToast({
      title: `已选择: ${item.name}`,
      icon: "none",
    })
  }
  showAmountKeyboard.value = true // 显示金额键盘
}

// 配置管理弹窗
const showConfigModal = (action) => {
  uni.showModal({
    title: "管理分类",
    content: "请选择要执行的操作",
    confirmText: "添加分类",
    cancelText: "删除分类",
    success: (res) => {
      if (res.confirm) {
        // 不再使用模态框输入，改为显示单独的添加分类组件
        showAddModal.value = true
      } else if (res.cancel) {
        removeCategory()
      }
    },
  })
}

// 添加新分类处理
const handleAddCategory = (newCategory) => {
  const categories = currentCategories.value
  const lastIndex = categories.findIndex((item) => item.type === "config")

  if (lastIndex > -1) {
    // 在设置按钮前插入新分类
    categories.splice(lastIndex, 0, {
      ...newCategory,
      type: "category",
    })
    uni.showToast({
      title: "添加成功",
      icon: "success",
    })
  }
}

// 删除分类
const removeCategory = () => {
  const categories = currentCategories.value.filter((item) => item.type === "category")
  if (categories.length === 0) {
    uni.showToast({
      title: "没有可删除的分类",
      icon: "none",
    })
    return
  }

  const categoryNames = categories.map((item) => item.name)
  uni.showActionSheet({
    title: "选择要删除的分类",
    itemList: categoryNames,
    success: (res) => {
      const index = res.tapIndex
      const name = categoryNames[index]

      uni.showModal({
        title: "确认删除",
        content: `确定要删除"${name}"分类吗？`,
        success: (confirmRes) => {
          if (confirmRes.confirm) {
            // 从当前数组中删除选中的分类
            const currentIndex = currentCategories.value.findIndex(
              (item) => item.type === "category" && item.name === name,
            )

            if (currentIndex > -1) {
              currentCategories.value.splice(currentIndex, 1)
              uni.showToast({
                title: "删除成功",
                icon: "success",
              })
            }
          }
        },
      })
    },
  })
}

// 关闭分类弹窗
const handleCancel = () => {
  emit("close")
}
</script>

<style scoped>
/* 页面容器 */
.page-container {
  background-color: #ffffff;
  min-height: 100vh;
  padding-top: 20rpx;
}

/* 标签栏样式 */
.tabs-container {
  display: flex;
  position: relative;
  padding: 20rpx 40rpx;
  border-bottom: 1px solid #eee;
}

.tab-item {
  font-size: 34rpx;
  margin-right: 60rpx;
  color: #999;
  position: relative;
  padding-bottom: 8rpx;
}

.tab-item.active {
  color: #000;
  font-weight: 500;
}

.tab-item.active::after {
  content: "";
  position: absolute;
  bottom: 0;
  left: 10%;
  width: 80%;
  height: 6rpx;
  background-color: #ffc000;
  border-radius: 3rpx;
}

.tab-cancel {
  position: absolute;
  right: 40rpx;
  font-size: 32rpx;
  color: #666;
}

/* 分类网格布局 */
.category-container {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 30rpx 0;
  padding: 30rpx;
  position: relative;
}

/* 分类项样式 */
.category-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.icon-circle {
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  background: #f8f8f8;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 50rpx;
  margin-bottom: 10rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
}

.config-button {
  background-color: #ffc000;
  color: white;
  font-weight: bold;
  font-size: 60rpx;
  line-height: 90rpx;
}

.icon-text {
  font-size: 26rpx;
  color: #333;
}
/* 添加选中状态样式 */
.icon-circle.selected {
  background-color: #ffc000; /* 黄色背景 */
  box-shadow: 0 4rpx 12rpx rgba(255, 192, 0, 0.3);
  transform: scale(1.05); /* 稍微放大 */
}
/* 选中状态下文字加粗 */
.icon-circle.selected + .icon-text {
  font-weight: bold;
}
</style>
