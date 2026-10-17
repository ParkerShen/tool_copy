<template>
  <view class="position-relative" ref="langBox">
    <view class="switch-box flex-y-center" @click="showLang = true">
      <!-- <image src="https://innoai-01.oss-cn-shenzhen.aliyuncs.com/home/login/icon_lang.png" class="w-36rpx h-36rpx" /> -->
      <image :src="selectLang.icon" class="w-48rpx h-36rpx" />
      <text class="mx-10rpx color-black font-size-3 fw-400">{{ selectLang.abbreviation }}</text>
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
import { locales } from "moment"

const langStore = useLangStore()

const langList = computed(() => langStore.langList || [])

const selectLang = computed(
  () =>
    langStore.langList.find((item: LanguageIndexVo) => item.flag === langStore.lang) || {
      _id: "6629ed240f17bae81e0f160c",
      name: "中文简体",
      flag: "zh_CN",
      abbreviation: "简",
      icon: "http://sit-api.guardforceai.cn/download/language/64c244d0-1cbb-11ef-8de2-715e8ac9db61.png",
    },
)

const showLang = ref(false)

const langBox = ref()

onClickOutside(langBox, () => {
  showLang.value = false
})

const changeLang = (lang: LanguageIndexVo) => {
  showLang.value = false
  if (lang.flag) {
    langStore.setLang(lang.flag)
    location.reload()
  }
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
  box-shadow: 0 0 10px 0 rgb(0 0 0 / 5%);
}

.lang-box {
  @apply position-absolute right-0 top-8 min-w-20;

  z-index: 10;
  background: rgb(255 255 255 / 80%);
  background-color: #fff;
  border-radius: 0.25rem;
  box-shadow: 0 0 10px 5px rgb(0 0 0 / 10%);

  .lang-item {
    @apply h-10 px-3 flex-y-center font-size-3 color-#333;
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
