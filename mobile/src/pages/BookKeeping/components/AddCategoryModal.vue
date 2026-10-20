<template>
  <!-- 使用uniapp的popup组件实现模态框效果 -->
  <uni-popup ref="popup" type="bottom" :mask-click="false" :z-index="10003">
    <view class="add-category-modal" :style="{ height: '80vh', zIndex: '10003' }">
      <!-- 模态框顶部导航 -->
      <view class="modal-header">
        <view class="modal-left" @click="closeModal">
          <text class="back-btn">返回</text>
        </view>
        <view class="modal-title">添加{{ categoryType === "expense" ? "支出" : "收入" }}类别</view>
        <view class="modal-right">
          <text class="done-btn" :style="{ color: '#FFC000' }" @click="confirmAdd">完成</text>
        </view>
      </view>

      <!-- 图标预览区域 -->
      <view class="icon-preview">
        <view class="preview-icon" :style="{ backgroundColor: newCategoryColor }">
          <wd-icon :name="newCategoryIcon" size="36px" color="#fff" />
        </view>
      </view>

      <!-- 输入区域 -->
      <view class="input-container">
        <input
          v-model="newCategoryName"
          class="name-input"
          type="text"
          placeholder="请输入类别名称(不超过4个汉字)"
          maxlength="4"
          placeholder-style="color: #999;"
        />
      </view>

      <!-- 图标选择 -->
      <view class="selector-block">
        <text class="section-title">选择图标</text>
        <view class="icon-options">
          <view
            v-for="icon in iconOptions"
            :key="icon"
            class="icon-option"
            :class="{ active: newCategoryIcon === icon }"
            @click="newCategoryIcon = icon"
          >
            <wd-icon :name="icon" size="20px" :color="newCategoryIcon === icon ? '#fff' : '#666'" />
          </view>
        </view>
      </view>

      <!-- 颜色选择 -->
      <view class="selector-block">
        <text class="section-title">选择颜色</text>
        <view class="color-options">
          <view
            v-for="color in colorOptions"
            :key="color"
            class="color-option"
            :class="{ active: newCategoryColor === color }"
            :style="{ backgroundColor: color }"
            @click="newCategoryColor = color"
          />
        </view>
      </view>

      <!-- 已有分类展示区域 -->
      <view class="existing-categories">
        <text class="section-title">已有分类</text>
        <view v-if="existingCategories.length === 0" class="empty-tip">暂无分类</view>
        <view v-else class="categories-list">
          <view v-for="category in existingCategories" :key="category.id" class="category-item">
            <view class="category-icon">
              <wd-icon
                :name="category.icon || 'star'"
                size="22px"
                :color="category.color || '#409eff'"
              />
            </view>
            <text class="category-name">{{ category.name }}</text>
          </view>
        </view>
      </view>
    </view>
  </uni-popup>
</template>

<script setup>
import { ref, watch } from "vue"
import { CATEGORY_COLOR_OPTIONS, CATEGORY_ICON_OPTIONS } from "@/api/bookkeeping"

const props = defineProps({
  visible: Boolean, // 是否显示模态框
  categoryType: String, // 当前分类类型（expense/income）
  existingCategories: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(["close", "add"])

const popup = ref(null)
const newCategoryName = ref("")
const newCategoryIcon = ref("star")
const newCategoryColor = ref("#409eff")

const iconOptions = CATEGORY_ICON_OPTIONS
const colorOptions = CATEGORY_COLOR_OPTIONS

// 监听visible变化打开/关闭弹窗
watch(
  () => props.visible,
  (newVal) => {
    if (newVal) {
      popup.value?.open()
      // 清空输入并恢复默认选择
      newCategoryName.value = ""
      newCategoryIcon.value = "star"
      newCategoryColor.value = "#409eff"
    } else {
      popup.value?.close()
    }
  },
)

// 关闭模态框
const closeModal = () => {
  emit("close")
}

// 完成添加
const confirmAdd = () => {
  if (!newCategoryName.value.trim()) {
    uni.showToast({
      title: "请输入分类名称",
      icon: "none",
    })
    return
  }

  emit("add", {
    name: newCategoryName.value.trim(),
    icon: newCategoryIcon.value,
    color: newCategoryColor.value,
  })

  closeModal()
}
</script>

<style scoped>
.add-category-modal {
  display: flex;
  flex-direction: column;
  padding: 30rpx;
  overflow-y: auto;
  overscroll-behavior-y: contain;
  background-color: #fff;
  border-top-left-radius: 20rpx;
  border-top-right-radius: 20rpx;
}

.modal-header {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding-bottom: 20rpx;
  border-bottom: 1rpx solid #eee;
}

.modal-left,
.modal-right {
  width: 150rpx;
}

.back-btn {
  font-size: 32rpx;
  color: #333;
}

.modal-title {
  font-size: 36rpx;
  font-weight: 500;
  color: #333;
}

.done-btn {
  display: block;
  width: 100%;
  font-size: 34rpx;
  font-weight: 500;
  text-align: right;
}

.icon-preview {
  display: flex;
  flex-shrink: 0;
  justify-content: center;
  padding: 30rpx 0;
}

.preview-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 130rpx;
  height: 130rpx;
  border-radius: 50%;
}

.input-container {
  flex-shrink: 0;
  margin: 10rpx 0 20rpx;
}

.name-input {
  width: 100%;
  height: 80rpx;
  padding: 0 20rpx;
  font-size: 32rpx;
  text-align: center;
  background-color: #f5f5f5;
  border-radius: 10rpx;
}

.selector-block {
  flex-shrink: 0;
  margin-bottom: 20rpx;
}

.section-title {
  display: block;
  margin-bottom: 16rpx;
  font-size: 28rpx;
  color: #666;
}

.icon-options {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 16rpx;
}

.icon-option {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64rpx;
  height: 64rpx;
  background: #f5f5f5;
  border-radius: 50%;
}

.icon-option.active {
  background: #ffc000;
}

.color-options {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
}

.color-option {
  width: 56rpx;
  height: 56rpx;
  border: 2rpx solid transparent;
  border-radius: 50%;
}

.color-option.active {
  border-color: #333;
  box-shadow: 0 0 0 4rpx rgb(0 0 0 / 10%);
}

.existing-categories {
  flex-shrink: 0;
  margin-top: 10rpx;
}

.empty-tip {
  padding: 20rpx 0;
  font-size: 26rpx;
  color: #999;
}

.categories-list {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20rpx;
}

.category-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12rpx 0;
}

.category-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64rpx;
  height: 64rpx;
  margin-bottom: 8rpx;
  background: #f5f5f5;
  border-radius: 50%;
}

.category-name {
  font-size: 24rpx;
  color: #333;
}
</style>
