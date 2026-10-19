<template>
  <view class="photo-grid">
    <view v-for="(photo, index) in modelValue" :key="index" class="photo-cell">
      <image
        class="photo-img"
        :src="photo.thumbUrl || photo.dataUrl"
        mode="aspectFill"
        @click="preview(index)"
      />
      <view class="photo-remove" @click.stop="remove(index)">
        <wd-icon name="close" size="12px" color="#fff" />
      </view>
    </view>

    <view v-if="modelValue.length < max" class="photo-add" @click="add">
      <wd-icon name="camera" size="24px" color="#8f959e" />
      <text class="photo-add-text">添加照片</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { MAX_ITEM_PHOTOS, type ItemPhotoInput } from "@/api/inventory"
import { chooseCompressedImages, makeThumbnail } from "@/utils/image"

const props = withDefaults(
  defineProps<{
    modelValue: ItemPhotoInput[]
    max?: number
  }>(),
  { max: MAX_ITEM_PHOTOS },
)

const emit = defineEmits<{
  (event: "update:modelValue", value: ItemPhotoInput[]): void
}>()

let picking = false

async function add(): Promise<void> {
  if (picking) return
  const remain = props.max - props.modelValue.length
  if (remain <= 0) return

  picking = true
  try {
    const images = await chooseCompressedImages(remain)
    if (images.length === 0) return

    uni.showLoading({ title: "处理照片", mask: true })
    const photos: ItemPhotoInput[] = []
    for (const dataUrl of images) {
      const thumbUrl = await makeThumbnail(dataUrl)
      photos.push({ dataUrl, thumbUrl })
    }
    emit("update:modelValue", [...props.modelValue, ...photos].slice(0, props.max))
  } catch (error) {
    uni.showToast({
      title: error instanceof Error ? error.message : "选择照片失败",
      icon: "none",
    })
  } finally {
    uni.hideLoading()
    picking = false
  }
}

function remove(index: number): void {
  const next = props.modelValue.slice()
  next.splice(index, 1)
  emit("update:modelValue", next)
}

function preview(index: number): void {
  uni.previewImage({
    current: props.modelValue[index]?.dataUrl,
    urls: props.modelValue.map((photo) => photo.dataUrl),
  })
}
</script>

<style scoped lang="scss">
.photo-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14rpx;
}

.photo-cell,
.photo-add {
  position: relative;
  box-sizing: border-box;
  aspect-ratio: 1;
  overflow: hidden;
  background: #f7f8fa;
  border-radius: 16rpx;
}

.photo-img {
  width: 100%;
  height: 100%;
}

.photo-remove {
  position: absolute;
  top: 8rpx;
  right: 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40rpx;
  height: 40rpx;
  background: rgb(0 0 0 / 55%);
  border-radius: 50%;
}

.photo-add {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--inv-text-tertiary);
  border: 2rpx dashed #d9dde3;
}

.photo-add-text {
  margin-top: 8rpx;
  font-size: 20rpx;
}
</style>
