import { CouponQrcodeVo } from "@/api/coupon/types"
import { defineStore } from "pinia"
import { ref } from "vue"

export const useCouponStore = defineStore(
  "coupon",
  () => {
    const couponRouter = ref("")

    const couponQrCodeInfo = ref<CouponQrcodeVo>({})

    const setCouponRouter = (val: string) => {
      couponRouter.value = val
    }

    const clearCouponRouter = () => {
      couponRouter.value = ""
    }

    const setCouponQrCodeInfo = (val: CouponQrcodeVo) => {
      couponQrCodeInfo.value = val
    }

    return {
      couponRouter,
      couponQrCodeInfo,
      setCouponRouter,
      clearCouponRouter,
      setCouponQrCodeInfo,
    }
  },
  {
    persist: {
      storage: localStorage,
      paths: ["couponRouter"],
    },
  },
)
