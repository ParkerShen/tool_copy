<route lang="json5" type="home">
{
  style: {
    navigationBarTitleText: "",
    enablePullDownRefresh: true,
  },
}
</route>
<template>
  <wd-tabs
    v-if="storeCategoryList.length > 0"
    v-model="activeTab"
    animated
    :duration="500"
    :slidable-num="3"
    class="is-slide"
  >
    <block v-for="tab in storeCategoryList" :key="tab._id">
      <wd-tab :title="tab.name">
        <view class="main-container">
          <wd-skeleton
            :custom-style="[{ width: '100%' }]"
            :row-col="grid"
            animation="flashed"
            theme="paragraph"
            :loading="showContent"
          >
            <view class="coupon-item" v-for="item in dataList" :key="item._id">
              <div class="w-30 h-30 flex-shrink-0 pos-relative">
                <image class="w-30 h-30 flex-shrink-0 border-rd-3" :src="item.icon" />
                <div v-if="item.residue_number! <= 0" class="overlay"></div>
              </div>

              <view class="coupon-right">
                <view
                  class="coupon-title ellipsis"
                  :style="{ color: item.residue_number! > 0 ? '#333' : '#999' }"
                >
                  {{ item.name }}
                </view>
                <view
                  class="use-store"
                  :style="{ color: item.residue_number! > 0 ? '#333' : '#999' }"
                >
                  <text>{{ $t("app.home.congratulationOnGetting") }}：</text>
                  <view class="use-store-item">
                    <image
                      v-for="logo in item.storeLogos"
                      :key="logo"
                      :src="logo"
                      class="w-3.5 h-3.5 border-rd-50% ml--1.2"
                    />
                    <image
                      v-if="item.storeLogos && item.storeLogos.length >= 4"
                      src="https://innoai-01.oss-cn-shenzhen.aliyuncs.com/wxmini/coupon/icon-more.png"
                      class="w-4 h-4 ml--1.2"
                    />
                  </view>
                </view>
                <view class="coupon-time">
                  <view>
                    {{ $t("app.home.actStart") }} :
                    {{ moment(item.utc_start_time).format("YYYY/MM/DD HH:mm:ss") }}
                  </view>
                  <view>
                    {{ $t("app.home.actEnd") }} :
                    {{ moment(item.utc_end_time).format("YYYY/MM/DD HH:mm:ss") }}
                  </view>
                </view>
                <view v-if="item.residue_number! > 0" class="coupon-bottom">
                  <view class="coupon-quantity">
                    <view class="coupon-quantity-remaining">
                      <!-- #ifdef MP-WEIXIN -->
                      {{
                        formatI18n($t("app.home.remainingNum"), {
                          residue_number: item.residue_number,
                        })
                      }}
                      <!-- #endif -->

                      <!-- #ifdef H5 -->
                      {{
                        $t("app.home.remainingNum", {
                          residue_number: item.residue_number,
                        })
                      }}
                      <!-- #endif -->
                    </view>
                    <view class="coupon-quantity-total">
                      <!-- #ifdef MP-WEIXIN -->
                      {{
                        formatI18n($t("app.home.total"), {
                          total: item.total,
                        })
                      }}
                      <!-- #endif -->

                      <!-- #ifdef H5 -->
                      {{
                        $t("app.home.total", {
                          total: item.total,
                        })
                      }}
                      <!-- #endif -->
                    </view>
                  </view>
                  <!-- #ifdef H5 -->
                  <view class="coupon-button" @click="throttleClick(item)">
                    {{
                      item.receive_status === 1
                        ? t("app.home.authorizationSucceeded")
                        : t("app.home.claimed")
                    }}
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
                  <view v-else class="coupon-button" @click="throttleClick(item)">
                    {{
                      item.receive_status === 1
                        ? t("app.home.authorizationSucceeded")
                        : t("app.home.claimed")
                    }}
                  </view>
                  <!-- #endif -->
                </view>
                <view v-else class="coupon-receive-all">
                  <text class="ml-2">
                    <!-- #ifdef MP-WEIXIN -->
                    {{
                      formatI18n($t("app.home.claimedAll"), {
                        total: item.total,
                      })
                    }}
                    <!-- #endif -->

                    <!-- #ifdef H5 -->
                    {{
                      $t("app.home.claimedAll", {
                        total: item.total,
                      })
                    }}
                    <!-- #endif -->
                  </text>
                </view>
              </view>

              <status-flag
                v-if="item.residue_number! > 0 && item.receive_status === 2"
                :text="t('app.home.claimedToday')"
                background-image="https://innoai-01.oss-cn-shenzhen.aliyuncs.com/wxmini/coupon/icon_status_red.png"
                text-size="0.56rem"
                text-color="#E95412"
              />

              <status-flag
                v-if="item.residue_number! > 0 && item.receive_status === 3"
                :text="t('app.home.useShop')"
                background-image="https://innoai-01.oss-cn-shenzhen.aliyuncs.com/wxmini/coupon/icon_status_red.png"
                text-size="0.56rem"
                text-color="#E95412"
              />

              <status-flag
                v-if="item.residue_number === 0"
                :text="t('app.home.claimSucceeded')"
                background-image="https://innoai-01.oss-cn-shenzhen.aliyuncs.com/wxmini/coupon/icon_status_gray.png"
                text-size="0.56rem"
                text-color="#999"
                :is-top="false"
              />
            </view>
          </wd-skeleton>
          <wd-status-tip
            v-if="dataList.length === 0"
            image="content"
            :tip="t('app.global.noContent')"
          />
        </view>
      </wd-tab>
    </block>
  </wd-tabs>
  <wd-status-tip v-else image="content" :tip="t('app.global.noContent')" />
  <modal-receive-now v-model="receiveNowVisible" :data="couponData" @receive-click="receiveClick" />
  <modal-received v-model="receivedVisible" :data="couponData" />
  <modal-receive-all v-model="receiveAllVisible" @refresh="handleRefresh" />
