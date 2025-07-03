<!--
 * @Author: huangweiqiang
 * @Date: 2024-08-01 18:47:46
 * @LastEditors: huangweiqiang
 * @LastEditTime: 2024-09-10 11:19:21
 * @Description: 优惠券-状态标识
-->
<template>
  <view
    class="status-flag"
    :class="isTop ? 'isTop' : 'isBottom'"
    :style="{ backgroundImage: `url(${backgroundImage})` }"
  >
    <text class="status-flag__text" :style="{ fontSize: textSize, color: textColor }">
      {{ props.text }}
    </text>
  </view>
</template>

<script lang="ts" setup>
interface Props {
  text?: string
  backgroundImage?: string
  textSize?: string
  textColor?: string
  isTop?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  text: "今日已领取",
  backgroundImage:
    "https://innoai-01.oss-cn-shenzhen.aliyuncs.com/wxmini/coupon/icon_status_red.png",
  textSize: "0.56rem",
  textColor: "#E95412",
  isTop: true,
})
</script>

<style scoped lang="scss">
.status-flag {
  @apply w-16 h-16 pos-absolute right-0 center;

  background-repeat: no-repeat;
  background-position: center;
  background-size: 100% 100%;

  .status-flag__text {
    transform: rotate(-16deg); /* 左旋转 30 度 */
    /* 可选：设置旋转后的文本位置 */
    transform-origin: center; /* 设置旋转中心 */
  }
}

.isTop {
  @apply top-0;
}

.isBottom {
  @apply bottom-0;
}
</style>
