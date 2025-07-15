<template>
  <view class="record-page">
    <!-- 金额输入区 -->
    <view class="amount-section">
      <text class="input-label">输入金额</text>
      <view class="amount-input">
        <text class="currency">
          <text :style="{ color: type === 'expense' ? '#4d80f0' : '#34d19d' }">¥</text>
        </text>
        <wd-input
          v-model="amount"
          placeholder="0.00"
          type="digit"
          clearable
          :border="false"
          class="amount-input-field"
          input-align="center"
        />
      </view>
    </view>

    <!-- 收支类型 -->
    <view class="section">
      <text class="section-title">收支类型</text>
      <view class="type-buttons">
        <wd-button size="large" style="width: 48%" type="primary" @click="type = 'expense'">
          支出
        </wd-button>
        <wd-button size="large" style="width: 48%" type="success" @click="type = 'income'">
          收入
        </wd-button>
      </view>
    </view>

    <!-- 分类选择 -->
    <view class="section">
      <text class="section-title">选择分类</text>
      <wd-grid :column="4">
        <wd-grid-item
          v-for="category in categories"
          :key="category.name"
          :custom-class="
            selectedCategory === category.name ? 'category-item active' : 'category-item'
          "
          @click="selectCategory(category.name)"
        >
          <view class="category-icon">
            <wd-icon :name="category.icon" size="20px" />
          </view>
          <text class="category-name">{{ category.name }}</text>
        </wd-grid-item>
      </wd-grid>
    </view>

    <!-- 日期时间选择 -->
    <view class="section">
      <text class="section-title">日期时间</text>
      <wd-cell
        :title="formattedDateTime"
        is-link
        @click="showDateTimePicker = true"
        custom-title-class="date-cell"
      />
      <wd-datetime-picker v-model="dateTime" v-model:visible="showDateTimePicker" type="datetime" />
    </view>

    <!-- 备注输入 -->
    <view class="section">
      <text class="section-title">备注</text>
      <wd-input v-model="note" placeholder="添加备注" clearable custom-class="note-input" />
    </view>

    <!-- 底部操作按钮 -->
    <view class="action-buttons">
      <wd-button plain size="large" custom-class="cancel-btn" @click="handleClose">返回</wd-button>
      <wd-button type="primary" size="large" custom-class="submit-btn" @click="saveRecord">
        保存
      </wd-button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, defineEmits } from "vue"
import { onReady } from "@dcloudio/uni-app"
import dayjs from "dayjs"

// 数据状态
const amount = ref("")
const type = ref("expense") // 'expense' 或 'income'
const selectedCategory = ref("餐饮")
const dateTime = ref(dayjs().format("YYYY-MM-DD HH:mm"))
const showDateTimePicker = ref(false)
const note = ref("")

const emit = defineEmits(["close"])

const handleClose = () => {
  emit("close") // 触发 close 事件
}

// 格式化显示的日期时间
const formattedDateTime = computed(() => {
  const today = dayjs()
  const recordDate = dayjs(dateTime.value)

  if (recordDate.isSame(today, "day")) {
    return "今天"
  } else if (recordDate.isSame(today.subtract(1, "day"), "day")) {
    return "昨天"
  } else if (recordDate.isSame(today.add(1, "day"), "day")) {
    return "明天"
  } else {
    return recordDate.format("YYYY-MM-DD HH:mm")
  }
})

// 分类数据
const categories = ref([
  { name: "餐饮", icon: "cart" },
  { name: "交通", icon: "car" },
  { name: "购物", icon: "bag" },
  { name: "娱乐", icon: "star" },
  { name: "医疗", icon: "medal" },
  { name: "教育", icon: "book" },
  { name: "住房", icon: "home" },
  { name: "其他", icon: "more" },
])

// 选择分类
const selectCategory = (name: string) => {
  selectedCategory.value = name
}

// 保存记录
const saveRecord = () => {
  if (!amount.value) {
    uni.showToast({ title: "请输入金额", icon: "none" })
    return
  }

  const record = {
    amount: type.value === "expense" ? -parseFloat(amount.value) : parseFloat(amount.value),
    type: type.value,
    category: selectedCategory.value,
    dateTime: dateTime.value,
    note: note.value,
  }

  // 调用API保存记录（示例）
  console.log("保存记录:", record)

  uni.showToast({ title: "保存成功", icon: "success" })

  // 保存成功后触发关闭
  emit("close")

  // 重置表单（可选）
  setTimeout(() => {
    amount.value = ""
    note.value = ""
    selectedCategory.value = "餐饮"
  }, 1500)
}

onReady(() => {
  // 设置页面标题
  uni.setNavigationBarTitle({
    title: "记账",
  })
})
</script>

<style lang="scss">
.record-page {
  padding: 20px;
  background-color: #ffffff;
  min-height: 100vh;
}

.amount-section {
  margin-bottom: 30px;

  .input-label {
    display: block;
    text-align: center;
    font-size: 16px;
    color: #666;
    margin-bottom: 10px;
  }

  .amount-input {
    display: flex;
    justify-content: center;
    align-items: center;
    //   border-bottom: 1px solid #eee;
    padding-bottom: 10px;
    margin: 0 20px;

    .currency {
      font-size: 24px;
      color: #333;
      margin-right: 10px;
      font-weight: bold;
    }

    .amount-input-field {
      flex: 1;
      font-size: 36px;
      font-weight: bold;
      text-align: center;
      padding: 0;

      .wd-input__inner {
        min-height: 50px;
        line-height: 50px;
        font-size: 36px;
        font-weight: bold;
      }
    }
  }
}

.section {
  margin-bottom: 25px;

  .section-title {
    display: block;
    font-size: 15px;
    color: #666;
    margin-bottom: 12px;
    padding-left: 10px;
  }
}

.type-buttons {
  display: flex;
  justify-content: space-around;
  gap: 15px;
  margin: 0 10px;

  .expense-btn,
  .income-btn {
    flex: 1;
    border-radius: 8px;

    &.active {
      background: var(--button-primary-background-color) !important;
      color: white !important;
    }
  }

  .expense-btn {
    background: #4d80f0;
    color: #409eff;
  }

  .income-btn {
    background: #34d19d;
    color: #666;

    &.active {
      background: #67c23a !important;
    }
  }
}

.category-item {
  padding: 12px 0;

  .category-icon {
    width: 40px;
    height: 40px;
    background-color: #f8f9fa;
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    margin-bottom: 8px;
  }

  .category-name {
    font-size: 13px;
    color: #333;
  }

  &.active {
    .category-icon {
      background-color: #ecf5ff;
      color: #409eff;
    }

    .category-name {
      color: #409eff;
      font-weight: bold;
    }
  }
}

.date-cell {
  padding: 12px 0;
  font-size: 16px;
  color: #333;
}

.note-input {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 12px 15px;

  .wd-input__inner {
    font-size: 16px;
    min-height: 40px;
  }
}

.action-buttons {
  display: flex;
  gap: 15px;
  margin: 40px 10px 20px;

  .cancel-btn {
    flex: 1;
    border-color: #dcdfe6;
    border-radius: 8px;
    color: #606266;
  }

  .submit-btn {
    flex: 1;
    border-radius: 8px;
  }
}
</style>
