<template>
  <view class="calculator-container">
    <!-- 表达式显示区域 -->
    <view class="expression-wrapper">
      <view class="expression" :class="{ 'has-value': expression !== '' }">
        <text v-if="expression">{{ expression }}</text>
        <text v-else class="placeholder">0.00</text>
      </view>
      <text class="amount-label">¥</text>
    </view>

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
          <template v-if="key.icon">
            <template v-if="key.text === '今天'">
              <view class="date-key-content">
                <wd-icon :name="key.icon" v-if="!date" />
                <text v-if="date" style="font-size: 20rpx">{{ formattedDate }}</text>
                <text v-else>{{ key.text }}</text>
              </view>
            </template>
            <template v-else-if="key.text === 'del'">
              <wd-icon :name="key.icon" />
            </template>
            <template v-else>
              <wd-icon :name="key.icon" />
              <text>{{ key.text }}</text>
            </template>
          </template>
          <view v-else>
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
      custom-style="height: 300px;padding-bottom:40rpx"
      :z-index="10002"
      @close="showDatePicker = false"
    >
      <wd-datetime-picker-view v-model="dateValue" type="date" @change="onDateChange" />
    </wd-popup>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from "vue"
import dayjs from "dayjs"
import { updateRecord } from "@/api/bookkeeping"
import { useTabbarStore } from "@/store/tabbar"

const tabbarStore = useTabbarStore()

const props = defineProps({
  record: {
    type: Object,
    required: true,
  },
  visible: Boolean,
})

const emit = defineEmits(["close", "success"])

const input = ref("")
const showDatePicker = ref(false)
const date = ref("")

// 监听日期选择器状态变化
watch(showDatePicker, (newVal) => {
  if (newVal) {
    uni.$emit("childPopupShow")
  } else {
    uni.$emit("childPopupHide")
  }
})

// 监听组件的visible属性变化
watch(
  () => props.visible,
  (newVal) => {
    if (newVal) {
      // 金额编辑键盘显示时，隐藏图表
      uni.$emit("childPopupShow")
      oneInput.value = false
    } else {
      // 金额编辑键盘隐藏时，显示图表
      uni.$emit("childPopupHide")
    }
  },
  { immediate: true },
)

const formattedDate = computed(() => {
  if (!date.value) return ""
  return dayjs(date.value).format("MM/DD")
})

// 监听组件显示状态，每次显示时初始化数据并控制tabbar按钮
watch(
  () => props.visible,
  (newVisible) => {
    if (newVisible) {
      // 隐藏tabbar加号按钮
      tabbarStore.addButtonVisible = false
      if (props.record) {
        input.value = String(props.record.amount)
        date.value = props.record.recordDate || dayjs().format("YYYY-MM-DD")
      }
    } else {
      // 显示tabbar加号按钮
      tabbarStore.addButtonVisible = true
    }
  },
  { immediate: true },
)

// 兜底：挂载/卸载时也控制一次
onMounted(() => (tabbarStore.addButtonVisible = false))

onUnmounted(() => (tabbarStore.addButtonVisible = true))

const expression = computed({
  get() {
    return input.value
  },
  set(val) {
    input.value = val
  },
})
const isFormula = computed(() => /[+-]/.test(input.value))
const isCalculationMode = computed(() => /[+-]/.test(input.value))

// 键盘布局
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

const oneInput = ref(false)

