<template>
  <wd-overlay :show="modalVisible">
    <view class="wrapper">
      <view class="modal-box" @click.stop="">
        <view class="modal-title">{{ $t("app.home.useNow") }}</view>
        <view class="coupon-name ellipsis">{{ $t("app.home.todayClaimedTip") }}</view>
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
          <status-flag
            v-if="couponData.join_type === 2"
            :text="t('app.home.claimedToday')"
            background-image="https://innoai-01.oss-cn-shenzhen.aliyuncs.com/wxmini/coupon/icon_status_red.png"
            text-size="0.56rem"
            text-color="#E95412"
          />
          <status-flag
            v-if="couponData.join_type === 3"
            :text="t('app.home.useShop')"
            background-image="https://innoai-01.oss-cn-shenzhen.aliyuncs.com/wxmini/coupon/icon_status_red.png"
            text-size="0.56rem"
            text-color="#E95412"
          />
        </view>
        <view class="coupon-button" @click="toCouponDetail">{{ $t("app.home.claimed") }}</view>
        <view class="coupon-tips">
          {{ $t("app.home.couponToMy") }}
          <text class="color-#F06426" @click="toCouponRecord">
            【{{ $t("app.home.conuponRecord") }}】
          </text>
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
import StatusFlag from "./statusFlag.vue"
import i18n from "@/locale/index"

const { t } = i18n.global as any

interface Props {
  modelValue: boolean
  data: CouponVo
}

const props = defineProps<Props>()

const emit = defineEmits(["update:modelValue"])

const receiveTextMap: Record<number, string> = {
  2: t("app.home.claimedToday"),
  3: t("app.home.useShop"),
}

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
  modalVisible.value = false // 通过计算属性更新值
}

/**
 * 跳转优惠券详情
 * @param id
 */
const toCouponDetail = () => {
  closeModal()
  uni.navigateTo({
    url: `/pages/activity/coupon-detail?id=${couponData.value.coupon_record_id}&back=1`,
  })
}

/**
 * 跳转券包列表
 */
const toCouponRecord = () => {
  uni.navigateTo({
    url: "/pages/my/couponRecord",
  })
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
    @apply w-67.25 h-77.25  flex-y-center px-6;

    flex-direction: column;
    background: url("https://innoai-01.oss-cn-shenzhen.aliyuncs.com/wxmini/coupon/modal_bg.png")
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
      @apply w-57 h-18 flex-y-center px-2 pt-2.25 pb-2.5 mt-4.5 pos-relative;

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

    .coupon-button {
      @apply center w-61 h-10 border-rd-11 color-#fff font-size-4.5  mt-10  font-600;

      background: linear-gradient(to right, #ff8650, #e95412);
    }

    .coupon-tips {
      @apply center font-size-2.75 color-#333 mt-2.75;
    }
  }
}
</style>
