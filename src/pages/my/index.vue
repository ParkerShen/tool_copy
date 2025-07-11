<route lang="json5">
{
  style: { navigationBarTitleText: "" },
}
</route>
<template>
  <view class="main-container">这是我的页面</view>
  <!-- <custom-tabbar :activeIndex="activeTab" @tabChange="handleTabChange" /> -->
</template>

<script lang="ts" setup>
import { useLangStore, useUserStore } from "@/store"
import i18n from "@/locale/index"
import { loginWxOrRegApi } from "@/api/user"

const { t } = i18n.global as any

const activeTab = ref(1)
const handleTabChange = (index) => {
  console.log("🚀 ~ handleTabChange ~ index:", index)
  activeTab.value = index
}

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
  background: #ffffff;
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
