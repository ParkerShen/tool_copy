<template>
  <wd-overlay :show="modalVisible">
    <view class="wrapper">
      <view class="modal-box" @click.stop="">
        <view class="modal-title">{{ $t("app.home.currentCouponIsAllTaken") }}</view>
        <view class="coupon-tips mt-27.75">{{ $t("app.home.clickCouponZoneToClaimMore") }}</view>
        <view class="coupon-tips">{{ $t("app.home.couponClaimZone") }}</view>
        <view class="coupon-button" @click="closeModal">{{ $t("app.home.youHaveClaimed") }}</view>
      </view>
      <image
        class="w-7 h-7 mt-4"
        src="https://innoai-01.oss-cn-shenzhen.aliyuncs.com/home/activity/icon_close.png"
        @click="closeModal"
      />
    </view>
  </wd-overlay>
</template>

<script lang="ts" setup>
import { computed, defineProps, defineEmits } from "vue"

interface Props {
  modelValue: boolean
}

const props = defineProps<Props>()

const emit = defineEmits(["update:modelValue", "refresh"])

const modalVisible = computed({
  get: () => props.modelValue,
  set: (val) => emit("update:modelValue", val),
})

// 关闭模态框的函数
const closeModal = () => {
  modalVisible.value = false // 通过计算属性更新值
  emit("refresh")
}
</script>

<style scoped lang="scss">
.wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;

  .modal-box {
    @apply w-67.25 h-72.25  flex-y-center px-6;

    flex-direction: column;
    background: url("https://innoai-01.oss-cn-shenzhen.aliyuncs.com/wxmini/coupon/modal_received_all.png")
      no-repeat center;
    background-size: 100% 100%;

    .modal-title {
      @apply w-full flex-x-center color-#ED5C1C font-size-4.5 font-bold mt-4;
    }

    .coupon-tips {
      @apply center font-size-3.5 color-#333;
    }

    .coupon-button {
      @apply center w-61 h-10 border-rd-11 color-#fff font-size-4.5  mt-7 font-600;

      background: linear-gradient(to right, #ff8650, #e95412);
    }
  }
}
</style>
