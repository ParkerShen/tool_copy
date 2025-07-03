<route lang="json5">
{
  style: { navigationBarTitleText: "" },
}
</route>
<template>
  <view class="main-container">
    <view class="flex-y-center w-full">
      <!-- 未登录 -->
      <!-- #ifdef H5 -->
      <view class="title" v-if="!isLogin" @click="toLogin">
        <view class="avator-box flex-y-center">
          <wd-skeleton
            :row-col="[{ size: '4rem', type: 'circle' }]"
            theme="avatar"
            :loading="showContent"
          >
            <image
              class="w-16 h-16"
              src="https://innoai-01.oss-cn-shenzhen.aliyuncs.com/home/my/no_login.png"
            />
          </wd-skeleton>

          <wd-skeleton
            :custom-style="{ width: '50%', marginLeft: '12px' }"
            :row-col="[{ width: '100%', height: '1.5rem' }]"
            :loading="showContent"
          >
            <view class="font-size-5 font-bold color-#333 ml-3.25">
              {{ $t("app.home.plaseLogin") }}
            </view>
          </wd-skeleton>
        </view>
      </view>
      <!-- #endif -->
      <!-- #ifdef MP-WEIXIN -->
      <button
        class="title"
        v-if="!isLogin"
        open-type="getPhoneNumber"
        @getphonenumber="getPhoneNumber"
      >
        <view class="avator-box flex-y-center">
          <wd-skeleton
            :row-col="[{ size: '4rem', type: 'circle' }]"
            theme="avatar"
            :loading="showContent"
          >
            <image
              class="w-16 h-16"
              src="https://innoai-01.oss-cn-shenzhen.aliyuncs.com/home/my/no_login.png"
            />
          </wd-skeleton>

          <wd-skeleton
            :custom-style="{ width: '50%', marginLeft: '12px' }"
            :row-col="[{ width: '100%', height: '1.5rem' }]"
            :loading="showContent"
          >
            <view class="flex flex-x-start font-size-5 font-bold color-#333 ml-3.25">
              {{ $t("app.home.plaseLogin") }}
            </view>
          </wd-skeleton>
        </view>
      </button>
      <!-- #endif -->
      <!-- 已经登录 -->
      <view class="title" v-if="isLogin">
        <wd-skeleton
          :row-col="[{ size: '4rem', type: 'circle' }]"
          theme="avatar"
          :loading="showContent"
        >
          <view class="avator-box">
            <image
              class="w-16 h-16"
              :src="
                userInfo.portrait
                  ? userInfo.portrait
                  : 'https://innoai-01.oss-cn-shenzhen.aliyuncs.com/home/my/avator.png'
              "
            />
            <view class="ml-3">
              <view class="w-40 font-size-5 font-bold color-#333 mt-1.75 ellipsis">
                {{ userInfo.nick_name }}
              </view>
              <view class="introduction ellipsis-2">
                {{ userInfo.introduction || $t("app.home.personalIntroduction") }}
              </view>
            </view>
          </view>
        </wd-skeleton>

        <wd-skeleton
          :custom-style="{ width: '50%', marginLeft: '12px' }"
          :row-col="[{ width: '100%', height: '1.5rem' }]"
          :loading="showContent"
        >
          <view class="font-size-3 color-#999 flex-y-center justify-end" @click="toEditData">
            {{ $t("app.home.editData") }}
            <wd-icon class="color-#999 font-size-4.5" name="chevron-right"></wd-icon>
          </view>
        </wd-skeleton>
      </view>
    </view>
    <wd-skeleton
      :custom-style="[{ width: '100%', marginTop: '1.25rem' }]"
      :row-col="grid"
      animation="flashed"
      theme="paragraph"
      :loading="showContent"
    >
      <view class="menu-list">
        <template v-for="item in menuList" :key="item.name">
          <view
            v-if="!item.needLogin || item.needLogin === isLogin"
            class="menu-item"
            @click="navigatorTo(item.path)"
          >
            <view class="center">
              <image class="w-7 h-7 mr-2" :src="item.icon" />
              <text class="font-size-4 color-#333 font-bold">{{ $t(item.name) }}</text>
            </view>
            <wd-icon class="color-#999 font-size-5.5" name="chevron-right"></wd-icon>
          </view>
        </template>
        <!-- <button open-type="getPhoneNumber" @getphonenumber="getPhoneNumber">{{ $t("app.home.getPhoneNumber") }}</button> -->
      </view>
    </wd-skeleton>
  </view>
</template>

<script lang="ts" setup>
import { useLangStore, useUserStore } from "@/store"
import i18n from "@/locale/index"
import { loginWxOrRegApi } from "@/api/user"

const { t } = i18n.global as any

const userStore = useUserStore()

const langStore = useLangStore()

const showContent = ref(true)

const grid = [
  { with: "100%", height: "3.25rem" },
  { with: "100%", height: "3.25rem" },
]

const isLogin = computed(() => userStore.isLogined)

const userInfo = computed(() => userStore.userInfo)

const menuList = [
  {
    name: "app.home.couponBag",
    path: "/pages/my/couponRecord",
    icon: "https://innoai-01.oss-cn-shenzhen.aliyuncs.com/home/my/icon_coupon_bag.png",
    needLogin: true,
  },
  {
    name: "app.home.language",
    path: "/pages/my/language",
    icon: "https://innoai-01.oss-cn-shenzhen.aliyuncs.com/home/my/icon_lang.png",
    needLogin: false,
  },
]

const navigatorTo = (path: string) => {
  uni.navigateTo({ url: path })
}

const toLogin = () => {
  uni.navigateTo({ url: "/pages/login/index" })
}

const toEditData = () => {
  uni.navigateTo({ url: "/pages/person-info/index" })
}

const getPhoneNumber = (e: any) => {
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

onLoad((opt) => {})

onShow(() => {
  // #ifdef MP-WEIXIN
  setTimeout(() => {
    uni.setNavigationBarTitle({
      title: t("app.home.my"),
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
          title: t("app.home.my"),
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
  height: 100%;
  background: #f7f7f7;
}
</style>

<style scoped lang="scss">
.main-container {
  @apply px-5 pt-5;

  .title {
    @apply w-full flex-x-between;

    .avator-box {
      @apply flex-y-center w-full;

      > image {
        border-radius: 50%;
      }

      .introduction {
        @apply w-40 font-size-3.5 color-#999 mt-1;
      }
    }
  }

  .menu-list {
    @apply bg-white mt-6 px-3 py-2 border-rd-2;

    .menu-item {
      @apply h-13 flex-x-between;
    }
  }
}
</style>
