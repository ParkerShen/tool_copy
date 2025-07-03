<route lang="json5" type="page">
{
  style: {
    navigationBarTitleText: "",
  },
}
</route>

<template>
  <view class="form-content">
    <wd-form ref="form" :model="formData">
      <wd-cell-group>
        <wd-cell :title="t('app.home.phoneNumber')">
          <view class="input-box">
            <view class="w-136rpx h-64rpx center inline-txt" @click="toCountryCode">
              <text>{{ userStore.countryCode }}</text>
              <wd-icon name="arrow-down" size="34rpx" color="#D9D9D9" class="ml-10rpx"></wd-icon>
            </view>
            <wd-input
              no-border
              v-model="phone"
              :placeholder="t('app.home.enterNewPhoneNumber')"
              :center="true"
              custom-class="input-root"
              use-prefix-slot
            />
          </view>
        </wd-cell>
        <wd-cell :title="t('app.home.verificationCode')">
          <view class="input-box">
            <wd-input
              no-border
              v-model="code"
              :placeholder="t('app.home.enterVerificationCode')"
              custom-class="input-root"
              :maxlength="6"
              use-suffix-slot
            >
              <template #suffix>
                <view
                  v-if="count === 0"
                  :class="phone ? 'code-btn' : 'code-btn code-btn-disabled'"
                  @click="getCode"
                >
                  {{ $t("app.home.getVerificationCode") }}
                </view>
                <view v-else class="code-btn code-btn-disabled" @click="getCode">
                  {{ count }}S {{ $t("app.home.resend") }}
                </view>
                <view class="w-0 h-0" id="captcha-button" ref="captchaRef"></view>
              </template>
            </wd-input>
          </view>
        </wd-cell>
      </wd-cell-group>
      <view class="footer">
        <wd-button
          id="captcha-button"
          size="large"
          block
          custom-class="submit-btn"
          @click="handleSubmit"
          :disabled="!phone || !code"
        >
          {{ $t("app.global.save") }}
        </wd-button>
      </view>
    </wd-form>
  </view>
  <!-- #ifdef H5 -->
  <captcha
    v-if="captchaVisible"
    :data="captchForm"
    module="updatePhone"
    @set-captcha-result="setCaptchaResult"
  />
  <!-- #endif -->
</template>

<script lang="ts" setup>
import { putUserPhone } from "@/api/user"
import i18n from "@/locale/index"
import { useUserStore } from "@/store"
import Captcha from "@/pages/login/components/captcha.vue"

const { t } = i18n.global as any

const userStore = useUserStore()

const formData = ref({})

const phone = ref("")

const code = ref("")

const count = ref(0)

const timer = ref<NodeJS.Timeout | number>()

const captchaRef = ref<{ $el: HTMLElement } | null>(null)

const captchaVisible = ref(false)

const captchForm = computed(() => {
  return {
    phone_number: phone.value,
    phone_area: userStore.countryCode,
  }
})

const toCountryCode = () => {
  uni.navigateTo({ url: "/pages/login/country-code" })
}

const getCode = () => {
  nextTick(() => {
    if (captchaRef.value && count.value === 0 && phone.value) {
      captchaRef.value.$el.click()
    }
  })
}

const countDownHandler = () => {
  if (count.value > 0) {
    timer.value = setTimeout(() => {
      count.value--
      countDownHandler()
    }, 1000)
  } else {
    clearTimeout(timer.value)
    return false
  }
}

const setCaptchaResult = (data: { captchaResult: boolean; code: number }) => {
  if (data.code === 0 && data.captchaResult) {
    uni.showToast({
      icon: "success",
      duration: 2000,
      position: "top",
      title: t("app.home.verificationCodeSent"),
    })
    count.value = userStore.captchaConfig.interval * 60
    countDownHandler()
  } else {
    uni.showToast({
      icon: "error",
      duration: 2000,
      position: "top",
      title: t("err." + data.code) || "Request Error",
    })
  }
}

function handleSubmit() {
  putUserPhone({
    phone_number: phone.value,
    phone_area: userStore.countryCode,
    captcha: code.value,
  }).then(() => {
    uni.showToast({
      title: t("app.home.modifySuccess"),
      icon: "success",
      duration: 1000,
    })
    setTimeout(() => {
      uni.navigateBack()
    }, 1000)
  })
}

onLoad((opt) => {})

onReady(() => {
  uni.setNavigationBarTitle({
    title: t("app.home.modifyPhoneNumber"),
  })
})

onHide(() => {
  captchaVisible.value = false
  // #ifdef H5
  document.getElementById("aliyunCaptcha-mask")?.remove()
  document.getElementById("aliyunCaptcha-window-popup")?.remove()
  // #endif
})

onShow(() => {
  captchaVisible.value = true
})
</script>

<style lang="scss" scoped>
page {
  height: 100%;
  background: #fff;
}

.form-content {
  @apply w-full center mt-6;
}

.footer {
  @apply pos-absolute w-83.75 bottom-6 ml--41.875;

  left: 50%;
}

.input-root {
  @apply w-83.75 ml-3;

  flex-direction: column;
  align-items: flex-start !important;
  padding: 0 !important;
}

.input-box {
  @apply w-83.75 h-11 flex-x-between mt-1.5 mb-5;

  background: #fff;
  border: 0.0625rem solid #ddd;
  border-radius: 0.25rem;

  .code-btn {
    @apply center min-w-17.5 h-9 px-2.25 mr-1 font-size-3.5 color-#fff border-rd-1 bg-#EF6223;
  }

  .code-btn-disabled {
    @apply bg-#F6AF90;
  }
}

.inline-txt {
  @apply font-size-3.5;

  border-right: 0.0625rem solid #ddd;
}

:deep(.wd-cell) {
  padding-left: 0;
}

:deep(.wd-cell__wrapper) {
  flex-direction: column;
  padding: 0;

  .wd-cell__title {
    @apply font-size-3.5;
  }
}

:deep(.wd-input) {
  @apply w-full px-2;
}

:deep(.wd-input__label-inner) {
  font-size: 0.875rem;
  font-weight: 400;
  color: #333;
}

:deep(.is-border) {
  &::after {
    height: 0 !important;
  }
}

:deep(.wd-input__inner) {
  height: 2.5rem !important;
}

:deep(.wd-input__value) {
  .wd-input__placeholder {
    overflow: visible;
    font-size: 0.875rem;
  }

  .uni-input-input {
    font-size: 0.875rem;
  }
}

:deep(.wd-input__clear) {
  font-size: 1rem;
}

:deep(.submit-btn) {
  height: 3rem !important;
  background: linear-gradient(92deg, #ff8650 0%, #e95412 100%) !important;
  border-radius: 4px !important;

  :deep(.wd-button__text) {
    font-size: 1rem;
    font-weight: bold;
  }
}
</style>
