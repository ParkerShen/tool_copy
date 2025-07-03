<!--
 * @Author: huangweiqiang
 * @Date: 2024-08-02 09:02:35
 * @LastEditors: huangweiqiang
 * @LastEditTime: 2024-09-10 11:25:15
 * @Description: 立即领取弹窗
-->
<template>
  <wd-overlay :show="modalVisible">
    <view class="wrapper">
      <view class="modal-box" @click.stop="">
        <view class="modal-title">{{ $t("app.home.claimNow") }}</view>
        <view class="coupon-name ellipsis">{{ couponData.name }}</view>

        <view class="coupon-info">
          <image class="w-18 h-18 flex-shrink-0" :src="couponData.icon" />

          <view class="coupon-right">
            <view class="use-store">
              <text>{{ $t("app.home.congratulationOnGetting") }}：</text>
              <view class="use-store-item">
                <image
                  v-for="logo in couponData.storeLogos"
                  :key="logo"
                  :src="logo"
                  class="w-3.98 h-3.98 border-rd-50% ml--1.2"
                />
                <image
                  v-if="couponData.storeLogos && couponData.storeLogos.length >= 4"
                  src="https://innoai-01.oss-cn-shenzhen.aliyuncs.com/wxmini/coupon/icon-more.png"
                  class="w-4.5 h-4.5 ml--1.2"
                />
              </view>
            </view>
            <view class="coupon-time">
              <view>
                {{ $t("app.home.actStart") }}:
                {{ moment(couponData.utc_start_time).format("YYYY/MM/DD HH:mm") }}
              </view>
              <view>
                {{ $t("app.home.actEnd") }}:
                {{ moment(couponData.utc_end_time).format("YYYY/MM/DD HH:mm") }}
              </view>
            </view>
          </view>
        </view>

        <view class="coupon-bottom">
          <view class="coupon-quantity">
            <view class="coupon-quantity-remaining">
              <!-- #ifdef MP-WEIXIN -->
              {{
                formatI18n($t("app.home.remainingNum"), {
                  residue_number: couponData.total! - couponData.receive_total!,
                })
              }}
              <!-- #endif -->

              <!-- #ifdef H5 -->
              {{
                $t("app.home.remainingNum", {
                  residue_number: couponData.total! - couponData.receive_total!,
                })
              }}
              <!-- #endif -->
            </view>
            <view class="coupon-quantity-total">
              <!-- #ifdef MP-WEIXIN -->
              {{
                formatI18n($t("app.home.total"), {
                  total: couponData.total,
                })
              }}
              <!-- #endif -->

              <!-- #ifdef H5 -->
              {{
                $t("app.home.total", {
                  total: couponData.total,
                })
              }}
              <!-- #endif -->
            </view>
          </view>
          <!-- #ifdef H5 -->
          <view class="coupon-button" @click="receive">
            {{ $t("app.home.authorizationSucceeded") }}
          </view>
          <!-- #endif -->
          <!-- #ifdef MP-WEIXIN -->
          <button
            v-if="!isLogin"
            class="coupon-button"
            block
            open-type="getPhoneNumber"
            @getphonenumber="getPhoneNumber"
          >
            {{ $t("app.home.authorizationSucceeded") }}
          </button>
          <view v-else class="coupon-button" @click="receive">
            {{ $t("app.home.authorizationSucceeded") }}
          </view>
          <!-- #endif -->
        </view>
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
import { CouponVo } from "@/api/coupon/types"
import { computed, defineProps, defineEmits } from "vue"
import moment from "moment"
import { useUserStore } from "@/store"
import { loginWxOrRegApi } from "@/api/user"
import i18n, { formatI18n } from "@/locale/index"

const { t } = i18n.global as any

interface Props {
  modelValue: boolean
  data: CouponVo
}

const props = defineProps<Props>()

const emit = defineEmits(["update:modelValue", "receiveClick"])

const userStore = useUserStore()

const isLogin = computed(() => userStore.isLogined)

const modalVisible = computed({
  get: () => props.modelValue,
  set: (val) => emit("update:modelValue", val),
})

const couponData = computed(
  () =>
    props.data || {
      _id: "",
      icon: "",
      name: "",
      receive_status: 0,
      receive_total: 0,
      residue_number: 0,
      storeLogos: [],
      total: 0,
      use_scope_type: 0,
      use_total: 0,
      utc_end_time: "",
      utc_start_time: "",
    },
)

// 关闭模态框的函数
const closeModal = () => {
  modalVisible.value = false
}

/** 授权手机号登录 */
const getPhoneNumber = (e: { detail: { code: string } }) => {
  if (e.detail.code) {
    loginWxOrRegApi({ wx_mini_id: 1, openid: userStore.openId, phone_code: e.detail.code }).then(
      ({ data }) => {
        uni.showToast({
          title: t("app.home.authorizationSuccessful"),
          icon: "success",
          duration: 2000,
        })
        setTimeout(() => {
          if (data.token) {
            userStore.setToken(data.token)
          }
        }, 1000)
      },
    )
  } else {
    uni.showToast({
      title: t("app.home.getPhoneNumberFailed"),
      icon: "error",
      duration: 2000,
    })
  }
}

/** 立即领取 */
const receive = () => {
  emit("receiveClick", couponData.value)
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
    background: url("https://innoai-01.oss-cn-shenzhen.aliyuncs.com/wxmini/coupon/modal_bg_receive.png")
      no-repeat center;
    background-size: 100% 100%;

    .modal-title {
      @apply w-full flex-x-center color-#ED5C1C font-size-5 font-bold mt-4;
    }

    .coupon-name {
      @apply w-full color-#333333 font-size-5 font-bold;

      text-align: center;
    }

    .coupon-info {
      @apply w-57 h-18 flex-y-center px-2 pt-2.25 pb-2.5 mt-4.5;

      background: url("https://innoai-01.oss-cn-shenzhen.aliyuncs.com/wxmini/coupon/use_store_bg.png")
        no-repeat center;
      background-size: 100% 100%;

      .coupon-right {
        @apply pos-relative h-full;

        .coupon-title {
          @apply w-46 flex font-size-4 font-bold ml-1.75;
        }

        .use-store {
          @apply flex-y-center font-size-3.98 ml-1.75 font-500 color-#333;

          .use-store-item {
            @apply flex-x-center ml-1.2 mt-0.5;
          }
        }

        .coupon-time {
          @apply flex font-size-2.84 color-#999 ml-1.75 mt-3.75;

          flex-direction: column;
        }
      }

      .overlay {
        @apply pos-absolute w-full h-full border-rd-4 left-0 top-0 border-rd-3;

        background-color: rgb(128 128 128 / 50%);
      }
    }

    .coupon-bottom {
      @apply flex-y-center justify-between w-61 h-10 border-rd-11 mt-10;

      background: linear-gradient(to right, rgb(255 241 235 / 100%), rgb(255 241 235 / 10%));

      .coupon-quantity {
        @apply ml-4;

        .coupon-quantity-remaining {
          @apply font-size-3.5 color-#FD7135 font-600;
        }

        .coupon-quantity-total {
          @apply font-size-2.5 color-#999;
        }
      }

      .coupon-button {
        @apply center w-30 h-10 border-rd-9.5 color-#fff font-size-4.5 font-600;

        padding: 0;
        background: linear-gradient(to right, #ff8650, #e95412);
      }
    }
  }
}
</style>
