<route lang="json5">
{
  style: { navigationBarTitleText: "", enablePullDownRefresh: true },
}
</route>
<template>
  <wd-tabs v-model="activeTab" animated :duration="500" @change="changeTab">
    <block v-for="tab in storeCategoryList" :key="tab._id">
      <wd-tab :title="tab.name">
        <view
          class="expired-button"
          :class="expired ? 'expired-button-active' : ''"
          @click="showExpired"
        >
          <!-- #ifdef MP-WEIXIN -->
          {{
            formatI18n($t("app.home.expiringNumber"), {
              expiringNumber: expiring_number,
            })
          }}
          <!-- #endif -->

          <!-- #ifdef H5 -->
          {{
            $t("app.home.expiringNumber", {
              expiringNumber: expiring_number,
            })
          }}
          <!-- #endif -->
        </view>
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
                <image class="w-30 h-30 flex-shrink-0 border-rd-3" :src="item.image" />
                <div v-if="tab._id !== 1" class="overlay"></div>
              </div>

              <view class="coupon-right">
                <view
                  class="coupon-title ellipsis"
                  :style="{ color: tab._id !== 1 ? '#999' : '#333' }"
                >
                  {{ item.name }}
                </view>
                <view class="use-store" :style="{ color: tab._id !== 1 ? '#999' : '#333' }">
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
                    {{ moment(item.start_time).format("YYYY/MM/DD HH:mm:ss") }}
                  </view>
                  <view>
                    {{ $t("app.home.actEnd") }} :
                    {{ moment(item.end_time).format("YYYY/MM/DD HH:mm:ss") }}
                  </view>
                </view>
                <view
                  v-if="tab._id === 1"
                  class="coupon-bottom"
                  :class="expired ? 'justify-between' : 'justify-end'"
                >
                  <view v-if="expired" class="expired-time">
                    <!-- #ifdef MP-WEIXIN -->
                    {{
                      formatI18n($t("app.home.expireDay"), {
                        days: calculateTimeDifferenceInDays(item.end_time!),
                      })
                    }}
                    <!-- #endif -->

                    <!-- #ifdef H5 -->
                    {{
                      $t("app.home.expireDay", {
                        days: calculateTimeDifferenceInDays(item.end_time!),
                      })
                    }}
                    <!-- #endif -->
                  </view>
                  <view class="coupon-button" @click="toCouponDetail(item._id)">
                    {{ $t("app.home.claimed") }}
                  </view>
                </view>
              </view>
              <status-flag
                v-if="tab._id === 2"
                :text="t('app.home.used')"
                background-image="https://innoai-01.oss-cn-shenzhen.aliyuncs.com/wxmini/coupon/icon_status_gray.png"
                text-size="0.75rem"
                text-color="#999"
                :is-top="false"
              />
              <status-flag
                v-if="tab._id === 3"
                :text="t('app.home.expired')"
                background-image="https://innoai-01.oss-cn-shenzhen.aliyuncs.com/wxmini/coupon/icon_status_gray.png"
                text-size="0.75rem"
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
</template>

<script lang="ts" setup>
import moment from "moment"
import i18n, { formatI18n } from "@/locale/index"
import { useLangStore } from "@/store"
import { getCouponRecordList } from "@/api/coupon"
import { CouponRecordVo, StoreCategoryVo } from "@/api/coupon/types"
import StatusFlag from "@/pages/coupon/components/statusFlag.vue"
import { formatQueryParams } from "@/utils"
import { SelectTypeEnum } from "@/enums/SelectTypeEnum"

const { t } = i18n.global as any

type LoadMoreState = "loading" | "error" | "finished"

const state = ref<LoadMoreState>("finished")

const langStore = useLangStore()

const showContent = ref(true)

const activeTab = ref(0)

const expired = ref(false)

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
  1: t("app.home.receiveNow"),
  2: t("app.home.useNow"),
}

const expiring_number = ref(0)

const dataList = ref<CouponRecordVo[]>([])

// 控制模态框显示的状态
const modalVisible = ref(false)

// 优惠券数据
const couponData = ref<CouponRecordVo>({})