</template>

<script lang="ts" setup>
import { formatQueryParams, throttle } from "@/utils"
import moment from "moment"
import { useLangStore, useUserStore, useCouponStore } from "@/store"
import { getCouponDetail, getCouponList, getStoreCategoryList, receiveCoupon } from "@/api/coupon"
import { CouponVo, StoreCategoryVo } from "@/api/coupon/types"
import StatusFlag from "./components/statusFlag.vue"
import ModalReceiveNow from "./components/modalReceiveNow.vue"
import ModalReceived from "./components/modalReceived.vue"
import ModalReceiveAll from "./components/modalReceiveAll.vue"
import { SelectTypeEnum } from "@/enums/SelectTypeEnum"
import { loginWxOrRegApi } from "@/api/user"
import i18n, { formatI18n } from "@/locale/index"

const { t } = i18n.global as any

type LoadMoreState = "loading" | "error" | "finished"

const couponStore = useCouponStore()

const userStore = useUserStore()

const isLogin = computed(() => userStore.isLogined)

const state = ref<LoadMoreState>("finished")

const langStore = useLangStore()

const lang = ref("")

const showContent = ref(true)

const activeTab = ref(0)

const grid = [
  { with: "100%", height: "6.75rem" },
  { with: "100%", height: "6.75rem" },
  { with: "100%", height: "6.75rem" },
  { with: "100%", height: "6.75rem" },
  { with: "100%", height: "6.75rem" },
]

const params = ref({
  page: 1,
  limit: 10,
})

const total = ref(1)

const receiveStatusMap: Record<number, string> = {
  1: t("app.home.authorizationSucceeded"),
  2: t("app.home.claimed"),
  3: t("app.home.claimed"),
}

const receiveTextMap: Record<number, string> = {
  2: t("app.home.claimedToday"),
  3: t("app.home.useShop"),
}

const dataList = ref<CouponVo[]>([])

// 立即领取模态框显隐状态
const receiveNowVisible = ref(false)

// 已经领取模态框显隐状态
const receivedVisible = ref(false)

// 已领完模态框显隐状态
const receiveAllVisible = ref(false)

// 优惠券数据
const couponData = ref<CouponVo>({})

// 设备序列号
const device_name = ref("")

/**
 * 获取店铺一级分类
 */
const storeCategoryList = ref<StoreCategoryVo[]>([])
const getStoreCategory = () => {
  getStoreCategoryList().then(({ data }) => {
    storeCategoryList.value = data
    if (data.length > 0) {
      dataList.value = []
      params.value.page = 1
      getList(storeCategoryList.value[activeTab.value]._id || data[0]._id)
    }
  })
}

