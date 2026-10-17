<!-- 标签选择面板：多选、支持新建，最多 5 个 -->
<template>
  <view v-if="visible" class="tag-mask" @click="emit('close')">
    <view
      class="tag-sheet"
      :style="
        keyboardOffset
          ? {
              marginBottom: `${keyboardOffset}px`,
              maxHeight: `calc(100vh - ${keyboardOffset + 16}px)`,
              overflowY: 'auto',
            }
          : undefined
      "
      @click.stop
    >
      <view class="tag-head">
        <text class="tag-title">标签</text>
        <text class="tag-done" @click="emit('close')">完成</text>
      </view>

      <view class="tag-input-row">
        <input
          v-model="newTag"
          class="tag-input"
          type="text"
          :maxlength="MAX_TAG_LENGTH"
          placeholder="新建标签，最多 8 个字"
          confirm-type="done"
          @focus="attachKeyboard"
          @blur="detachKeyboard"
          @confirm="addTag"
        />
        <view class="tag-add" @click="addTag">添加</view>
      </view>

      <view class="tag-section">
        <text class="tag-section-title">已选 {{ selected.length }}/{{ MAX_RECORD_TAGS }}</text>
        <view class="tag-chips">
          <view
            v-for="tag in selected"
            :key="tag"
            class="tag-chip active"
            @click="toggle(tag)"
          >
            #{{ tag }}
            <wd-icon name="close" size="12px" color="#ff9f00" />
          </view>
          <text v-if="selected.length === 0" class="tag-empty">还没有选择标签</text>
        </view>
      </view>

      <view class="tag-section">
        <text class="tag-section-title">常用标签</text>
        <view class="tag-chips">
          <view
            v-for="item in suggestions"
            :key="item.name"
            class="tag-chip"
            :class="{ active: selected.includes(item.name) }"
            @click="toggle(item.name)"
          >
            #{{ item.name }}
            <text v-if="item.count > 0" class="tag-count">{{ item.count }}</text>
          </view>
          <text v-if="suggestions.length === 0" class="tag-empty">
            还没有使用过标签，输入后点添加
          </text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, watch } from "vue"
import { MAX_RECORD_TAGS, MAX_TAG_LENGTH } from "@/api/bookkeeping"
import type { TagUsage } from "@/api/bookkeeping"
import { useKeyboardOffset } from "@/utils/keyboard"

const props = defineProps<{
  visible: boolean
  modelValue: string[]
  suggestions: TagUsage[]
}>()

const emit = defineEmits<{
  (event: "update:modelValue", value: string[]): void
  (event: "close"): void
}>()

const selected = ref<string[]>([])
const newTag = ref("")
const { offset: keyboardOffset, attach: attachKeyboard, detach: detachKeyboard } =
  useKeyboardOffset()

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      selected.value = [...props.modelValue]
      newTag.value = ""
    } else {
      detachKeyboard()
    }
  },
  { immediate: true },
)

function commit(next: string[]): void {
  selected.value = next
  emit("update:modelValue", [...next])
}

function toggle(tag: string): void {
  if (selected.value.includes(tag)) {
    commit(selected.value.filter((item) => item !== tag))
    return
  }
  if (selected.value.length >= MAX_RECORD_TAGS) {
    uni.showToast({ title: `最多 ${MAX_RECORD_TAGS} 个标签`, icon: "none" })
    return
  }
  commit([...selected.value, tag])
}

function addTag(): void {
  const tag = newTag.value.trim().replace(/^#/, "")
  if (!tag) return
  if (tag.length > MAX_TAG_LENGTH) {
    uni.showToast({ title: `单个标签不超过 ${MAX_TAG_LENGTH} 个字`, icon: "none" })
    return
  }
  if (!selected.value.includes(tag)) {
    if (selected.value.length >= MAX_RECORD_TAGS) {
      uni.showToast({ title: `最多 ${MAX_RECORD_TAGS} 个标签`, icon: "none" })
      return
    }
    commit([...selected.value, tag])
  }
  newTag.value = ""
}
</script>

<style scoped lang="scss">
.tag-mask {
  position: fixed;
  inset: 0;
  z-index: 400;
  display: flex;
  align-items: flex-end;
  background: rgb(0 0 0 / 40%);
}

.tag-sheet {
  box-sizing: border-box;
  width: 100%;
  padding: 26rpx 24rpx calc(20rpx + env(safe-area-inset-bottom));
  background: #fff;
  border-radius: 28rpx 28rpx 0 0;
  animation: tag-up 0.18s ease-out;
}

.tag-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 20rpx;
}

.tag-title {
  font-size: 32rpx;
  font-weight: 600;
  color: var(--bk-text);
}

.tag-done {
  font-size: 28rpx;
  color: var(--bk-primary-dark);
}

.tag-input-row {
  display: flex;
  align-items: center;
  padding: 14rpx 16rpx;
  background: #f7f8fa;
  border-radius: 16rpx;
}

.tag-input {
  flex: 1;
  min-width: 0;
  font-size: 28rpx;
  color: var(--bk-text);
}

.tag-add {
  flex-shrink: 0;
  padding: 8rpx 24rpx;
  margin-left: 16rpx;
  font-size: 26rpx;
  color: var(--bk-text);
  background: #fff;
  border-radius: 999rpx;
  box-shadow: 0 2rpx 8rpx rgb(31 35 41 / 6%);
}

.tag-section {
  margin-top: 26rpx;
}

.tag-section-title {
  display: block;
  margin-bottom: 14rpx;
  font-size: 24rpx;
  color: var(--bk-text-tertiary);
}

.tag-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 14rpx;
}

.tag-chip {
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
  padding: 10rpx 20rpx;
  font-size: 25rpx;
  color: var(--bk-text-secondary);
  background: #f2f3f5;
  border-radius: 999rpx;
}

.tag-chip.active {
  color: var(--bk-primary-dark);
  background: #fff7e0;
}

.tag-count {
  font-size: 20rpx;
  color: var(--bk-text-tertiary);
}

.tag-empty {
  padding: 10rpx 0;
  font-size: 24rpx;
  color: var(--bk-text-tertiary);
}

@keyframes tag-up {
  from {
    transform: translateY(100%);
  }

  to {
    transform: translateY(0);
  }
}
</style>
