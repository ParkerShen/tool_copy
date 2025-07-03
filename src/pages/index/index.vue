<!-- 使用 type="home" 属性设置首页，其他页面不需要设置，默认为page；推荐使用json5，更强大，且允许注释 -->
<!-- <route lang="json5">
{
  style: {
    navigationBarTitleText: "",
    enablePullDownRefresh: true,
  },
}
</route> -->
<template>
  <view class="main-container">
    <wd-skeleton
      :custom-style="[{ width: '100%', marginTop: '50px' }]"
      :row-col="grid"
      animation="flashed"
      theme="paragraph"
      :loading="showContent"
    >
      <view
        class="activity-item"
        v-for="item in dataList"
        :key="item._id"
        @click="toActDetail(item.url!, item._id)"
      >
        <image class="w-27 h-27 flex-shrink-0" :src="item.image" />
        <view class="activity-right">
          <view class="activity-title">
            <view class="ellipsis-2 w-42 color-#333">{{ item.name }}</view>
            <image
              class="w-4 h-4 mt-1 ml-1"
              src="https://innoai-01.oss-cn-shenzhen.aliyuncs.com/home/activity/to_right.png"
            />
          </view>
          <view class="activity-time">
            <view>
              {{ $t("app.home.startTime") }} :
              {{ moment(item.start_time).format("YYYY-MM-DD HH:mm:ss") }}
            </view>
            <view>
              {{ $t("app.home.endTime") }} :
              {{ moment(item.end_time).format("YYYY-MM-DD HH:mm:ss") }}
            </view>
          </view>
        </view>
      </view>
    </wd-skeleton>
    <wd-status-tip v-if="dataList.length === 0" image="content" :tip="t('app.global.noContent')" />
    <!-- <wd-loadmore :state="state" @reload="getList" /> -->
  </view>
</template>

<script lang="ts" setup>
import { getActivityList } from "@/api/activity"
import { ActivityVo } from "@/api/activity/types"
import moment from "moment"
import i18n from "@/locale/index"
import { useLangStore } from "@/store"

const { t } = i18n.global as any

type LoadMoreState = "loading" | "error" | "finished"

const state = ref<LoadMoreState>("finished")

const langStore = useLangStore()

const showContent = ref(true)

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

const dataList = ref<ActivityVo[]>([])

const toActDetail = (url: string, id: number) => {
  uni.navigateTo({
    url: `${url}?id=${id}&back=1`,
  })
}

const getList = async () => {
  getActivityList(params.value).then(({ data }) => {
    total.value = data.total
    dataList.value = dataList.value.concat(data.list)
  })
}

onPullDownRefresh(async () => {
  params.value.page = 1
  dataList.value = []
  await getList()
  setTimeout(() => {
    uni.stopPullDownRefresh()
  }, 500)
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
  console.log("onReachBottom", params.value)
})

onLoad(() => {
  getList()
})

onShow(() => {
  // #ifdef MP-WEIXIN
  setTimeout(() => {
    uni.setNavigationBarTitle({
      title: t("app.home.activity"),
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
  // #endif
})

watch(
  () => langStore.langPackageLoading,
  (value) => {
    if (!value) {
      setTimeout(() => {
        uni.setNavigationBarTitle({
          title: t("app.home.activity"),
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
.main-container {
  @apply px-5 mt-6 pb-5;

  .activity-item {
    @apply bg-white h-27 mb-4 flex-y-center pl-3 pr-4 pt-3 pb-3 border-rd-2;

    .activity-right {
      @apply pos-relative h-full;

      .activity-title {
        @apply flex font-size-4.5 color-#333 font-bold ml-3;
      }

      .activity-time {
        @apply pos-absolute flex font-size-3 color-#666 ml-3 top-15.75 line-height-6;

        flex-direction: column;
      }
    }
  }
}
</style>
