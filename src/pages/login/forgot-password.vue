<route lang="json5" type="page">
{
  style: { navigationBarTitleText: "" },
}
</route>

<template>
  <view class="login-top">
    <image
      src="https://innoai-01.oss-cn-shenzhen.aliyuncs.com/home/login/login_bg.png"
      class="w-750rpx h-560rpx"
    />
    <image
      src="https://innoai-01.oss-cn-shenzhen.aliyuncs.com/home/login/logo.png"
      class="position-absolute w-24 h-24 top-24"
    />
  </view>

  <view class="login-title">
    <view class="w-670rpx px-40rpx flex-x-between">
      <text class="fw-bold font-size-48rpx color-#333">{{ $t("app.home.forgotPassword") }}</text>
      <lang-select />
    </view>
  </view>

  <view class="form-content">
    <wd-form ref="form" :model="formData">
      <wd-cell-group>
        <wd-cell :title="t('app.home.phoneNumberOrEmailAddress')" required>
          <view :class="errKeys.includes('account') ? 'input-box input-box-error' : 'input-box'">
            <view v-if="isTel" class="w-136rpx h-64rpx center inline-txt" @click="toCountryCode">
              <text>{{ userStore.countryCode }}</text>
              <wd-icon name="arrow-down" size="34rpx" color="#D9D9D9" class="ml-10rpx"></wd-icon>
            </view>
            <wd-input
              no-border
              prop="account"
              v-model="formData.account"
              :placeholder="t('app.home.enterPhoneNumberOrEmailAddress')"
              :center="true"
              :rules="isTel ? phoneRule : emailRule"
              custom-class="input-root"
              use-prefix-slot
              clearable
            />
          </view>
        </wd-cell>
      </wd-cell-group>
      <view class="footer">
        <wd-button size="large" block custom-class="submit-btn" @click="handleSubmit">
          {{ $t("app.home.sendVerificationCode") }}
        </wd-button>
        <view class="w-0 h-0" id="captcha-button" ref="captchaRef"></view>
      </view>
    </wd-form>
  </view>
  <!-- #ifdef H5 -->
  <captcha
    v-if="captchaVisible"
    :data="captchForm"
    module="fogotPwd"
    @set-captcha-result="setCaptchaResult"
  />
  <!-- #endif -->
</template>

<script lang="ts" setup>
import { formatParams } from "@/utils"
import { useLangStore, useUserStore } from "@/store"
import LangSelect from "./components/lang-select.vue"
import Captcha from "@/pages/login/components/captcha.vue"
import { RegCaptchaData } from "@/api/user/types"
import i18n from "@/locale/index"

const { t } = i18n.global as any

const userStore = useUserStore()

const langStore = useLangStore()

const formData = ref<RegCaptchaData>({
  account: "",
})

const captchForm = ref<RegCaptchaData>({
  account: "",
  phone_number: "",
  email: "",
  phone_area: "",
  captcha_verify_param: "",
})

const timer = ref<NodeJS.Timeout | number>()

const isTel = ref(false)

const captchaRef = ref<{ $el: HTMLElement } | null>(null)

const form = ref()

// 邮箱验证
const emailValidator = (val: string) => {
  return /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(
    val,
  )
}
const phoneRule = [{ required: true, message: t("app.home.pleaseFillInPhoneNumberOrEmailAddress") }]
const emailRule = [
  { required: true, message: t("app.home.pleaseFillInPhoneNumberOrEmailAddress") },
  { required: false, validator: emailValidator, message: t("app.home.pleaseEnterCorrectEmail") },
]

const errKeys = ref<string[]>([])
const checkForm = () => {
  errKeys.value = []
  for (const key in formData.value) {
    if (
      Object.prototype.hasOwnProperty.call(formData.value, key) &&
      !formData.value[key as keyof typeof formData.value]
    ) {
      // 检查 key 是否是 model.value 的自有属性，并且值是空字符串（或其他被认为是“空”的值）
      errKeys.value.push(key)
    }
  }
}

const handleSubmit = () => {
  checkForm()
  form.value
    .validate()
    .then((option: { valid: string }) => {
      const { valid } = option
      if (valid) {
        formData.value.phone_area = userStore.countryCode
        captchForm.value = formatParams(formData.value, isTel.value)
        nextTick(() => {
          if (captchaRef.value) {
            captchaRef.value.$el.click()
          }
        })
      }
    })
    .catch((error: any) => {
      console.log(error, "error")
    })
}

const captchaVisible = ref(true)

const setCaptchaResult = (data: { captchaResult: boolean; code: number }) => {
  if (data.code === 0 && data.captchaResult) {
    userStore.setRegUserInfo(captchForm.value)
    uni.navigateTo({ url: "/pages/login/forgot-password-captcha" })
  } else {
    uni.showToast({
      icon: "error",
      duration: 2000,
      position: "top",
      title: t("err." + data.code) || "Request Error",
    })
  }
}

const toCountryCode = () => {
  uni.navigateTo({ url: "/pages/login/country-code" })
}

onUnload(() => {
  clearTimeout(timer.value)
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

onLoad((opt) => {})

watch(
  () => langStore.langPackageLoading,
  (value) => {
    if (!value) {
      uni.setNavigationBarTitle({
        title: t("app.home.forgetPassword"),
      })
    }
  },
  {
    immediate: true,
  },
)

watch(
  () => formData.value.account,
  (value) => {
    const regex = /.*[a-zA-Z@].*/
    isTel.value = !!value
    isTel.value = !!value && !regex.test(value)
  },
  {
    deep: true,
  },
)

watch(
  () => formData.value,
  (value) => {
    errKeys.value = []
  },
  {
    deep: true,
  },
)
</script>

<style lang="scss" scoped>
page {
  height: 100%;
}

.login-top {
  @apply w-full position-relative flex-x-center;
}

.login-title {
  @apply w-full flex-x-center position-absolute top-55 left-0;
}

.form-content {
  @apply w-full flex-x-center position-absolute top-65.75 left-0;
}

.login-footer {
  @apply w-full flex-x-center position-absolute top-110 left-0;
}

.input-root {
  @apply w-73.75 ml-3 mr-5;

  flex-direction: column;
  align-items: flex-start !important;
  padding: 0 !important;
}

.input-box {
  @apply w-83.75 h-14 flex-x-between mt-1 mb-5;

  background: #fff;
  border: 0.0625rem solid #ddd;
  border-radius: 0.25rem;
}

.input-box-error {
  border: 0.0625rem solid #f51b1b;
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

:deep(.wd-input__icon) {
  font-size: 1rem;
}

:deep(.wd-input__error-message) {
  @apply position-top-12 font-size-2.5;

  position: absolute;
}

.submit-btn {
  height: 3.4375rem !important;
  background: linear-gradient(92deg, #ff8650 0%, #e95412 100%) !important;
  border-radius: 4px !important;

  :deep(.wd-button__text) {
    font-size: 1rem;
    font-weight: bold;
  }
}
</style>
