<template>
  <!-- 使用uniapp的popup组件实现模态框效果 -->
  <uni-popup ref="popup" type="bottom" :mask-click="false" :z-index="10003">
    <view class="add-category-modal" :style="{ height: '70vh', zIndex: '10003' }">
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
        <view class="preview-icon">
          <text class="icon-emoji">🏊</text>
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

      <!-- 已有分类展示区域 -->
      <view class="existing-categories">
        <text class="section-title">已有分类</text>
        <view class="categories-list">
          <view v-for="(category, index) in existingCategories" :key="index" class="category-item">
            <view class="category-icon">{{ category.icon }}</view>
            <text class="category-name">{{ category.name }}</text>
          </view>
        </view>
      </view>
    </view>
  </uni-popup>
</template>

<script setup>
import { ref, computed, watch, defineProps, defineEmits } from "vue"
import { onReady } from "@dcloudio/uni-app"

const props = defineProps({
  visible: Boolean, // 是否显示模态框
  categoryType: String, // 当前分类类型（expense/income）
})

const emit = defineEmits(["close", "add"])

const popup = ref(null)
const newCategoryName = ref("")
const newCategoryIcon = ref("🏊") // 初始图标

// 监听visible变化打开/关闭弹窗
watch(
  () => props.visible,
  (newVal) => {
    if (newVal) {
      popup.value.open()
      // 清空输入
      newCategoryName.value = ""
    } else {
      popup.value.close()
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
    icon: newCategoryIcon.value,
    name: newCategoryName.value.trim(),
  })

  closeModal()
}

// 获取已有分类数据（简化实现）
const existingCategories = computed(() => {
  return props.categoryType === "expense"
    ? [
        { icon: "🍔", name: "餐饮" },
        { icon: "🛒", name: "购物" },
        { icon: "🏠", name: "住房" },
        { icon: "🚗", name: "交通" },
      ]
    : [
        { icon: "💰", name: "工资" },
        { icon: "🏆", name: "奖金" },
        { icon: "📈", name: "理财" },
      ]
})
</script>

<style scoped>
.add-category-modal {
  display: flex;
  flex-direction: column;
  padding: 30rpx;
  background-color: #fff;
  border-top-left-radius: 20rpx;
  border-top-right-radius: 20rpx;
}

.modal-header {
  display: flex;
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
  justify-content: center;
  padding: 40rpx 0;
}

.preview-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 150rpx;
  height: 150rpx;
  background-color: #ffc000;
  border-radius: 50%;
}

.icon-emoji {
  font-size: 70rpx;
}

.input-container {
  margin: 30rpx 0;
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

.existing-categories {
  flex-grow: 1;
  margin-top: 30rpx;
  overflow-y: auto;
}

.section-title {
  display: block;
  margin-bottom: 20rpx;
  font-size: 32rpx;
  color: #666;
}

.categories-list {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20rpx;
}

.category-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 15rpx;
}

.category-icon {
  margin-bottom: 10rpx;
  font-size: 50rpx;
}

.category-name {
  font-size: 26rpx;
  color: #333;
}
</style>
