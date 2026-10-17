<script setup lang="ts">
import { onLaunch, onShow, onHide } from "@dcloudio/uni-app"
import { getLanguagePackage, getVisitorLanguageIndexList } from "./api/lang"
import { useLangStore, useUserStore } from "@/store"
import { getCaptchaConfig, loginWxApi } from "./api/user"
import i18n from "@/locale/index"
import { getH5UserPosition } from "./utils/chinaBounds"

const langStore = useLangStore()

const userStore = useUserStore()

const langMap: Record<string, string> = {
  zh_CN: "zh-Hans",
  zh_HK: "zh-Hant",
  en_US: "en",
  th_TH: "th",
}

const getLangList = () => {
  // 获取语言列表
  getVisitorLanguageIndexList({
    limit: 99,
    page: 1,
  }).then(({ data }) => {
    if (!langStore.lang) {
      langStore.setLang(data.app_language_default || "")
    }
    langStore.setLangList(data.list.reverse())
  })
}

const getCaptchaSettings = () => {
  // 获取验证码设置
  getCaptchaConfig().then(({ data }) => {
    userStore.setCaptchaConfig(data)
  })
}

// 微信小程序登录
const wxLogin = () => {
  wx.login({
    async success(res) {
      if (res.code) {
        // loginWxApi({ wx_mini_id: 1, code: res.code }).then(({ data }) => {
        //   if (data.openid) userStore.setOpenId(data.openid)
        //   if (data.phone_flag) {
        //     userStore.setToken(data.token || "")
        //   } else {
        //     userStore.clearToken()
        //     userStore.clearUserInfo()
        //   }
        // })
      }
    },
  })
}

watch(
  () => langStore.lang,
  (lang) => {
    if (lang) {
      getLanguagePackage(lang).then((data) => {
        i18n.global.setLocaleMessage(langMap[lang], data as any)
        i18n.global.locale = langMap[lang] as any
        setTimeout(() => {
          langStore.setLangPackageLoading(false)
        }, 500)
      })
    }
  },
  {
    immediate: true,
  },
)

onLaunch(() => {
  // #ifdef MP-WEIXIN
  wxLogin()
  // #endif
  // #ifdef H5
  // getH5UserPosition()
  const script = document.createElement("script")
  script.src = "/static/iconfont/iconfont.js"
  document.body.appendChild(script)
  // #endif
  // getLangList()
  // getCaptchaSettings()
  uni.hideTabBar()
})

onShow(() => {
  console.log("App Show")
  uni.hideTabBar()
})
onHide(() => {
  console.log("App Hide")
})
</script>

<style lang="scss">
/* stylelint-disable selector-type-no-unknown */
button::after {
  border: none;
}

swiper,
scroll-view {
  flex: 1;
  height: 100%;
  overflow: hidden;
}

image {
  width: 100%;
  height: 100%;
  vertical-align: middle;
}

// 单行省略，优先使用 unocss: text-ellipsis
.ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

// 两行省略
.ellipsis-2 {
  display: -webkit-box;
  overflow: hidden;
  text-overflow: ellipsis;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

// 三行省略
.ellipsis-3 {
  display: -webkit-box;
  overflow: hidden;
  text-overflow: ellipsis;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}

:deep(.uni-sample-toast) {
  top: 10% !important;
}

:deep(.uni-tabbar__label) {
  font-weight: bold;
}

::-webkit-scrollbar {
  display: none; /* 隐藏滚动条 */
}
</style>
