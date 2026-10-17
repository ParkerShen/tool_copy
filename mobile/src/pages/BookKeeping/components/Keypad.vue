<!--
 * 记账数字键盘（与常见记账 App 一致）：
 * 7 8 9 [日期] / 4 5 6 + / 1 2 3 − / . 0 ⌫ 完成
 * 只拼接字符串，保存时再求值，不使用 eval。
-->
<template>
  <view class="keypad">
    <view class="keypad-grid">
      <view class="key" @click="press('7')">7</view>
      <view class="key" @click="press('8')">8</view>
      <view class="key" @click="press('9')">9</view>

      <picker
        class="key key-date"
        mode="date"
        :value="date || today"
        :disabled="disabled"
        @change="onPickDate"
      >
        <view class="key-inner">
          <wd-icon name="calendar" size="16px" color="#646a73" />
          <text class="date-text">{{ dateLabel }}</text>
        </view>
      </picker>

      <view class="key" @click="press('4')">4</view>
      <view class="key" @click="press('5')">5</view>
      <view class="key" @click="press('6')">6</view>
      <view class="key key-action" @click="press('+')">+</view>

      <view class="key" @click="press('1')">1</view>
      <view class="key" @click="press('2')">2</view>
      <view class="key" @click="press('3')">3</view>
      <view class="key key-action" @click="press('-')">−</view>

      <view class="key" @click="press('.')">.</view>
      <view class="key" @click="press('0')">0</view>
      <view class="key" @click="press('backspace')">
        <wd-icon name="keyboard-delete" size="20px" color="#646a73" />
      </view>
      <view class="key key-primary" @click="emit('done')">完成</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from "vue"
import dayjs from "dayjs"

const props = withDefaults(
  defineProps<{
    /** 金额表达式，如 "12.5+3" */
    modelValue: string
    /** 记录日期 YYYY-MM-DD */
    date?: string
    disabled?: boolean
  }>(),
  {
    date: "",
    disabled: false,
  },
)

const emit = defineEmits<{
  (event: "update:modelValue", value: string): void
  (event: "update:date", value: string): void
  (event: "done"): void
}>()

const today = dayjs().format("YYYY-MM-DD")

const dateLabel = computed(() => {
  if (!props.date || props.date === today) return "今天"
  const value = dayjs(props.date)
  return value.isValid() ? `${value.month() + 1}/${value.date()}` : "日期"
})

function currentOperand(value: string): string {
  const index = Math.max(value.lastIndexOf("+"), value.lastIndexOf("-"))
  return index >= 0 ? value.slice(index + 1) : value
}

function onPickDate(event: { detail: { value: string | number } }): void {
  const value = String(event.detail.value || "")
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    emit("update:date", value)
  }
}

function press(key: string): void {
  if (props.disabled) return

  let value = props.modelValue || ""

  if (key === "backspace") {
    emit("update:modelValue", value.slice(0, -1))
    return
  }

  if (key === ".") {
    const operand = currentOperand(value)
    if (operand.includes(".")) return
    if (!operand || /[+-]$/.test(value)) value += "0"
    value += "."
  } else if (/^\d$/.test(key)) {
    const operand = currentOperand(value)
    if (operand.includes(".") && (operand.split(".")[1]?.length || 0) >= 2) return
    if (operand === "0") {
      value = value.slice(0, -1) + key
    } else {
      value += key
    }
  } else if (key === "+" || key === "-") {
    if (!value) return
    if (/[+-]$/.test(value)) {
      value = value.slice(0, -1) + key
    } else {
      value += key
    }
  } else {
    return
  }

  if (value.length > 24) return
  emit("update:modelValue", value)
}
</script>

<style scoped lang="scss">
.keypad {
  width: 100%;
  background: #fff;
  border-top: 1rpx solid #ececec;
}

.keypad-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.key {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 108rpx;
  font-size: 38rpx;
  font-weight: 400;
  color: var(--bk-text);
  user-select: none;
  background: #fff;
  border-right: 1rpx solid #f0f0f0;
  border-bottom: 1rpx solid #f0f0f0;
}

.key:nth-child(4n) {
  border-right: none;
}

.key:active {
  background: #f4f5f6;
}

.key-action {
  font-size: 42rpx;
  color: var(--bk-text-secondary);
}

.key-date {
  display: flex;
  height: 108rpx;
}

.key-inner {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 108rpx;
}

.date-text {
  margin-left: 8rpx;
  font-size: 28rpx;
  color: var(--bk-text-secondary);
}

.key-primary {
  font-size: 32rpx;
  font-weight: 600;
  color: var(--bk-text);
  background: var(--bk-primary);
}

.key-primary:active {
  background: var(--bk-primary-dark);
}
</style>
