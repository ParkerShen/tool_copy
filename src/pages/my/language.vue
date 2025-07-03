<route lang="json5">
{
  style: { navigationBarTitleText: "" },
}
</route>
<template>
  <view class="main-container" @click="setLangHide">
    <view class="flex-x-between">
      <text class="font-size-3.5 color-#333">{{ $t("app.home.currentLanguage") }}</text>
      <lang-select />
    </view>
  </view>
</template>

<script lang="ts" setup>
import { useLangStore } from "@/store"
import LangSelect from "./components/lang-select.vue"
import i18n from "@/locale/index"

const { t } = i18n.global as any

const langStore = useLangStore()

const setLangHide = () => {
  langStore.setLangVisible()
}

watch(
  () => langStore.langPackageLoading,
  (value) => {
    if (!value) {
      uni.setNavigationBarTitle({
        title: t("app.home.languageSettings"),
      })
    }
  },
  {
    immediate: true,
  },
)
</script>

<style scoped lang="scss">
page {
  height: 100%;
  background: #fff;
}

.main-container {
  @apply h-60 px-5 pt-5;

  height: calc(100vh - 1.25rem);
}
</style>