/**
 * 跳转优惠券详情
 * @param url
 * @param id
 */
const toCouponDetail = (id: string) => {
  uni.navigateTo({
    url: `/pages/activity/coupon-detail?id=${id}&back=1`,
  })
}

const getList = async (category_id: string) => {
  getCouponList(
    formatQueryParams(
      { ...params.value, category_id },
      {
        category_id: SelectTypeEnum.EQ,
      },
    ),
  ).then(({ data }) => {
    total.value = data.total
    dataList.value = dataList.value.concat(data.list)
  })
}

/**
 * 领完弹窗关闭刷新页面
 */
const handleRefresh = () => {
  dataList.value = []
  params.value.page = 1
  getList(storeCategoryList.value[activeTab.value]._id)
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

/**
 * 优惠券-立即领取
 * @param data
 * @param device_name
 */
const receiveNow = (vo: CouponVo, device_name?: string, navToDetail?: boolean) => {
  if (vo.receive_status !== 1 && vo.coupon_record_id) {
    toCouponDetail(vo.coupon_record_id)
    return
  }
  const params: { coupon_id: string; device_name?: string } = { coupon_id: "" }
  params.coupon_id = vo._id
  if (device_name) {
    params.device_name = device_name
  }
  const index = dataList.value.findIndex((item) => item._id === vo._id)
  receiveCoupon(params).then(async ({ data, code }) => {
    if (code === 0) {
      uni.showToast({
        title: t("app.home.remaining"),
        icon: "success",
        duration: 1500,
      })
      if (index === 0 || index) {
        dataList.value[index].residue_number = dataList.value[index].residue_number! - 1
        dataList.value[index].receive_status = dataList.value[index].join_type
        dataList.value[index].coupon_record_id = data._id as string
      }
      if (navToDetail) {
        setTimeout(() => {
          toCouponDetail(data._id)
          receiveNowVisible.value = false
        }, 1000)
      }
    } else {
      // 80711008：优惠券已领完 80711009：已领取 80711010：今日已领取
      receiveAllVisible.value = false
      receiveNowVisible.value = false
      receivedVisible.value = false
      if (code === 80711008) {
        receiveAllVisible.value = true
      } else if ([80711009, 80711010].includes(code)) {
        await getCouponInfo(vo._id)
        couponData.value.coupon_record_id = data as string
        receivedVisible.value = true
      }
    }
  })
}

/**
 * 弹窗-立即领取点击
 * @param data
 */
const receiveClick = (data: CouponVo) => {
  receiveNow(data, device_name.value, true)
}

/**
 * 获取优惠券详情
 * @param id
 */
const getCouponInfo = async (id: string) => {
  await getCouponDetail(id).then(({ data }) => {
    couponData.value = data
  })
}

/** 领取按钮防抖 */
const throttleClick = throttle(receiveNow, 2000)

onPullDownRefresh(async () => {
  params.value.page = 1
  dataList.value = []
  await getList(storeCategoryList.value[activeTab.value]._id)
  setTimeout(() => {
    uni.stopPullDownRefresh()
  }, 500)
})

onReachBottom(() => {
  const dataLength = params.value.page * params.value.limit
  if (dataLength < total.value) {
    state.value = "loading"
    params.value.page++
    getList(storeCategoryList.value[activeTab.value]._id)
  } else {
    state.value = "finished"
  }
})

onLoad(async (opt) => {
  let couponId = ""
  // #ifdef H5
  if (opt && opt.coupon_id) {
    couponId = opt.coupon_id
  }

  if (opt && opt.device_name) {
    device_name.value = opt.device_name
  }
  getStoreCategory()
  // #endif

  // #ifdef MP-WEIXIN
  if (couponStore.couponQrCodeInfo.coupon_id) {
    couponId = couponStore.couponQrCodeInfo.coupon_id
  }

  if (couponStore.couponQrCodeInfo.device_name) {
    device_name.value = couponStore.couponQrCodeInfo.device_name
  }
  // #endif

  if (couponId) {
    await getCouponInfo(couponId)
    setTimeout(() => {
      receiveNowVisible.value = true
    }, 800)
  }
})

onShow(() => {
  // #ifdef MP-WEIXIN
  setTimeout(() => {
    uni.setNavigationBarTitle({
      title: t("app.home.youHaveClaimed"),
    })
    // uni.setTabBarItem({
    //   index: 0,
    //   text: t("app.home.activity"),
    // })
    uni.setTabBarItem({
      index: 0,
      text: t("app.home.youHaveClaimed"),
    })
    uni.setTabBarItem({
      index: 1,
      text: t("app.home.my"),
    })
  }, 300)
  if (lang.value !== langStore.lang) {
    getStoreCategory()
    lang.value = langStore.lang
  }
  // #endif
})

watch(
  () => langStore.langPackageLoading,
  (value) => {
    if (!value) {
      setTimeout(() => {
        uni.setNavigationBarTitle({
          title: t("app.home.youHaveClaimed"),
        })
        // uni.setTabBarItem({
        //   index: 0,
        //   text: t("app.home.activity"),
        // })
        uni.setTabBarItem({
          index: 0,
          text: t("app.home.youHaveClaimed"),
        })
        uni.setTabBarItem({
          index: 1,
          text: t("app.home.my"),
        })
        showContent.value = false
      }, 1000)
    }
  },
  {
    immediate: true,
  },
)

watch(
  () => activeTab.value,
  (value) => {
    params.value.page = 1
    dataList.value = []
    getList(storeCategoryList.value[value]._id)
  },
)
</script>

<style>
page {
  @apply pb-10;

  height: 100%;
  background-color: #f7f7f7;
}
</style>

<style scoped lang="scss">
:deep(.wd-tabs) {
  background: none !important;
}

:deep(.wd-tabs__nav) {
  @apply h-12 top-0 left-0;

  position: fixed !important;
  z-index: 99;

  .uni-scroll-view-content {
    @apply flex-y-center;
  }

  .wd-tabs__nav-item {
    @apply color-#666 font-size-3.5;

    flex: 0 0 auto;
    padding: 0 17px;
  }

  .wd-tabs__nav-item.is-active {
    @apply color-#FD7135 font-size-4 font-bold;
  }

  .wd-tabs__line {
    @apply bottom--3;

    width: 1.25rem !important;
    height: 1.25rem !important;
    background: url("https://innoai-01.oss-cn-shenzhen.aliyuncs.com/wxmini/coupon/icon-active.png")
      no-repeat center;
    background-size: 100% 100%;
  }
}

:deep(.wd-overlay) {
  z-index: 100 !important;
}

.main-container {
  @apply px-5 mt-18 pb-5;
  /* #ifdef MP-WEIXIN */
  margin-top: 4.5rem;
  /* #endif */

  .coupon-item {
    @apply bg-white w-77.75 h-30 mb-4 flex-y-center px-3 py-3 border-rd-4 pos-relative;

    .coupon-right {
      @apply pos-relative h-full;

      .coupon-title {
        @apply w-46 font-size-4 font-bold ml-3;
      }

      .use-store {
        @apply flex-y-center font-size-3 ml-3 font-500 mt-1;

        .use-store-item {
          @apply flex-x-center ml-1.2 mt-0.5;
        }
      }

      .coupon-time {
        @apply flex font-size-2.5 color-#999 ml-3 mt-1.5;

        flex-direction: column;
      }

      .coupon-bottom {
        @apply flex-y-center justify-between w-44.75 h-8 border-rd-11 ml-3 mt-2.75;

        background: linear-gradient(to right, rgb(255 241 235 / 100%), rgb(255 241 235 / 10%));

        .coupon-quantity {
          @apply ml-2.25;

          .coupon-quantity-remaining {
            @apply font-size-2.5 color-#FD7135 font-600;
          }

          .coupon-quantity-total {
            @apply font-size-2.25 color-#999;
          }
        }

        .coupon-button {
          @apply center w-20 h-8 border-rd-9.5 color-#fff font-size-3.5;

          padding: 0;
          background: linear-gradient(to right, #ff8650, #e95412);
        }
      }

      .coupon-receive-all {
        @apply flex-y-center justify-between w-44.75 h-8 border-rd-11 bg-#F5F5F5 ml-3 mt-2.75 color-#999 font-size-2.5;
      }
    }

    .overlay {
      @apply pos-absolute w-full h-full border-rd-4 left-0 top-0 border-rd-3;

      background-color: rgb(128 128 128 / 50%);
    }
  }
}
</style>