function onKeyPress(key: any) {
  if (!oneInput.value && /^[1-9]$/.test(key.text)) {
    input.value = key.text
    oneInput.value = true
    return
  }
  oneInput.value = true
  if (key.text === "=") {
    if (isFormula.value) {
      try {
        // 1. 检查末尾是否是运算符
        if (/[+\-]$/.test(input.value)) {
          uni.showToast({ title: "请输入完整公式", icon: "none" })
          return
        }

        // 2. 移除开头多余的运算符
        const sanitizedInput = input.value.replace(/^[+\-]/, "")

        // 3. 检查是否为空
        if (!sanitizedInput) {
          uni.showToast({ title: "请输入有效公式", icon: "none" })
          return
        }

        // 4. 检查只包含允许的字符
        if (!/^[\d.+-]+$/.test(sanitizedInput)) {
          uni.showToast({ title: "公式包含非法字符", icon: "none" })
          return
        }

        // 5. 手动解析公式（只支持 + 和 -）
        let result = 0
        let currentNumber = ""
        let currentSign = 1 // 1 表示加，-1 表示减

        for (let i = 0; i < sanitizedInput.length; i++) {
          const char = sanitizedInput[i]
          if (char === "+" || char === "-") {
            if (currentNumber !== "") {
              result += currentSign * parseFloat(currentNumber)
              currentNumber = ""
            }
            currentSign = char === "+" ? 1 : -1
          } else {
            currentNumber += char
          }
        }

        // 最后一个数
        if (currentNumber !== "") {
          result += currentSign * parseFloat(currentNumber)
        }

        // 保留两位小数
        input.value = String(parseFloat(result.toFixed(2)))
      } catch (e) {
        console.error("公式错误:", e)
        uni.showToast({ title: "公式错误", icon: "none" })
      }
    } else {
      handleComplete()
    }
    return
  }

  // 避免运算符作为第一个字符（除非是负数）
  if ((key.text === "+" || key.text === "-") && input.value === "") {
    if (key.text === "-") {
      input.value = "-" // 允许负数
    }
    return
  }

  // 避免连续运算符
  if ((key.text === "+" || key.text === "-") && /[+\-]$/.test(input.value)) {
    // 如果是减号且前一个字符是运算符，允许（用于负数）
    if (key.text === "-" && /[+\-]$/.test(input.value)) {
      input.value += key.text
    } else {
      // 否则替换前一个运算符
      input.value = input.value.slice(0, -1) + key.text
    }
    return
  }

  if (key.text === "今天") {
    showDatePicker.value = true
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

function onDateChange(val: { value: string }) {
  date.value = dayjs(val.value).format("YYYY-MM-DD")
  // 移除这行，不要立即关闭弹窗
  // showDatePicker.value = false
  uni.showToast({ title: `日期：${dayjs(val.value).format("YYYY-MM-DD")}`, icon: "none" })
}

const handleComplete = async () => {
  const parsedAmount = parseFloat(input.value)
  if (!input.value || !Number.isFinite(parsedAmount) || parsedAmount === 0) {
    uni.showToast({ title: "请输入有效金额", icon: "none" })
    return
  }

  try {
    uni.showLoading({ title: "更新中..." })

    const recordData = {
      ...props.record,
      amount: String(parseFloat(input.value)), // 更新接口要求字符串
      recordDate: date.value || dayjs().format("YYYY-MM-DD"),
    }

    await updateRecord(props.record.id, recordData)
    uni.showToast({ title: "更新成功", icon: "success" })

    setTimeout(() => {
      emit("success")
      emit("close")
    }, 1000)
  } catch (error) {
    console.error("更新失败:", error)
    uni.showToast({ title: "更新失败", icon: "error" })
  } finally {
    uni.hideLoading()
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
  padding-bottom: 120rpx; /* 增加底部间距，避免被导航栏遮挡 */
  background: #fff;
}

.expression-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  min-height: 80rpx;
  padding: 5px 10rpx;
  margin-bottom: 20rpx;
  background-color: #f8f9fa;
  border-radius: 16rpx;
  transition: all 0.3s ease;
}

.expression {
  flex: 1;
  min-width: 60%;
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
  text-align: right;
}

.expression:not(.has-value) {
  color: #aaa;
}

.expression.has-value {
  color: #333;
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

.keyboard {
  margin-top: 30rpx;
}

.row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10rpx;
}

.key {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  height: 100rpx;
  margin: 0 5rpx;
  font-size: 36rpx;
  line-height: 100rpx;
  text-align: center;
  background: #fff;
  border: 1rpx solid #f1f1f1;
  border-radius: 8rpx;
}

.key.action {
  color: #555;
}

.key.equal {
  color: #000;
  background: #ffda44;
}

.date-key-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
}
</style>
