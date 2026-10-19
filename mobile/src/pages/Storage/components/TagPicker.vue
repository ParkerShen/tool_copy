<template>
  <view v-if="visible" class="tag-mask" @click="close">
    <view class="tag-sheet" @click.stop>
      <view class="tag-head">
        <text class="tag-title">选择标签</text>
        <text class="tag-cancel" @click="close">取消</text>
      </view>

      <view v-if="tags.length > 0" class="tag-list">
        <view
          v-for="tag in tags"
          :key="tag.id"
          class="tag-chip"
          :class="{ active: selected.includes(tag.id) }"
          :style="
            selected.includes(tag.id)
              ? { background: tag.color, borderColor: tag.color }
              : { borderColor: `${tag.color}66`, color: tag.color }
          "
          @click="toggle(tag.id)"
        >
          <wd-icon v-if="selected.includes(tag.id)" name="check" size="12px" color="#fff" />
          <text class="tag-chip-text">{{ tag.name }}</text>
          <text v-if="tag.itemCount" class="tag-chip-count">{{ tag.itemCount }}</text>
        </view>
      </view>
      <view v-else class="tag-empty">还没有标签，先新建一个</view>

      <view class="tag-create">
        <input
          v-model="newName"
          class="tag-input"
          type="text"
          maxlength="12"
          placeholder="新标签名称"
          placeholder-class="tag-placeholder"
          @confirm="create"
        />
        <view class="tag-create-btn" :class="{ disabled: creating }" @click="create">新建</view>
      </view>

      <view class="tag-actions">
        <view class="tag-done" @click="close">完成</view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, watch } from "vue"
import { createTag, listTags, type InventoryTag } from "@/api/inventory"

const props = defineProps<{
  visible: boolean
  selectedIds: string[]
}>()

const emit = defineEmits<{
  (event: "update:visible", value: boolean): void
  (event: "update:selectedIds", value: string[]): void
}>()

const tags = ref<InventoryTag[]>([])
const selected = ref<string[]>([])
const newName = ref("")
const creating = ref(false)

watch(
  () => props.visible,
  async (visible) => {
    if (!visible) return
    selected.value = props.selectedIds.slice()
    newName.value = ""
    await load()
  },
)

async function load(): Promise<void> {
  try {
    tags.value = await listTags()
  } catch (error) {
    uni.showToast({
      title: error instanceof Error ? error.message : "标签加载失败",
      icon: "none",
    })
  }
}

function toggle(id: string): void {
  if (selected.value.includes(id)) {
    selected.value = selected.value.filter((item) => item !== id)
  } else {
    selected.value = [...selected.value, id]
  }
}

async function create(): Promise<void> {
  const name = newName.value.trim()
  if (!name || creating.value) return
  creating.value = true
  try {
    const tag = await createTag({ name })
    newName.value = ""
    await load()
    if (!selected.value.includes(tag.id)) selected.value = [...selected.value, tag.id]
  } catch (error) {
    uni.showToast({
      title: error instanceof Error ? error.message : "新建标签失败",
      icon: "none",
    })
  } finally {
    creating.value = false
  }
}

function close(): void {
  emit("update:selectedIds", selected.value.slice())
  emit("update:visible", false)
  uni.$emit("refreshInventoryTags")
}
</script>

<style scoped lang="scss">
.tag-mask {
  position: fixed;
  inset: 0;
  z-index: 500;
  display: flex;
  align-items: flex-end;
  background: rgb(0 0 0 / 40%);
}

.tag-sheet {
  box-sizing: border-box;
  width: 100%;
  padding: 26rpx 28rpx calc(24rpx + env(safe-area-inset-bottom));
  background: #fff;
  border-radius: 28rpx 28rpx 0 0;
  animation: sheet-up 0.18s ease-out;
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
  color: var(--inv-text);
}

.tag-cancel {
  padding: 8rpx;
  font-size: 26rpx;
  color: var(--inv-text-secondary);
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  padding: 10rpx 0 8rpx;
}

.tag-chip {
  display: flex;
  align-items: center;
  min-height: 64rpx;
  padding: 0 22rpx;
  font-size: 26rpx;
  color: var(--inv-primary-dark);
  background: #fff;
  border: 2rpx solid #cdeadd;
  border-radius: 999rpx;
}

.tag-chip.active {
  color: #fff;
}

.tag-chip-text {
  margin: 0 6rpx;
}

.tag-chip-count {
  font-size: 20rpx;
  opacity: 0.7;
}

.tag-empty {
  padding: 40rpx 0;
  font-size: 24rpx;
  color: var(--inv-text-tertiary);
  text-align: center;
}

.tag-create {
  display: flex;
  gap: 16rpx;
  align-items: center;
  margin-top: 24rpx;
}

.tag-input {
  box-sizing: border-box;
  flex: 1;
  height: 84rpx;
  padding: 0 24rpx;
  font-size: 16px;
  color: var(--inv-text);
  background: #f7f8fa;
  border-radius: 16rpx;
}

.tag-placeholder {
  color: var(--inv-text-tertiary);
}

.tag-create-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 84rpx;
  padding: 0 30rpx;
  font-size: 26rpx;
  font-weight: 600;
  color: #fff;
  background: var(--inv-primary);
  border-radius: 16rpx;
}

.tag-create-btn.disabled {
  opacity: 0.5;
}

.tag-actions {
  margin-top: 30rpx;
}

.tag-done {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 92rpx;
  font-size: 30rpx;
  font-weight: 600;
  color: #fff;
  background: var(--inv-primary);
  border-radius: 999rpx;
}

@keyframes sheet-up {
  from {
    transform: translateY(100%);
  }

  to {
    transform: translateY(0);
  }
}
</style>
