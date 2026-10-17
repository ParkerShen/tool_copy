<route lang="json5" type="page">
{
  style: { navigationBarTitleText: "" },
}
</route>

<template>
  <view class="wraper">
    <wd-search
      v-model="keyWord"
      :placeholder="t('app.home.selectCountryOrRegion')"
      placeholder-left
      light
      hide-cancel
      custom-class="search"
    />
    <wd-index-bar sticky>
      <view v-for="item in showCountryList" :key="item.index">
        <wd-index-anchor :index="item.index" />
        <view class="pl-4 pr-4">
          <view class="list-box">
            <wd-cell
              clickable
              v-for="city in item.data"
              :key="city.name"
              :title="city.name"
              :value="city.code"
              @click="handleClick(city.code)"
            ></wd-cell>
          </view>
        </view>
      </view>
    </wd-index-bar>
  </view>
</template>

<script lang="ts" setup>
import { getCountrys } from "@/api/user"
import { CountrysResult } from "@/api/user/types"
import { useDebounce } from "@vueuse/core"
import { useUserStore, useLangStore } from "@/store"
import i18n from "@/locale/index"

const { t } = i18n.global as any

const userStore = useUserStore()

const langStore = useLangStore()

const keyWord = ref()

const debouncedValue = useDebounce(keyWord, 500)

const countryList = ref<CountrysResult[]>([])

const getCountryList = (lang: string) => {
  getCountrys(lang).then((data) => {
    countryList.value = data as any
  })
}

const showCountryList = computed(() => {
  const countrys = JSON.parse(JSON.stringify(countryList.value))
  if (debouncedValue.value) {
    return countrys.filter((country: CountrysResult) => {
      country.data = country.data.filter(
        (item) =>
          item.name.includes(debouncedValue.value) || item.code.includes(debouncedValue.value),
      )
      for (const item of country.data) {
        if (item.name.includes(debouncedValue.value) || item.code.includes(debouncedValue.value)) {
          return true
        }
      }
      return false
    })
  }
  return countryList.value
})

const handleClick = (code: string) => {
  userStore.setCountryCode(code)
  uni.navigateBack()
}

onLoad(() => {
  const lang = langStore.lang === "th_TH" ? "en_US" : langStore.lang
  getCountryList(lang)
})

watch(
  () => langStore.langPackageLoading,
  (value) => {
    if (!value) {
      uni.setNavigationBarTitle({
        title: t("app.home.selectCountryOrRegion"),
      })
    }
  },
  {
    immediate: true,
  },
)
</script>

<style lang="scss">
page {
  height: 100%;
  background: #f4eeec;
}

.wraper {
  height: calc(100vh - var(--window-top) - 3.75rem);
  height: calc(100vh - var(--window-top) - constant(safe-area-inset-bottom) - 3.75rem);
  height: calc(100vh - var(--window-top) - env(safe-area-inset-bottom) - 3.75rem);

  .search {
    @apply w-85.5 pl-4 pr-4;

    position: fixed;
    top: 0;
    z-index: 99;
    margin: 0 auto;
    background: none !important;

    :deep(.wd-search__block) {
      @apply w-full h-11 font-size-3.5;

      border-radius: 0.25rem;

      .wd-search__placeholder-txt {
        @apply font-size-3.5;
      }

      .uni-input-input {
        @apply font-size-3.5 color-#333;
      }
    }
  }

  :deep(.wd-index-bar) {
    @apply mt-15;
  }

  :deep(.wd-index-bar__sidebar) {
    z-index: -99;
  }

  :deep(.wd-index-anchor) {
    @apply font-size-2.5 color-#666 pl-4 pr-4;

    top: -0.125rem;
    background: #f4eeec;
  }

  :deep(.wd-index-anchor.is-sticky) {
    top: -2px;
  }

  :deep(.wd-cell) {
    @apply h-10;

    .wd-cell__title {
      @apply font-size-3.5 color-#333;

      font-family: "Source Han Sans SC";
    }

    .wd-cell__value {
      @apply font-size-3.5 color-#666;

      font-family: "Source Han Sans SC";
    }
  }

  .list-box {
    background: #fff;
    border-radius: 0.25rem;
  }
}
</style>
