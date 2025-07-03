<route lang="json5" type="page">
{
  style: { navigationBarTitleText: "" },
}
</route>

<template>
  <wd-notify />
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
        <wd-cell :title="t('app.home.nickname')" required>
          <view :class="errKeys.includes('nick_name') ? 'input-box input-box-error' : 'input-box'">
            <wd-input
              no-border
              prop="nick_name"
              v-model="formData.nick_name"
              :placeholder="t('app.home.enterNickname')"
              :center="true"
              :rules="[{ required: true, message: t('app.home.pleaseFillInNickname') }]"
              custom-class="input-root"
              use-prefix-slot
              clearable
            />
          </view>
        </wd-cell>
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
        <wd-cell :title="t('app.home.createPassword')" required>
          <view :class="errKeys.includes('password') ? 'input-box input-box-error' : 'input-box'">
            <wd-input
              no-border
              prop="password"
              show-password
              clearable
              v-model="formData.password"
              :placeholder="t('app.home.enterPassword')"
              :rules="[
                {
                  required: true,
                  validator: pwdValidator,
                  message: t('app.home.pleaseEnterPassword'),
                },
              ]"
              custom-class="input-root"
            />
          </view>
        </wd-cell>
        <wd-cell :title="t('app.home.confirmPassword')" required>
          <view :class="errKeys.includes('confirmPwd') ? 'input-box input-box-error' : 'input-box'">
            <wd-input
              no-border
              prop="confirmPwd"
              show-password
              clearable
              v-model="formData.confirmPwd"
              :placeholder="t('app.home.enterConfirmationPassword')"
              :rules="[
                {
                  required: true,
                  validator: confirmPwdValidator,
                  message: t('app.home.pleaseEnterConfirmationPassword'),
                },
              ]"
              custom-class="input-root"
            />
          </view>
        </wd-cell>
      </wd-cell-group>
      <view class="footer">
        <wd-button
          v-if="!formData.account"
          size="large"
          block
          custom-class="submit-btn"
          @click="handleSubmit"
        >
          {{ $t("app.home.resume") }}
        </wd-button>
        <wd-button
          v-show="formData.account"
          size="large"
          block
          custom-class="submit-btn"
          @click="handleSubmit"
        >
          {{ isTel ? $t("app.home.verifyPhoneNumber") : $t("app.home.verifyEmail") }}
        </wd-button>
        <view class="w-0 h-0" id="captcha-button" ref="captchaRef"></view>
      </view>
    </wd-form>
  </view>

  <view class="sign-footer pb-5">
    <view class="w-670rpx px-40rpx flex-x-between">
      <wd-checkbox
        v-model="protocolChecked"
        shape="square"
        checked-color="#E95412"
        size="large"
      ></wd-checkbox>

      <text class="protocol" :class="{ 'shake-animation': isShark }">
        {{ $t("app.home.agree") }} Guardforce AI {{ $t("app.home.the") }}
        <text class="color-#E95412" @click="toUserAgreement">
          《{{ $t("app.home.userAgreement") }}》
        </text>
        {{ $t("app.home.and") }}
        <text class="color-#E95412" @click="toPrivacyProtection">
          《{{ $t("app.home.privacyProtection") }}》
        </text>
      </text>
    </view>

    <view class="mt-30.25 font-size-3.5" :class="isEn ? 'mt-31.25' : 'mt-4.25'">
      {{ $t("app.home.haveAccount") }}
      <text class="color-#E95412" @click="toLogin">{{ $t("app.home.login") }}</text>
    </view>
  </view>

  <view v-if="isEn" class="sign-footer sign-footer2 pb-5">
    <view class="w-670rpx px-40rpx flex-y-center">
      <wd-checkbox
        v-model="receiveChecked"
        shape="square"
        checked-color="#E95412"
        size="large"
      ></wd-checkbox>

      <text class="protocol" :class="{ 'shake-animation': isShark2 }">
        I agree to receive text messages
      </text>
    </view>
    <view class="mt-1.5 font-size-3 px-40rpx">
      Message and data rates may apply. Enter your phone number to receive one time passcode message
      to your phone from [ Shenzhen Weian Intelligent Robot Technology Co., Ltd ]. Msg freq may vary
      Reply “HELP” for help, Reply“STOP”to cancel.
    </view>
  </view>
  <!-- #ifdef H5 -->
  <captcha
    v-if="captchaVisible"
    :data="captchForm"
    module="signin"
    @set-captcha-result="setCaptchaResult"
  />
  <!-- #endif -->
</template>

<script lang="ts" setup>
import { formatParams } from "@/utils"
import { useLangStore, useUserStore } from "@/store"
import LangSelect from "@/pages/login/components/lang-select.vue"
import { RegCaptchaData, SigninData } from "@/api/user/types"
import Captcha from "@/pages/login/components/captcha.vue"
import i18n from "@/locale/index"
import { useNotify } from "wot-design-uni"
import { getAgreementVersion } from "@/api/user"

const { t } = i18n.global as any

const { showNotify } = useNotify()

const userStore = useUserStore()

const langStore = useLangStore()

const isEn = computed(() => {
  return langStore.lang === "en_US"
})

