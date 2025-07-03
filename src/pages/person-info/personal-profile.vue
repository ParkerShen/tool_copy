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
        <wd-cell :title="t('app.home.personalIntroduction')">
          <view class="input-box">
            <wd-textarea
              no-border
              clearable
              v-model="data"
              :placeholder="t('app.home.personalLimtWord')"
              custom-class="input-root"
              :show-word-limit="true"
              :maxlength="150"
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
          :disabled="!data"
        >
          {{ $t("app.global.save") }}
        </wd-button>
      </view>
    </wd-form>
  </view>
</template>

<script lang="ts" setup>
import { putUserInfo } from "@/api/user"
import i18n from "@/locale/index"
import { useUserStore } from "@/store"

const { t } = i18n.global as any

const userStore = useUserStore()

const formData = ref({})

const data = ref("")

const form = ref()

function handleSubmit() {
  putUserInfo({ introduction: data.value }).then(() => {
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
    title: t("app.home.modifyPersonalIntroduction"),
  })
})

watch(
  () => userStore.userInfo.introduction,
  (value) => {
    if (value) {
      data.value = value
    }
  },
  {
    immediate: true,
    deep: true,
  },
)
</script>

<style lang="scss" scoped>
page {
  height: 100%;
  background: #fff;
}

.form-content {
  @apply w-full center mt-6;

  flex-direction: column;
}

.footer {
  @apply pos-absolute w-83.75 bottom-6 ml--41.875;

  left: 50%;
}

:deep(.input-root) {
  @apply w-73.75 ml-3 mr-5;

  flex-direction: column;
  align-items: flex-start !important;
  padding: 0 !important;
}

:deep(.input-box) {
  @apply flex-x-between mt-1.5 mb-5 pt-1;

  background: #fff;
  border: 0.0625rem solid #ddd;
  border-radius: 0.25rem;
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

:deep(uni-textarea) {
  height: 3.5rem !important;
}

:deep(.wd-textarea__inner) {
  @apply font-size-3.5 line-height-normal;
}

:deep(.wd-textarea__value.is-show-limit) {
  padding-bottom: 1.8rem !important;
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
