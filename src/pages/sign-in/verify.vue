<route lang="json5" type="page">
{
  style: { navigationBarTitleText: "" },
}
</route>

<template>
  <view class="sign-top">
    <image
      src="https://innoai-01.oss-cn-shenzhen.aliyuncs.com/home/login/login_bg.png"
      class="w-750rpx h-560rpx"
    />
    <image
      src="https://innoai-01.oss-cn-shenzhen.aliyuncs.com/home/login/logo.png"
      class="position-absolute w-24 h-24 top-24"
    />
  </view>

  <view class="sign-title">
    <view class="w-670rpx px-40rpx flex-x-between">
      <text class="fw-bold font-size-48rpx color-#333">{{ $t("app.home.register") }}</text>
      <lang-select />
    </view>
  </view>

  <view class="form-content">
    <wd-form ref="form" :model="formData">
      <wd-cell-group>
        <wd-cell :title="t('app.home.verificationCode')" required>
          <view :class="errKeys.includes('captcha') ? 'input-box input-box-error' : 'input-box'">
            <wd-input
              no-border
              prop="captcha"
              v-model="formData.captcha"
              :placeholder="t('app.home.enterVerificationCode')"
              :center="true"
              :rules="[{ required: true, message: t('app.home.pleaseFillInVerificationCode') }]"
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

  <view class="sign-footer pb-5">
    <view class="mt-4.25 font-size-3.5">
      {{ $t("app.home.noVerifyCode") }}
      <text v-show="count === 0" class="color-#E95412" id="captcha-button">
        {{ $t("app.home.resend") }}
      </text>
      <text v-show="count > 0" class="color-#E95412">{{ count }}S {{ $t("app.home.resend") }}</text>
    </view>
  </view>
  <!-- #ifdef H5 -->
  <captcha :data="captchForm" module="signin" @set-captcha-result="setCaptchaResult" />
  <!-- #endif -->
</template>

<script lang="ts" setup>
import { useUserStore, useCouponStore } from "@/store"
import { useToast } from "wot-design-uni"
import LangSelect from "@/pages/login/components/lang-select.vue"
import { SigninData } from "@/api/user/types"
import Captcha from "@/pages/login/components/captcha.vue"
import { signinApi } from "@/api/user"
import i18n from "@/locale/index"

const { t } = i18n.global as any

const { success: showSuccess } = useToast()

const userStore = useUserStore()

const couponStore = useCouponStore()

const formData = ref<SigninData>({
  nick_name: "",
  account: "",
  password: "",
  confirmPwd: "",
  captcha: "",
})

const count = ref(120)

const timer = ref<NodeJS.Timeout | number>()

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

const handleSubmit = () => {
  checkForm()
  form.value
    .validate()
    .then((option: { valid: string }) => {
      const { valid } = option
      if (valid) {
        signinApi({
          captcha: formData.value.captcha,
          ...captchForm.value,
          privacy_agreement_version: userStore.agreementVersions.privacy_protect?.version ?? "",
          reg_agreement_version: userStore.agreementVersions.reg?.version ?? "",
        }).then(({ data }) => {
          if (!data.token) return

          userStore.setToken(data.token)
          userStore.setRegUserInfo({})
          const navBack = couponStore.couponRouter
          uni.showToast({
            icon: "success",
            duration: 1000,
            position: "top",
            title: t("app.home.registrationSuccessful"),
            success: () => {
              setTimeout(() => {
                if (navBack) {
                  uni.reLaunch({ url: navBack })
                  couponStore.clearCouponRouter()
                } else {
                  uni.reLaunch({ url: "/" })
                }
              }, 1000)
            },
          })
        })
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

const captchForm = computed(() => userStore.regUserInfo || {})

const setCaptchaResult = (status: boolean) => {
  if (status) {
    showSuccess({
      msg: t("app.home.verificationCodeSentSuccessfully"),
    })
    count.value = userStore.captchaConfig.interval * 60
    countDownHandler()
  }
}

onLoad((opt) => {})

onUnload(() => {
  clearTimeout(timer.value)
})

onReady(() => {
  uni.setNavigationBarTitle({
    title: t("app.home.captcha"),
  })
})

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

.sign-top {
  @apply w-full position-relative flex-x-center;
}

.sign-title {
  @apply w-full flex-x-center position-absolute top-55 left-0;
}

.form-content {
  @apply w-full flex-x-center position-absolute top-65.75 left-0;
}

.sign-footer {
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
