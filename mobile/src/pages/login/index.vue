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
      <text class="fw-bold font-size-48rpx color-#333">{{ $t("app.home.login") }}</text>
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
        <wd-cell :title="t('app.home.password')" required>
          <view :class="errKeys.includes('password') ? 'input-box input-box-error' : 'input-box'">
            <wd-input
              no-border
              prop="password"
              show-password
              clearable
              v-model="formData.password"
              :placeholder="t('app.home.enterPassword')"
              :rules="[{ required: true, message: t('app.home.pleaseEnterPassword') }]"
              custom-class="input-root"
            />
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
        >
          {{ $t("app.home.login") }}
        </wd-button>
      </view>
    </wd-form>
  </view>

  <view class="login-footer">
    <view class="w-670rpx px-40rpx flex-x-between">
      <text class="fw-400 font-size-28rpx color-#000" @click="toRsetPwd">
        {{ $t("app.home.forgotPwd") }}
      </text>
      <text class="fw-400 font-size-28rpx color-#000" @click="toSignIn">
        {{ $t("app.home.register") }}
      </text>
    </view>
  </view>
  <!-- #ifdef H5 -->
  <!-- <captcha /> -->
  <!-- #endif -->
</template>

<script lang="ts" setup>
import { formatParams } from "@/utils"
import { useUserStore, useCouponStore, useLangStore } from "@/store"
import LangSelect from "./components/lang-select.vue"
import { loginApi } from "@/api/user"
import { LoginData } from "@/api/user/types"
import i18n from "@/locale/index"

const { t } = i18n.global as any

const userStore = useUserStore()

const couponStore = useCouponStore()

const langStore = useLangStore()

const formData = ref<LoginData>({
  phone_number: "",
  email: "",
  password: "",
  phone_area: "+86",
})

const isTel = ref(false)

const form = ref()

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

const login = () => {
  formData.value.phone_area = userStore.countryCode
  const params = formatParams(formData.value, isTel.value)
  const navBack = couponStore.couponRouter
  loginApi(params)
    .then(({ data }) => {
      if (data.token) {
        userStore.setToken(data.token)
        uni.showToast({
          icon: "success",
          duration: 1000,
          position: "top",
          title: t("app.home.loginSuccessful"),
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
      }
    })
    .catch((err) => {
      console.log(err)
    })
}

function handleSubmit() {
  checkForm()
  form.value
    .validate()
    .then((option: { valid: string }) => {
      const { valid } = option
      if (valid) {
        login()
      }
    })
    .catch((error: any) => {
      console.log(error, "error")
    })
}

const toCountryCode = () => {
  uni.navigateTo({ url: "/pages/login/country-code" })
}

const toSignIn = () => {
  uni.reLaunch({ url: "/pages/sign-in/index" })
}

const toRsetPwd = () => {
  uni.navigateTo({ url: "/pages/login/forgot-password" })
}

onLoad((opt) => {})

watch(
  () => langStore.langPackageLoading,
  (value) => {
    if (!value) {
      uni.setNavigationBarTitle({
        title: t("app.home.login"),
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
  @apply w-full flex-x-center position-absolute top-135.5 left-0;
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