const formData = ref<SigninData>({
  nick_name: "",
  account: "",
  phone_number: "",
  email: "",
  password: "",
  confirmPwd: "",
})

const captchForm = ref<RegCaptchaData>({
  account: "",
  phone_number: "",
  email: "",
  phone_area: "",
  captcha_verify_param: "",
})

const captchaVisible = ref(true)

const isTel = ref(false)

const isShark = ref(false)

const isShark2 = ref(false)

const captchaRef = ref<{ $el: HTMLElement } | null>(null)

const form = ref()

/** 邮箱验证 */
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

// 密码验证
const pwdValidator = (val: any) => {
  const isReg =
    /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)|^(?=.*[A-Z])(?=.*[a-z])(?=.*[!@#$%^&*(),.?":{}|<>])|^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])|^(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).*/.test(
      val,
    )
  if (val.length < 8) {
    // eslint-disable-next-line prefer-promise-reject-errors
    return Promise.reject(t("app.home.pwdLength"))
  } else if (!isReg) {
    // eslint-disable-next-line prefer-promise-reject-errors
    return Promise.reject(t("app.home.pwdValidator"))
  }
  return Promise.resolve()
}

// 确认密码验证
const confirmPwdValidator = (val: any) => {
  if (formData.value.password === val) {
    return Promise.resolve()
  } else {
    // eslint-disable-next-line prefer-promise-reject-errors
    return Promise.reject(t("app.home.passwordsDoNotMatch"))
  }
}

const setCaptchaResult = (data: { captchaResult: boolean; code: number }) => {
  if (data.code === 0 && data.captchaResult) {
    userStore.setRegUserInfo(captchForm.value)
    uni.navigateTo({ url: "/pages/sign-in/verify" })
  } else {
    uni.showToast({
      icon: "error",
      duration: 2000,
      position: "top",
      title: t("err." + data.code) || "Request Error",
    })
  }
}

const protocolChecked = ref(false)

const receiveChecked = ref(false)

const errKeys = ref<string[]>([])
const checkForm = () => {
  errKeys.value = []
  for (const key in formData.value) {
    if (
      Object.prototype.hasOwnProperty.call(formData.value, key) &&
      !formData.value[key as keyof typeof formData.value]
    ) {
      errKeys.value.push(key)
    }
  }
}

// 提交表单
const handleSubmit = () => {
  checkForm()
  form.value
    .validate()
    .then((option: { valid: string }) => {
      const { valid } = option
      if (valid) {
        if (!protocolChecked.value) {
          isShark.value = true
          setTimeout(() => {
            isShark.value = false
          }, 1000)
        } else if (!receiveChecked.value && isEn.value) {
          isShark2.value = true
          setTimeout(() => {
            isShark2.value = false
          }, 1000)
        } else {
          formData.value.phone_area = userStore.countryCode
          captchForm.value = formatParams(formData.value, isTel.value)
          nextTick(() => {
            if (captchaRef.value) {
              captchaRef.value.$el.click()
            }
          })
        }
      }
    })
    .catch((error: any) => {
      console.log(error, "error")
    })
}

const toCountryCode = () => {
  uni.navigateTo({ url: "/pages/login/country-code" })
}

const toLogin = () => {
  uni.reLaunch({ url: "/pages/login/index" })
}

const toUserAgreement = () => {
  uni.navigateTo({ url: "/pages/sign-in/user-agreement" })
}

const toPrivacyProtection = () => {
  uni.navigateTo({ url: "/pages/sign-in/privacy-protection" })
}

const getA = () => {
  getAgreementVersion().then(({ data }) => {
    userStore.setAgreementVersions(data)
  })
}

onLoad((opt) => {
  getA()
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

watch(
  () => langStore.langPackageLoading,
  (value) => {
    if (!value) {
      uni.setNavigationBarTitle({
        title: t("app.home.register"),
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

watch(
  () => userStore.countryCode,
  (value) => {
    if (["+1", "+65"].includes(value)) {
      showNotify({
        message: t("app.home.regTips"),
        duration: 3000,
        background: "#e95412",
      })
      userStore.setCountryCode("+86")
      formData.value.account = ""
    }
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
  @apply w-full flex-y-center position-absolute top-186.25 left-0;

  flex-direction: column;

  .protocol {
    @apply font-size-3 line-height-4.8 ml-1;
  }
}

.sign-footer2 {
  @apply top-196.25;
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

:deep(.wd-checkbox.is-large .wd-checkbox__shape) {
  @apply w-4 h-4;
}

:deep(.wd-checkbox__shape.is-square) {
  border-radius: 0;
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

@keyframes shake {
  0% {
    transform: translateX(0);
  }

  10% {
    transform: translateX(-10px);
  }

  20% {
    transform: translateX(10px);
  }

  30% {
    transform: translateX(-10px);
  }

  40% {
    transform: translateX(10px);
  }

  50% {
    transform: translateX(-10px);
  }

  60% {
    transform: translateX(10px);
  }

  70% {
    transform: translateX(-10px);
  }

  80% {
    transform: translateX(10px);
  }

  90% {
    transform: translateX(-10px);
  }

  100% {
    transform: translateX(0);
  }
}

.shake-animation {
  animation: shake 1s linear infinite;
}
</style>
