<route lang="json5" type="page">
{
  style: { navigationBarTitleText: "" },
}
</route>

<template>
  <!-- eslint-disable-next-line vue/no-v-text-v-html-on-component -->
  <view class="px-5 py-5" v-html="content" />
</template>

<script lang="ts" setup>
import { useUserStore } from "@/store"
import { getAgreementData } from "@/api/user"
import i18n from "@/locale/index"

const { t } = i18n.global as any

interface Params {
  type?: number
  latitude?: number
  longitude?: number
}

const userStore = useUserStore()

const params = ref<Params>({
  type: 2,
})

const content = ref("")

const getData = (url: string) => {
  getAgreementData(url).then((data) => {
    content.value = data as any
  })
}

onLoad(() => {
  if (userStore.latitude) {
    params.value.latitude = userStore.latitude
  }

  if (userStore.longitude) {
    params.value.longitude = userStore.longitude
  }

  if (userStore.agreementVersions.privacy_protect?.url) {
    getData(userStore.agreementVersions.privacy_protect.url)
  }
})

onReady(() => {
  uni.setNavigationBarTitle({
    title: t("app.home.privacyProtection"),
  })
})
</script>

<style lang="scss" scoped>
page {
  height: 100%;
}
</style>