// 显示模态框的函数
const showModal = (data: CouponRecordVo) => {
  modalVisible.value = true
  couponData.value = data
}

/**
 * 券包分类列表
 */
const storeCategoryList = ref<StoreCategoryVo[]>([
  {
    _id: 1,
    name: t("app.home.unused"),
  },
  {
    _id: 2,
    name: t("app.home.used"),
  },
  {
    _id: 3,
    name: t("app.home.expired"),
  },
])

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

/**
 * 获取优惠券列表
 * @param usage_status
 */
const getList = async (usage_status: number | null, expiring?: number) => {
  if (expiring) {
    usage_status = null
  }
  getCouponRecordList(
    formatQueryParams(
      { ...params.value, usage_status, expiring },
      {
        usage_status: SelectTypeEnum.EQ,
        expiring: SelectTypeEnum.EQ,
      },
    ),
  ).then(({ data }) => {
    dataList.value = dataList.value.concat(data.list)
    total.value = data.total
    expiring_number.value = data.expiring_number || 0
  })
}

/**
 * 获取即将失效的券
 */
const showExpired = () => {
  expired.value = !expired.value
  activeTab.value = 0
  params.value.page = 1
  dataList.value = []
  if (expired.value) {
    getList(storeCategoryList.value[activeTab.value]._id, 1)
  } else {
    getList(storeCategoryList.value[activeTab.value]._id)
  }
}

const calculateTimeDifferenceInDays = (end_time: string) => {
  const startTime = Number(new Date())
  const endTime = Number(new Date(end_time))

  // 计算时间差（毫秒）
  const timeDiff = endTime - startTime

  // 将时间差转换为天
  const diffInDays = timeDiff / (1000 * 60 * 60 * 24)

  // 向上取整
  const roundedDiff = Math.ceil(diffInDays)

  return roundedDiff
}

/**
 * 获取优惠券列表
 */
const changeTab = (event: { index: number }) => {
  params.value.page = 1
  dataList.value = []
  getList(storeCategoryList.value[event.index]._id)
  if (event.index !== 0) {
    expired.value = false
  }
}

/**
 * 下拉刷新
 */
onPullDownRefresh(async () => {
  params.value.page = 1
  dataList.value = []
  await getList(storeCategoryList.value[activeTab.value]._id)
  setTimeout(() => {
    uni.stopPullDownRefresh()
  }, 500)
})

/**
 * 上拉加载
 */
onReachBottom(() => {
  const dataLength = params.value.page * params.value.limit
  if (dataLength < total.value) {
    state.value = "loading"
    params.value.page++
    getList(storeCategoryList.value[activeTab.value]._id)
  } else {
    state.value = "finished"
  }
  console.log("onReachBottom", params.value)
})

onLoad(() => {
  getList(storeCategoryList.value[activeTab.value]._id)
})

watch(
  () => langStore.langPackageLoading,
  (value) => {
    if (!value) {
      uni.setNavigationBarTitle({
        title: t("app.home.couponPackage"),
      })
      setTimeout(() => {
        showContent.value = false
      }, 500)
    }
  },
  {
    immediate: true,
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
  @apply h-12;

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

:deep(.default-layout) {
  @apply pb-0;
}

.expired-button {
  @apply px-3 h-6.5 bg-#fff border-rd-11 color-#666 font-size-3 mt-2 ml-5 line-height-6.5;

  display: inline-block;
}

.expired-button-active {
  @apply bg-#FD8049 color-#fff;
}

.main-container {
  @apply px-5 mt-3 pb-5;

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
        @apply flex w-44.75 h-7 ml-3 mt-2.75;

        align-items: flex-end;

        .expired-time {
          @apply px-1.5 h-4.75 bg-#FFEDE5 border-rd-11 color-#F36B2E font-size-2.5 line-height-4.75;

          display: inline-block;
        }

        .coupon-button {
          @apply center w-22 h-7 border-rd-9.5 color-#fff font-size-3.5;

          background: linear-gradient(to right, #ff8650, #e95412);
        }
      }
    }

    .overlay {
      @apply pos-absolute w-full h-full border-rd-4 left-0 top-0 border-rd-3;

      background-color: rgb(128 128 128 / 50%);
    }
  }
}
</style>
