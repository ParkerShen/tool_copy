<route lang="json5" type="page">
{
  style: { navigationBarTitleText: "", enablePullDownRefresh: true },
}
</route>
<template>
  <view class="main-container">
    <view class="content">
      <view class="content-title">
        <text class="font-size-5 color-#333 font-bold ellipsis-2">
          {{ couponInfo.coupon_name }}
        </text>
        <view class="coupon-status">
          {{ isUsed ? $t("app.home.verified") : $t("app.home.unverified") }}
        </view>
      </view>
      <view class="content-qrcode">
        <view class="qrcode-box">
          <!-- #ifdef H5 -->
          <wd-img class="qrcode" :src="qr_code" :enable-preview="!isUsed" />
          <!-- #endif -->
          <!-- #ifdef MP-WEIXIN -->
          <image class="qrcode" :src="qr_code" />
          <!-- #endif -->
          <view v-if="isUsed" class="mask" />
          <image
            v-if="isUsed"
            class="hx"
            src="https://innoai-01.oss-cn-shenzhen.aliyuncs.com/home/activity/hx.png"
          />
        </view>
        <view class="hx-code">{{ $t("app.home.hxCode") }}：{{ couponInfo.code }}</view>
        <view v-if="!isUsed" class="color-#E95412 font-size-2.75 mt-4">
          {{ $t("app.home.scanCodeForVerification") }}
        </view>
      </view>
    </view>
    <view class="wrapper">
      <view class="rule-box">
        <view class="rule-title">
          <text class="ml-4 font-bold font-size-5 color-#E95412">
            {{ $t("app.home.usageRules") }}
          </text>
        </view>
        <!-- eslint-disable-next-line vue/no-v-text-v-html-on-component -->
        <view class="rule-content" v-html="couponInfo.rule" />
      </view>
    </view>
    <!-- #ifdef H5 -->
    <view class="footer" v-if="backType === '2'" @click="goBack">
      {{ $t("app.global.back") }}
      <view class="font-size-3 color-#666 mt-2.5"></view>
    </view>
    <!-- #endif -->
  </view>
</template>

<script lang="ts" setup>
import { getCouponRecordDetail, getQrcodeBlob } from "@/api/coupon"
import { CouponRecordVo } from "@/api/coupon/types"
import i18n from "@/locale/index"
import { useLangStore } from "@/store"

const langStore = useLangStore()

const { t } = i18n.global as any

const couponInfo = ref<CouponRecordVo>({
  usage_status: 1,
})

const qrCodeId = ref("")

const qr_code = ref("")

const backType = ref("2")

const goBack = () => {
  uni.reLaunch({
    url: "/pages/index/index",
  })
}

const getCouponInfo = async (id: string) => {
  getCouponRecordDetail(id).then(({ data }) => {
    couponInfo.value = data
    if (data.qr_code_flag) {
      getQrcode(data.qr_code_flag)
    }
  })
}

// 获取二维码
const getQrcode = async (id: string) => {
  getQrcodeBlob(id).then((data: any) => {
    qr_code.value = data
  })
}

const isUsed = computed(() => {
  return couponInfo.value.usage_status === 2
})

onPullDownRefresh(async () => {
  await getCouponInfo(qrCodeId.value)
  uni.stopPullDownRefresh()
})

onLoad((opt) => {
  if (opt && opt.id) {
    qrCodeId.value = opt.id
    getCouponInfo(opt.id)
  }

  if (opt && opt.back) {
    backType.value = opt.back
  }
})

watch(
  () => langStore.langPackageLoading,
  (value) => {
    if (!value) {
      uni.setNavigationBarTitle({
        title: t("app.home.couponDetails"),
      })
    }
  },
  {
    immediate: true,
  },
)
</script>

<style>
/* #ifdef MP-WEIXIN */
page {
  height: 100%;
  background: linear-gradient(180deg, #e95412 0%, rgb(234 85 19 / 0%) 100%) no-repeat;
}
/* #endif */
</style>

<style scoped lang="scss">
/* #ifdef H5 */
page {
  height: 100%;
  background: linear-gradient(180deg, #e95412 0%, rgb(234 85 19 / 0%) 100%) no-repeat;
}
/* #endif */

:deep(.default-layout) {
  @apply pb-13;
}

.main-container {
  @apply flex-y-center;

  flex-direction: column;

  .content {
    @apply flex-y-center w-83.75 min-h-75.5 bg-white mt-6 mb-4 pb-4 border-rd-2;

    flex-direction: column;

    .content-title {
      @apply w-75.75 h-15.5 flex-x-between;

      border-bottom: 1px dashed #ddd;

      .coupon-status {
        @apply w-17 h-7 center color-#E95412 font-size-2.75 border-rd-1 flex-shrink-0;

        background: #fde8df;
      }

      .coupon-status-done {
        @apply w-17 h-7 center color-#999 font-size-2.75 border-rd-1;

        background: #f5f5f5;
      }
    }

    .content-qrcode {
      @apply w-full center;

      flex-direction: column;

      .qrcode-box {
        @apply w-40 h-40 center position-relative mt-5;

        .qrcode {
          @apply w-full h-full;
        }

        .mask {
          @apply w-full h-full pos-absolute left-0 top-0;

          background: rgb(181 181 181 / 50%);
        }

        .hx {
          @apply w-20 h-20 pos-absolute right-4 bottom-4;
        }
      }

      .hx-code {
        @apply px-6 py-2.5 color-#333 center mt-3;

        background: #fef6f2;
      }
    }
  }

  .wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;

    .rule-box {
      @apply w-83.75 bg-white border-rd-2;

      .rule-title {
        @apply w-full h-14 flex-y-center;

        background: url("https://innoai-01.oss-cn-shenzhen.aliyuncs.com/home/activity/rule_title.png")
          center no-repeat;
        background-size: 100% 100%;
      }

      .rule-content {
        @apply px-4 py-4;
      }
    }
  }

  .footer {
    @apply w-full h-13 pos-fixed bottom-0 bg-white center color-#666 font-size-3;

    box-shadow: -1.25rem 0 1.5rem 0 rgb(0 0 0 / 7%);
  }
}
</style>
