<script setup lang="ts">
import { onLaunch, onShow, onHide } from "@dcloudio/uni-app"
import { getLanguagePackage, getVisitorLanguageIndexList } from "./api/lang"
import { useLangStore, useUserStore } from "@/store"
import { getCaptchaConfig, loginWxApi } from "./api/user"
import i18n from "@/locale/index"
import { getH5UserPosition } from "./utils/chinaBounds"
import { isLocalDataMode } from "@/api/bookkeeping"
// #ifdef H5
import { getDatabaseStats } from "@/api/bookkeeping"
import { preloadLocalDb } from "@/api/bookkeeping/db"
import {
  BACKUP_INTERVAL_DAYS,
  daysSinceLastExport,
  isBackupSnoozed,
  snoozeBackup,
} from "@/utils/backupReminder"
import { registerServiceWorker } from "@/utils/serviceWorker"
import { installOverscrollLock } from "@/utils/overscrollLock"
// #endif

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
    // 本地模式下不请求远程语言包，避免离线时发起无效请求
    if (isLocalDataMode) return
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

// #ifdef H5
function scheduleBackupReminder(): void {
  setTimeout(async () => {
    try {
      if (!isLocalDataMode || isBackupSnoozed()) return
      const stats = await getDatabaseStats()
      // 任意一个工具有数据就提醒，不能只看记账和倒数日
      const hasAnyData =
        stats.recordCount +
          stats.countdownCount +
          stats.inventoryItemCount +
          stats.inventoryLocationCount +
          stats.diaryCount +
          stats.tagDiaryCount >
        0
      if (!hasAnyData) return
      const days = daysSinceLastExport()
      if (days !== null && days < BACKUP_INTERVAL_DAYS) return
      uni.showModal({
        title: "该备份了",
        content:
          days === null
            ? "还没有导出过备份。记账、日记、标签日记、倒数日、收纳都只保存在这台手机上，建议现在导出一份 .sqlite 放到「文件」或 iCloud。"
            : `已经 ${days} 天没有导出备份了。建议现在导出一份包含全部工具数据的 .sqlite 放到「文件」或 iCloud。`,
        confirmText: "去备份",
        cancelText: "稍后",
        success: (result) => {
          if (result.confirm) {
            uni.switchTab({ url: "/pages/my/index" })
          } else {
            snoozeBackup()
          }
        },
      })
    } catch (error) {
      console.warn("[backup] 检查备份提醒失败:", error)
    }
  }, 4000)
}
// #endif

onLaunch(() => {
  // #ifdef MP-WEIXIN
  wxLogin()
  // #endif
  // #ifdef H5
  // getH5UserPosition()
  const script = document.createElement("script")
  script.src = "/static/iconfont/iconfont.js"
  document.body.appendChild(script)
  // 提前加载 SQLite，避免首次进入记账页等待 WASM
  preloadLocalDb()
  // HTTPS 下注册 Service Worker，支持离线打开
  registerServiceWorker()
  // 锁住 H5 顶部/底部回弹，避免 iOS 下拉、上推露出白边
  installOverscrollLock()
  // 每周提醒导出一次真正离开手机本地的备份
  scheduleBackupReminder()
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
@import "./styles/bookkeeping.scss";
@import "./styles/countdown.scss";
@import "./styles/inventory.scss";

/* #ifdef H5 */
/* 全局锁：禁止页面级回弹，回弹时露出的底色也不再是白色 */
html,
body {
  margin: 0;
  padding: 0;
  overscroll-behavior: none;
  background-color: #f0f0f2;
}

/* uni-app 运行时会再写一条 #app{background:#fff}，这里提高优先级压住 */
#app {
  background-color: #f0f0f2 !important;
}

/* 局部锁：滚动容器到顶/到底后不把滚动链传给页面 */
uni-scroll-view,
.uni-scroll-view,
.uni-scroll-view-content,
.overscroll-lock,
[data-overscroll-lock="contain"] {
  overscroll-behavior: contain;
}

.overscroll-lock-y {
  overscroll-behavior-y: contain;
}
/* #endif */

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
