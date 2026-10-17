<route lang="json5" type="page">
{
  style: {
    navigationBarTitleText: "",
    enablePullDownRefresh: true,
  },
}
</route>
<template>
  <view class="main-container">
    <view
      class="activity-item"
      v-for="item in dataList"
      :key="item._id"
      @click="toActDetail(item._id)"
    >
      <image class="w-27 h-27 flex-shrink-0" :src="item.image" />
      <view class="activity-right">
        <view class="activity-title">
          <view
            class="ellipsis-2 w-42 color-#333"
            :class="{ 'color-#999': item.usage_status === 2 }"
          >
            {{ item.name }}
          </view>
        </view>
        <view class="activity-time color-#666" :class="{ 'color-#999': item.usage_status === 2 }">
          <view>
            {{ $t("app.home.startTime") }}:{{
              moment(item.start_time).format("YYYY-MM-DD HH:mm:ss")
            }}
          </view>
          <view>
            {{ $t("app.home.endTime") }}:{{ moment(item.end_time).format("YYYY-MM-DD HH:mm:ss") }}
          </view>
        </view>
      </view>
      <image
        v-if="item.usage_status === 2"
        class="icon-used"
        src="https://innoai-01.oss-cn-shenzhen.aliyuncs.com/home/my/icon_used.png"
      />
    </view>
    <wd-status-tip v-if="dataList.length === 0" image="content" :tip="t('app.global.noContent')" />
  </view>
</template>

<script lang="ts" setup>
import { getCouponRecordList } from "@/api/coupon"
import { CouponRecordVo } from "@/api/coupon/types"
import moment from "moment"
import i18n from "@/locale/index"

const { t } = i18n.global as any

type LoadMoreState = "loading" | "error" | "finished"

const state = ref<LoadMoreState>("finished")

const params = ref({
  page: 1,
  limit: 10,
})

const total = ref(1)

const dataList = ref<CouponRecordVo[]>([])

const toActDetail = (id: number) => {
  uni.navigateTo({
    url: `/pages/activity/coupon-detail?id=${id}&back=1`,
  })
}

const getList = () => {
  getCouponRecordList(params.value).then(({ data }) => {
    total.value = data.total
    dataList.value = dataList.value.concat(data.list)
  })
}

onPullDownRefresh(async () => {
  params.value.page = 1
  dataList.value = []
  await getList()
  uni.stopPullDownRefresh()
})

onReachBottom(() => {
  const dataLength = params.value.page * params.value.limit
  if (dataLength < total.value) {
    state.value = "loading"
    params.value.page++
    getList()
  } else {
    state.value = "finished"
  }
})

onLoad(() => {
  getList()
})

onReady(() => {
  uni.setNavigationBarTitle({
    title: t("app.home.couponPackage"),
  })
})
</script>
<style>
page {
  height: 100%;
  background: #f7f7f7;
}
</style>

<style scoped lang="scss">
:deep(.default-layout) {
  @apply pb-0;
}

.main-container {
  @apply px-5 mt-6 pb-5;

  .activity-item {
    @apply bg-white h-27 mb-4 flex-y-center pl-3 pr-4 pt-3 pb-3 border-rd-2 pos-relative;

    .activity-right {
      @apply pos-relative h-full;

      .activity-title {
        @apply flex font-size-4.5 color-#333 font-bold ml-3;
      }

      .activity-time {
        @apply w-full pos-absolute flex font-size-3 ml-3 top-15.75 line-height-6;

        flex-direction: column;
      }
    }

    .icon-used {
      @apply w-16 h-16 pos-absolute top-3 right-3;
    }
  }
}
</style>
