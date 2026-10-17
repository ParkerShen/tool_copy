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
        <wd-cell :title="t('app.home.verificationCode')" required>
          <view :class="errKeys.includes('captcha') ? 'input-box input-box-error' : 'input-box'">
            <view v-if="isTel" class="w-136rpx h-64rpx center inline-txt">
              <text>{{ userStore.countryCode }}</text>
              <wd-icon name="arrow-down" size="34rpx" color="#D9D9D9" class="ml-10rpx"></wd-icon>
            </view>
            <wd-input
              no-border
              prop="captcha"
              v-model="formData.captcha"
              :placeholder="t('app.home.enterVerificationCode')"
              :center="true"
              :rules="[{ required: true, message: t('app.home.enterVerificationCode') }]"
              custom-class="input-root"
              use-prefix-slot
              clearable
              type="number"
              :maxlength="6"
            />
          </view>
        </wd-cell>
      </wd-cell-group>
      <view class="footer">
        <wd-button size="large" block custom-class="submit-btn" @click="handleSubmit">
          {{ $t("app.home.verify") }}
        </wd-button>
      </view>
    </wd-form>
  </view>

  <view class="login-footer pb-5">
    <view class="mt-4.25 font-size-3.5">
      {{ $t("app.home.noVerifyCode") }}
      <text v-show="count === 0" class="color-#E95412" id="captcha-button">
        {{ $t("app.home.resend") }}
      </text>
      <text v-show="count > 0" class="color-#E95412">{{ count }}S {{ $t("app.home.resend") }}</text>
    </view>
  </view>
  <!-- #ifdef H5 -->
  <captcha :data="captchForm" module="fogotPwd" @set-captcha-result="setCaptchaResult" />
  <!-- #endif -->
</template>

<script lang="ts" setup>
import { useLangStore, useUserStore } from "@/store"
import { useToast } from "wot-design-uni"
import LangSelect from "./components/lang-select.vue"
import Captcha from "@/pages/login/components/captcha.vue"
import { checkForgotCaptcha } from "@/api/user"
import { SigninData } from "@/api/user/types"
import i18n from "@/locale/index"

const { t } = i18n.global as any

const { success: showSuccess } = useToast()

const userStore = useUserStore()

const langStore = useLangStore()

const formData = ref<SigninData>({
  captcha: "",
})

const count = ref(120)

const timer = ref<NodeJS.Timeout | number>()

const isTel = ref(false)

const form = ref()

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

const captchForm = computed(() => userStore.regUserInfo || {})

const handleSubmit = () => {
  checkForm()
  form.value
    .validate()
    .then((option: { valid: string }) => {
      const { valid } = option
      if (valid) {
        checkForgotCaptcha({ captcha: formData.value.captcha, ...captchForm.value }).then(
          ({ data }) => {
            if (data.token) {
              userStore.setToken(data.token)
              userStore.setRegUserInfo({})
              uni.redirectTo({
                url: "/pages/login/change-password",
              })
            }
          },
        )
      }
    })
    .catch((error: any) => {
      console.log(error, "error")
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

const setCaptchaResult = (status: boolean) => {
  if (status) {
    showSuccess({
      msg: t("app.home.verificationCodeSentSuccessfully"),
    })
    count.value = userStore.captchaConfig.interval * 60
    countDownHandler()
  }
}

onUnload(() => {
  clearTimeout(timer.value)
})

onLoad((opt) => {})

watch(
  () => langStore.langPackageLoading,
  (value) => {
    if (!value) {
      uni.setNavigationBarTitle({
        title: t("app.home.captcha"),
      })
    }
  },
  {
    immediate: true,
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

watch(
  () => userStore.captchaConfig.interval,
  (value) => {
    count.value = value * 60
    countDownHandler()
  },
  {
    immediate: true,
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
