<template>
  <view class="position-relative" ref="langBox">
    <view class="switch-box flex-y-center" @click.stop="switchLang">
      <!-- <image src="https://innoai-01.oss-cn-shenzhen.aliyuncs.com/home/login/icon_lang.png" class="w-36rpx h-36rpx" /> -->
      <image :src="selectLang.icon" class="w-48rpx h-36rpx" />
      <text class="mx-10rpx color-black font-size-3 fw-400">{{ selectLang.name }}</text>
      <wd-icon
        :name="showLang ? 'arrow-up' : 'arrow-down'"
        size="34rpx"
        color="#D9D9D9"
        class="mt-10rpx"
      ></wd-icon>
    </view>
    <transition name="fade">
      <view v-if="showLang" ref="langBox" class="lang-box">
        <view
          v-for="(item, index) in langList"
          :key="item._id"
          class="lang-item"
          :class="{
            'lang-item-active lang-item-border': item._id === selectLang._id && index === 0,
            'lang-item-active': item._id === selectLang._id,
          }"
          @click="changeLang(item)"
        >
          {{ item.name }}
        </view>
      </view>
    </transition>
  </view>
</template>

<script lang="ts" setup>
import { onClickOutside } from "@vueuse/core"
import { useLangStore } from "@/store"
import { LanguageIndexVo } from "@/api/lang/types"
import i18n from "@/locale/index"

const { t } = i18n.global as any

const langStore = useLangStore()

const langList = computed(() => langStore.langList || [])

const selectLang = computed(
  () =>
    langStore.langList.find((item: LanguageIndexVo) => item.flag === langStore.lang) || {
      _id: "6629ed240f17bae81e0f160c",
      name: t("app.home.simplifiedChinese"),
      flag: "zh_CN",
      abbreviation: t("app.home.simplified"),
      icon: "http://sit-api.guardforceai.cn/download/language/64c244d0-1cbb-11ef-8de2-715e8ac9db61.png",
    },
)

const showLang = computed(() => langStore.langVisible)

const langBox = ref()

const switchLang = () => {
  langStore.setLangVisible(true)
}

onClickOutside(langBox, () => {
  langStore.setLangVisible()
})

const changeLang = (lang: LanguageIndexVo) => {
  if (!lang.flag) return
  langStore.setLangVisible()
  langStore.setLang(lang.flag)
  // #ifdef MP-WEIXIN
  setTimeout(() => {
    uni.setNavigationBarTitle({
      title: t("app.home.languageSettings"),
    })
  }, 500)
  // #endif

  // #ifdef H5
  location.reload()
  // #endif
}
</script>

<style scoped lang="scss">
/* 定义动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s;
}

.fade-enter, .fade-leave-to /* .fade-leave-active 在 Vue 2.1.8 中等价 */ {
  opacity: 0;
}

.switch-box {
  @apply px-1 py-1;

  background: #fff;

  // box-shadow: 0 0 10px 0 rgb(0 0 0 / 5%);
}

.lang-box {
  @apply position-absolute right-0 top-8 min-w-26.5;

  z-index: 10;
  background: rgb(255 255 255 / 80%);
  background-color: #fff;
  border-radius: 0.25rem;
  box-shadow: 0 0 10px 5px rgb(0 0 0 / 10%);

  .lang-item {
    @apply h-10 px-3 center font-size-3 color-#333;
  }

  .lang-item-border {
    border-radius: 0.25rem 0.25rem 0 0;
  }

  .lang-item-active {
    color: #fff;
    background: #e95412;
  }
}
</style>
