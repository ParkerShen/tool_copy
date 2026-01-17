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
      <text class="fw-bold font-size-48rpx color-#333">{{ $t("app.home.changePassword") }}</text>
      <lang-select />
    </view>
  </view>

  <view class="form-content">
    <wd-form ref="form" :model="formData">
      <wd-cell-group>
        <wd-cell :title="t('app.home.newPassword')" required>
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
        <wd-button size="large" block custom-class="submit-btn" @click="handleSubmit">
          {{ $t("app.home.submit") }}
        </wd-button>
      </view>
    </wd-form>
  </view>
</template>

<script lang="ts" setup>
import { currRoute } from "@/utils"
import { useUserStore, useCouponStore, useLangStore } from "@/store"
import { useToast } from "wot-design-uni"
import LangSelect from "./components/lang-select.vue"
import { RegCaptchaData, SigninData } from "@/api/user/types"
import { resetPassword } from "@/api/user"
import i18n from "@/locale/index"

const { t } = i18n.global as any

const userStore = useUserStore()

const langStore = useLangStore()

const couponStore = useCouponStore()

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

const isTel = ref(false)

const form = ref()

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

function handleSubmit() {
  checkForm()
  form.value
    .validate()
    .then((option: { valid: string }) => {
      const { valid } = option
      if (valid && formData.value.password) {
        resetPassword(formData.value.password)
          .then(() => {
            const navBack = couponStore.couponRouter
            uni.showToast({
              icon: "success",
              duration: 1500,
              position: "top",
              title: t("app.home.passwordChangeSuccessful"),
            })
            setTimeout(() => {
              if (navBack) {
                uni.reLaunch({ url: navBack })
                couponStore.clearCouponRouter()
              } else {
                uni.reLaunch({ url: "/" })
              }
            }, 1500)
          })
          .catch((err) => {
            console.log(err)
          })
      }
    })
    .catch((error: any) => {
      console.log(error, "error")
    })
}

onLoad((opt) => {})

onReady(() => {
  uni.setNavigationBarTitle({
    title: t("app.home.changePassword"),
  })
})

watch(
  () => langStore.langPackageLoading,
  (value) => {
    if (!value) {
      uni.setNavigationBarTitle({
        title: t("app.home.changePassword"),
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
