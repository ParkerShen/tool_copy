<template>
  <view class="calculator-container">
    <!-- 表达式显示区域 -->
    <view class="expression-wrapper">
      <!-- 始终显示表达式内容，即使为空 -->
      <view class="expression" :class="{ 'has-value': expression !== '' }">
        <!-- 使用条件渲染避免空内容时的显示问题 -->
        <text v-if="expression">{{ expression }}</text>
        <text v-else class="placeholder">0.00</text>
      </view>

      <!-- 如果需要一个静态标签 -->
      <text class="amount-label">¥</text>
    </view>

    <!-- 备注框 -->
    <wd-input v-model="note" label="备注：" placeholder="点击填写备注">
      <template #suffix>
        <view style="display: flex; gap: 10rpx; align-items: center">
          <wd-icon name="picture" color="gray" @click.stop="onImageSelect" />
          <wd-icon name="list" color="gray" @click.stop="onTagSelect" />
        </view>
      </template>
    </wd-input>

    <!-- 计算键盘 -->
    <view class="keyboard">
      <view class="row" v-for="row in keyboard" :key="row[0].text">
        <view
          class="key"
          v-for="key in row"
          :key="key.text"
          :class="{ action: key.type === 'action', equal: key.text === '=' }"
          @click="onKeyPress(key)"
        >
          <!-- 优化后的条件渲染 -->
          <template v-if="key.icon">
            <!-- 日期按键特殊处理 -->
            <template v-if="key.text === '今天'">
              <view class="date-key-content">
                <wd-icon :name="key.icon" v-if="!date" />
                <text v-if="date" style="font-size: 20rpx">{{ formattedDate }}</text>
                <text v-else>{{ key.text }}</text>
              </view>
            </template>

            <!-- 删除按键处理 -->
            <template v-else-if="key.text === 'del'">
              <wd-icon :name="key.icon" />
            </template>

            <!-- 其他图标按键 -->
            <template v-else>
              <wd-icon :name="key.icon" />
              <text>{{ key.text }}</text>
            </template>
          </template>

          <!-- 普通按键（无图标） -->
          <view v-else>
            <!-- 等号/完成按键 - 智能显示 -->
            <template v-if="key.text === '='">
              <text>{{ isCalculationMode ? "=" : "完成" }}</text>
            </template>
            <text v-else>{{ key.text }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 日期选择 -->
    <wd-popup
      v-model="showDatePicker"
      position="bottom"
      custom-style="height: 400px;padding-bottom:40rpx"
      @close="showDatePicker = false"
    >
      <wd-datetime-picker-view v-model="dateValue" type="date" @change="onDateChange" />
    </wd-popup>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue"
import moment from "moment"
import dayjs from "dayjs"
import { createRecord, updateRecord } from "@/api/bookkeeping"

// 接收父组件传递的数据
const props = defineProps({
  categoryId: String,
  categoryType: String,
  categoryName: String,
  visible: Boolean,
  editRecord: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(["close", "success"])

const input = ref("") // 当前输入
const note = ref("")
const showDatePicker = ref(false)
const date = ref("")

const formattedDate = computed(() => {
  if (!date.value) return ""
  return dayjs(date.value).format("YYYY/MM/DD")
})

watch(
  () => date.value,
  (val) => {
    if (val === dayjs().format("YYYY-MM-DD")) {
      date.value = ""
    }
  },
  {
    immediate: true,
  },
)

// 监听组件显示状态，每次显示时重置数据
watch(
  () => props.categoryId,
  (newVal) => {
    if (newVal) {
      // 重置输入数据
      input.value = ""
      note.value = ""
      date.value = dayjs().format("YYYY-MM-DD")
    }
  },
)

// 监听可见性变化
watch(
  () => props.visible,
  (newVisible) => {
    if (newVisible) {
      // 每次显示时重置
      input.value = ""
      note.value = ""
      // 如果不是编辑模式，将日期置空
      if (!isEditMode.value) {
        date.value = ""
      } else {
        date.value = dayjs().format("YYYY-MM-DD")
      }
    }
  },
)

// 添加一个专门的重置方法
const resetForm = () => {
  input.value = ""
  note.value = ""
  date.value = "" // 创建模式下置空
  showDatePicker.value = false
}

// 在组件关闭时也调用重置
const handleClose = () => {
  // 不调用 resetForm()，保持编辑数据
  emit("close")
}

// 判断是否处于计算模式（包含运算符）
const isCalculationMode = computed(() => {
  return /[\+\-\×\÷]/.test(input.value)
})

const expression = computed(() => input.value)

const keyboard = [
  [{ text: "7" }, { text: "8" }, { text: "9" }, { icon: "calendar", text: "今天", type: "action" }],
  [{ text: "4" }, { text: "5" }, { text: "6" }, { text: "+", type: "action" }],
  [{ text: "1" }, { text: "2" }, { text: "3" }, { text: "-", type: "action" }],
  [
    { text: "." },
    { text: "0" },
    { icon: "delete", type: "action", text: "del" },
    { text: "=", type: "action" },
  ],
]

// 检查是否为计算式（包含 + 或 -）
const isFormula = computed(() => /[\+\-]/.test(input.value))

function onKeyPress(key: any) {
  if (key.text === "=") {
    if (isFormula.value) {
      try {
        input.value = String(
          parseFloat(eval(input.value).toFixed(2)), // 限制两位小数
        )
      } catch (e) {
        uni.showToast({ title: "公式错误", icon: "none" })
      }
    } else {
      // 点击完成，调用创建接口
      handleComplete()
    }
    return
  }

  if (key.text === "今天") {
    showDatePicker.value = true
    console.log("🚀 ~ onKeyPress ~ showDatePicker:")
    return
  }

  if (key.text === "del") {
    input.value = input.value.slice(0, -1)
    return
  }

  // 限制最多一个小数点和两位小数
  if (key.text === ".") {
    const parts = input.value.split(/[\+\-]/)
    const last = parts[parts.length - 1]
    if (last.includes(".")) return
  }

  const lastChar = input.value.slice(-1)

  // 避免连续运算符
  if ((key.text === "+" || key.text === "-") && /[\+\-]$/.test(lastChar)) {
    input.value = input.value.slice(0, -1) + key.text
    return
  }

  // 限制两位小数
  const parts = input.value.split(/[\+\-]/)
  const last = parts[parts.length - 1]
  if (last.includes(".") && last.split(".")[1].length >= 2 && !isNaN(+key.text)) {
    return
  }

  input.value += key.text
}

function onNoteEdit() {
  // uni.showModal({
  //   title: "填写备注",
  //   editable: true,
  //   placeholderText: "请输入备注",
  //   success: ({ content, confirm }) => {
  //     if (confirm) note.value = content
  //   },
  // })
}

function onImageSelect() {
  uni.chooseImage({
    count: 1,
    success: (res) => {
      uni.showToast({ title: "图片已选择", icon: "success" })
    },
  })
}

function onTagSelect() {
  uni.showToast({ title: "选择标签", icon: "none" })
}

function onDateChange(val: { value: string }) {
  date.value = dayjs(val.value).format("YYYY-MM-DD")
  // 移除这行，不要立即关闭弹窗
  // showDatePicker.value = false
  uni.showToast({ title: `日期：${dayjs(val.value).format("YYYY-MM-DD")}`, icon: "none" })
}

// 编辑模式状态
const isEditMode = computed(() => !!props.editRecord)

// 监听编辑记录变化
watch(
  () => props.editRecord,
  (newRecord) => {
    if (newRecord) {
      // 初始化编辑数据
      input.value = String(newRecord.amount)
      note.value = newRecord.remark || ""
      date.value = newRecord.recordDate || dayjs().format("YYYY-MM-DD")
    }
  },
  { immediate: true },
)

// 处理完成操作
const handleComplete = async () => {
  if (!input.value || parseFloat(input.value) <= 0) {
    uni.showToast({ title: "请输入有效金额", icon: "none" })
    return
  }

  if (!props.categoryId && !props.editRecord) {
    uni.showToast({ title: "请选择分类", icon: "none" })
    return
  }

  try {
    uni.showLoading({ title: isEditMode.value ? "更新中..." : "保存中..." })

    const recordData = {
      categoryId: props.categoryId || props.editRecord?.categoryId,
      type: props.categoryType || props.editRecord?.type,
      amount: parseFloat(input.value),
      title: props.categoryName || props.editRecord?.title,
      remark: note.value,
      recordDate: date.value || dayjs().format("YYYY-MM-DD"),
      recordTime: dayjs().format("HH:mm:ss"),
    }

    if (isEditMode.value) {
      // 编辑模式：调用更新接口
      await updateRecord(props.editRecord.id, recordData)
      uni.showToast({ title: "更新成功", icon: "success" })
    } else {
      // 新增模式：调用创建接口
      await createRecord(recordData)
      uni.showToast({ title: "记录成功", icon: "success" })
    }

    uni.hideLoading()
    // 只有成功后才重置
    resetForm()
    setTimeout(() => {
      emit("success")
    }, 1000)
  } catch (error) {
    uni.hideLoading()
    console.error(isEditMode.value ? "更新记录失败:" : "创建记录失败:", error)
    uni.showToast({ title: isEditMode.value ? "更新失败" : "保存失败", icon: "error" })
  }
}

const dateValue = computed({
  get() {
    return date.value ? new Date(date.value) : new Date()
  },
  set(val) {
    date.value = dayjs(val).format("YYYY-MM-DD")
  },
})
</script>

<style scoped>
.calculator-container {
  min-height: 30vh;
  padding: 20rpx;
  padding-bottom: 98rpx;
  background: #fff;
}

.expression {
  padding: 20rpx 0;
  font-size: 36rpx;
  text-align: right;
}

.keyboard {
  margin-top: 30rpx;
}

.row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10rpx;
}

.key {
  flex: 1;
  height: 100rpx;
  font-size: 36rpx;
  line-height: 100rpx;
  text-align: center;
  background: #fff;
  border: 1rpx solid #f1f1f1;
}

.key.action {
  color: #555;
}

.key.equal {
  color: #000;
  background: #ffda44;
}

.icon-group {
  display: flex;
  gap: 20rpx;
  align-items: center;
}

.expression-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  min-height: 80rpx; /* 确保有最小高度 */
  padding: 5px 10rpx;
  margin-bottom: 10rpx;
  background-color: #f8f9fa;
  border-radius: 16rpx;
  /* 动画效果 - 当值变化时 */
  transition: all 0.3s ease;
}

.expression {
  flex: 1;
  min-width: 60%;
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
  text-align: right;
  /* 没有值时的样式 */
  &:not(.has-value) {
    color: #aaa;
  }
  /* 值存在时的样式 */
  &.has-value {
    color: #333;
  }
}

.placeholder {
  font-weight: normal;
  opacity: 0.5;
}

.amount-label {
  position: absolute;
  left: 30rpx;
  font-size: 38rpx;
  font-weight: bold;
  color: #4d80f0;
}
</style>
