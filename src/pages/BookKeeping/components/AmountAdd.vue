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
          :style="{ backgroundColor: selectedCategory === item ? item.color : '#f8f8f8' }"
        >
          <IconFont :name="item.icon" size="36" color="#f60" />
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
      <AmountKeyboard
        :category-id="selectedCategory?.id"
        :category-type="activeTab"
        :category-name="selectedCategory?.name"
        :visible="showAmountKeyboard"
        :edit-record="editRecord"
        @close="handleKeyboardClose"
        @success="handleRecordSuccess"
      />
    </wd-popup>
  </view>
</template>
<script setup>
import { ref, computed, onMounted, watch } from "vue"
import { getCategories, updateRecord } from "@/api/bookkeeping"
import AddCategoryModal from "@/pages/BookKeeping/components/AddCategoryModal.vue"
import AmountKeyboard from "@/pages/BookKeeping/components/AmountKeyboard.vue"
import IconFont from "@/components/IconFont.vue"

// 当前激活标签（支出/收入）
const activeTab = ref("expense")
const showAddModal = ref(false) // 控制添加分类弹窗的显示
const showAmountKeyboard = ref(false) // 控制金额键盘的显示
const selectedCategory = ref(null) // 存储当前选中的分类
const emit = defineEmits(["close"])

// 保存原始编辑记录，避免取消后丢失
const originalEditRecord = ref(null)

// 接收父组件传递的编辑记录
const props = defineProps({
  editRecord: {
    type: Object,
    default: null,
  },
})

// 编辑模式状态
const isEditMode = computed(() => !!props.editRecord)

// 监听编辑记录变化，初始化编辑数据
watch(
  () => props.editRecord,
  (newRecord) => {
    if (newRecord) {
      // 保存原始编辑记录
      originalEditRecord.value = { ...newRecord }

      // 进入编辑模式，初始化数据
      activeTab.value = newRecord.type
      selectedCategory.value = {
        id: newRecord.categoryId,
        name: newRecord.category?.name || newRecord.title,
        icon: newRecord.category?.icon,
      }

      // 根据编辑类型决定显示什么
      if (newRecord.editType === "amount") {
        showAmountKeyboard.value = true
      } else {
        showAmountKeyboard.value = false
      }
    } else {
      // 完全退出编辑模式时才清空
      originalEditRecord.value = null
      activeTab.value = "expense"
      selectedCategory.value = null
      showAmountKeyboard.value = false
    }
  },
  { immediate: true },
)

// 分类数据
const expenseCategories = ref([])
const incomeCategories = ref([])

// 获取分类数据
const loadCategories = async (type) => {
  try {
    const response = await getCategories(type)
    const categories = response.data
      .filter((item) => item.type === type)
      .sort((a, b) => a.sortOrder - b.sortOrder)

    // 添加配置按钮
    const categoriesWithConfig = [
      ...categories,
      { type: "config", name: "设置", configAction: "manage" },
    ]

    if (type === "expense") {
      expenseCategories.value = categoriesWithConfig
    } else {
      incomeCategories.value = categoriesWithConfig
    }
  } catch (error) {
    console.error("获取分类失败:", error)
    uni.showToast({
      title: "获取分类失败",
      icon: "error",
    })
  }
}

// 组件挂载时加载数据
onMounted(() => {
  loadCategories("expense")
  loadCategories("income")
})

// 当前显示的分类列表
const currentCategories = computed(() =>
  activeTab.value === "expense" ? expenseCategories.value : incomeCategories.value,
)

// 标签切换处理
const handleTabChange = (tabType) => {
  activeTab.value = tabType
  selectedCategory.value = null
  // 关闭键盘和其他弹窗
  showAmountKeyboard.value = false
  showAddModal.value = false
}

// 分类点击处理
const handleCategoryClick = async (item) => {
  if (item.type === "config") {
    showConfigModal(item.configAction)
    return
  }

  selectedCategory.value = item

  // 如果是编辑分类模式，直接提交更新
  if (props.editRecord && props.editRecord.editType === "category") {
    try {
      uni.showLoading({ title: "更新中..." })

      const updatedData = {
        ...props.editRecord,
        categoryId: item.id,
        title: item.name,
        type: activeTab.value, // 更新类型为当前选中的标签页类型
      }

      await updateRecord(props.editRecord.id, updatedData)
      uni.showToast({ title: "分类已更新", icon: "success" })

      setTimeout(() => {
        emit("close")
        uni.$emit("refreshBookkeepingData")
      }, 1000)
    } catch (error) {
      console.error("更新分类失败:", error)
      uni.showToast({ title: "更新失败", icon: "error" })
    } finally {
      uni.hideLoading()
    }
    return
  }

  // 普通模式显示键盘
  showAmountKeyboard.value = true
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

// 关闭分类弹窗 - 真正的取消操作
const handleCancel = () => {
  // 重置所有状态
  activeTab.value = "expense"
  selectedCategory.value = null
  showAmountKeyboard.value = false
  showAddModal.value = false
  originalEditRecord.value = null

  emit("close")
}

// 键盘关闭处理 - 只关闭键盘，不清空编辑状态
const handleKeyboardClose = () => {
  showAmountKeyboard.value = false
  // 保持编辑状态，不清空 selectedCategory
}

// 记录创建成功处理
const handleRecordSuccess = () => {
  showAmountKeyboard.value = false
  emit("close") // 关闭整个添加页面
  // 触发首页数据刷新
  uni.$emit("refreshBookkeepingData")
}
</script>

<style scoped>
/* 页面容器 */
.page-container {
  min-height: 100vh;
  padding-top: 20rpx;
  background-color: #fff;
}
/* 标签栏样式 */
.tabs-container {
  position: relative;
  display: flex;
  padding: 20rpx 40rpx;
  border-bottom: 1px solid #eee;
}

.tab-item {
  position: relative;
  padding-bottom: 8rpx;
  margin-right: 60rpx;
  font-size: 34rpx;
  color: #999;
}

.tab-item.active {
  font-weight: 500;
  color: #000;
}

.tab-item.active::after {
  position: absolute;
  bottom: 0;
  left: 10%;
  width: 80%;
  height: 6rpx;
  content: "";
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
  position: relative;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 30rpx 0;
  padding: 30rpx;
}
/* 分类项样式 */
.category-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.icon-circle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100rpx;
  height: 100rpx;
  margin-bottom: 10rpx;
  font-size: 50rpx;
  background: #f8f8f8;
  border-radius: 50%;
  box-shadow: 0 4rpx 12rpx rgb(0 0 0 / 5%);
}

.config-button {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 60rpx;
  font-weight: bold;
  color: white;
  background-color: #ffc000;
}

.icon-text {
  font-size: 26rpx;
  color: #333;
}
/* 添加选中状态样式 */
.icon-circle.selected {
  background-color: #ffc000; /* 黄色背景 */
  box-shadow: 0 4rpx 12rpx rgb(255 192 0 / 30%);
  transform: scale(1.05); /* 稍微放大 */
}
/* 选中状态下文字加粗 */
.icon-circle.selected + .icon-text {
  font-weight: bold;
}
</style>
