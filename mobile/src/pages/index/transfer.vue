<route lang="json5">
{
  style: {
    navigationBarTitleText: "",
  },
}
</route>
<template>
  <view class="main-container"></view>
  <!-- <wd-overlay :show="true"> -->
  <!-- <view class="wrapper">
      <view class="block" />
    </view> -->
  <!-- </wd-overlay> -->
</template>

<script lang="ts" setup>
import { parseQrcode } from "@/api/coupon"
import { useCouponStore } from "@/store"

const couponStore = useCouponStore()

onLoad((opt) => {
  if (opt && opt.q) {
    const url = decodeURIComponent(opt.q)
    const parts = url.split("/")
    const id = parts[parts.length - 1]
    parseQrcode(id).then(({ data }) => {
      couponStore.setCouponQrCodeInfo(data)
      uni.switchTab({
        url: "/pages/coupon/index",
      })
    })
  }
})
</script>
