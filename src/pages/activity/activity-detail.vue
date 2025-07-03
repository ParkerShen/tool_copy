<route lang="json5" type="page">
{
  style: { navigationBarTitleText: "" },
}
</route>
<template>
  <view class="main-container">
    <view class="content" :class="backType === '1' ? 'pb-22' : 'pb-27'">
      <view class="rule-btn" @click="ruleVisible = true">{{ $t("app.home.activityRules") }}</view>
      <image :src="activityInfo.background_image" mode="widthFix" />
    </view>
    <wd-overlay :show="ruleVisible" @click="ruleVisible = false">
      <view class="wrapper">
        <view class="rule-box" @click.stop="">
          <view class="rule-title">
            <text class="ml-4 font-bold font-size-5 color-#E95412">
              {{ $t("app.home.activityRules") }}
            </text>
          </view>
          <scroll-view scroll-y :show-scrollbar="false" class="rule-content">
            <!-- eslint-disable-next-line vue/no-v-text-v-html-on-component -->
            <view v-html="activityInfo.rule" />
          </scroll-view>
        </view>
      </view>
    </wd-overlay>

    <wd-overlay :show="toastVisible">
      <view class="wrapper">
        <view class="toast-box" @click.stop="">
          <view class="toast-title">{{ $t("app.home.activityParticipationFailed") }}</view>
          <image
            class="w-18 h-18 mt-6 mb-5"
            src="https://innoai-01.oss-cn-shenzhen.aliyuncs.com/home/activity/icon_fail.png"
          />
          <text class="font-size-3.5 color-#999">{{ errMsg }}</text>
        </view>
        <image
          class="w-7 h-7 mt-4"
          src="https://innoai-01.oss-cn-shenzhen.aliyuncs.com/home/activity/icon_close.png"
          @click="toastVisible = false"
        />
      </view>
    </wd-overlay>
  </view>

  <view class="footer">
    <!-- #ifdef H5 -->
    <button class="submit-btn" block @click="joinAct">
      {{ $t("app.home.participateInActivity") }}
    </button>
    <!-- #endif -->
    <!-- #ifdef MP-WEIXIN -->
    <button
      v-if="!isLogin"
      class="submit-btn"
      block
      open-type="getPhoneNumber"
      @getphonenumber="getPhoneNumber"
    >
      {{ $t("app.home.participateInActivity") }}
    </button>
    <button v-else class="submit-btn" block @click="joinAct">
      {{ $t("app.home.participateInActivity") }}
    </button>
    <!-- #endif -->
    <!-- #ifdef H5 -->
    <view class="font-size-3 color-#666 mt-2.5" v-if="backType === '2'" @click="goBack">
      {{ $t("app.global.back") }}
    </view>
    <!-- #endif -->
  </view>
</template>

<script lang="ts" setup>
import { getActivityDetail, joinActivity } from "@/api/activity"
import { ActivityVo } from "@/api/activity/types"
import { loginWxOrRegApi } from "@/api/user"
import i18n from "@/locale/index"
import { useUserStore } from "@/store"

const { t } = i18n.global as any

const userStore = useUserStore()

const isLogin = computed(() => userStore.isLogined)

const ruleVisible = ref(false)

const toastVisible = ref(false)

const actId = ref("")

const errMsg = ref("")

const backType = ref("2")

const activityInfo = ref<ActivityVo>({})

const getActivityInfo = (id: string) => {
  getActivityDetail(id).then(({ data }) => {
    activityInfo.value = data
    if (data.name) {
      uni.setNavigationBarTitle({
        title: data.name,
      })
    }
  })
}

const getPhoneNumber = (e: { detail: { code: string } }) => {
  if (e.detail.code) {
    loginWxOrRegApi({ wx_mini_id: 1, openid: userStore.openId, phone_code: e.detail.code }).then(
      ({ data }) => {
        uni.showToast({
          title: "授权成功",
          icon: "success",
          duration: 2000,
        })
        setTimeout(() => {
          userStore.setToken(data.token || "")
        }, 1000)
      },
    )
  } else {
    uni.showToast({
      title: "获取手机号失败",
      icon: "error",
      duration: 2000,
    })
  }
}

const joinAct = () => {
  joinActivity(actId.value)
    .then(({ data }) => {
      uni.showToast({
        icon: "success",
        duration: 1000,
        position: "top",
        title: t("app.home.participationSuccessful"),
        success: () => {
          setTimeout(() => {
            uni.redirectTo({
              url: `/pages/activity/coupon-detail?id=${data}&back=${backType.value}`,
            })
          }, 1000)
        },
      })
    })
    .catch((err) => {
      errMsg.value = err.desc
      toastVisible.value = true
    })
}

const goBack = () => {
  uni.reLaunch({
    url: "/pages/index/index",
  })
}

onLoad((opt) => {
  if (opt && opt.id) {
    actId.value = opt.id
    getActivityInfo(opt.id)
  }

  if (opt && opt.back) {
    backType.value = opt.back
  }
})
</script>

<style>
page {
  height: 100%;
  background: #fff;
}
</style>

<style scoped lang="scss">
page {
  height: 100%;
  background: #fff;
}

:deep(.default-layout) {
  @apply pb-0;
}

.content {
  @apply w-full;

  overflow-y: scroll;
  text-align: center;

  .rule-btn {
    @apply bg-white min-w-13 h-7 center font-size-3 color-#666 position-fixed top-11 right-0 px-2;

    z-index: 9;
    border-radius: 1.5rem 0 0 1.5rem;
  }

  > image {
    width: 100%;
  }
}

.footer {
  @apply bg-white position-fixed left-0 bottom-0 center w-full py-4 flex-y-center;

  z-index: 9999;
  flex-direction: column;
}

.wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;

  .rule-box {
    @apply w-83.75 h-93.5 bg-white border-rd-2;

    .rule-title {
      @apply w-full h-14 flex-y-center;

      background: url("https://innoai-01.oss-cn-shenzhen.aliyuncs.com/home/activity/rule_title.png")
        center no-repeat;
      background-size: 100% 100%;
    }

    .rule-content {
      @apply w-75.75 px-4 py-4 h-70;
    }
  }

  .toast-box {
    @apply w-77.75 bg-white border-rd-2 flex-y-center pb-6;

    flex-direction: column;

    .toast-title {
      @apply w-full flex-x-center color-#E95412 font-size-5 font-bold mt-6;
    }

    .rule-content {
      @apply w-75.75 px-4 py-4 h-70;
    }
  }
}

.submit-btn {
  @apply w-83.5 h-12 center font-size-4 color-#fff;

  font-weight: bold;
  background: linear-gradient(92deg, #ff8650 0%, #e95412 100%) !important;
  border-radius: 4px;
}
</style>
