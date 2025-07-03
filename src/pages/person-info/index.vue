<route lang="json5">
{
  style: { navigationBarTitleText: "" },
}
</route>
<template>
  <view class="main-container">
    <view class="menu-list">
      <view class="menu-item">
        <view class="center">
          <text class="font-size-4 color-#333 font-bold">{{ $t("app.home.avatar") }}</text>
        </view>
        <view class="menu-item-right">
          <image v-if="userInfo.portrait" :src="userInfo.portrait" @click="upload" />
          <image
            v-else
            src="https://innoai-01.oss-cn-shenzhen.aliyuncs.com/home/my/avator.png"
            mode="aspectFit"
            @click="upload"
          />
          <wd-icon class="color-#999 font-size-5.5" name="chevron-right"></wd-icon>
        </view>
      </view>
      <view class="menu-item">
        <view class="center">
          <text class="font-size-4 color-#333 font-bold">{{ $t("app.home.nickname") }}</text>
        </view>
        <view class="menu-item-right" @click="navigatorTo('/pages/person-info/nick-name')">
          <text v-if="userInfo.nick_name" class="introduction ellipsis">
            {{ userInfo.nick_name }}
          </text>
          <text v-else class="value-placeholder">{{ $t("app.home.fillNickname") }}</text>
          <wd-icon class="color-#999 font-size-5.5" name="chevron-right"></wd-icon>
        </view>
      </view>
      <view class="menu-item">
        <view class="center">
          <text class="font-size-4 color-#333 font-bold">{{ $t("app.home.gender") }}</text>
        </view>
        <wd-picker
          :columns="genderOptions"
          value-key="value"
          label-key="label"
          v-model="userInfo.gender"
          use-default-slot
          @confirm="putGender"
        >
          <view class="menu-item-right">
            <text v-if="userInfo.gender">{{ genderMap[userInfo.gender] }}</text>
            <text v-else class="value-placeholder">{{ $t("app.home.pleaseSelect") }}</text>
            <wd-icon class="color-#999 font-size-5.5" name="chevron-right"></wd-icon>
          </view>
        </wd-picker>
      </view>
      <view class="menu-item">
        <view class="center">
          <text class="font-size-4 color-#333 font-bold">
            {{ $t("app.home.personalIntroduction") }}
          </text>
        </view>
        <view class="menu-item-right" @click="navigatorTo('/pages/person-info/personal-profile')">
          <text v-if="userInfo.introduction" class="introduction ellipsis">
            {{ userInfo.introduction }}
          </text>
          <text v-else class="value-placeholder">{{ $t("app.home.addPersonalIntroduction") }}</text>
          <wd-icon class="color-#999 font-size-5.5" name="chevron-right"></wd-icon>
        </view>
      </view>
      <view class="menu-item">
        <view class="center">
          <text class="font-size-4 color-#333 font-bold">{{ $t("app.home.birthday") }}</text>
        </view>
        <wd-datetime-picker
          type="date"
          v-model="birthday"
          use-default-slot
          :min-date="-1893456000000"
          :max-date="new Date().getTime()"
          @confirm="putBirthday"
        >
          <view class="menu-item-right">
            <text v-if="userInfo.birthday">
              {{ moment(birthday).format("YYYY-MM-DD") }}
            </text>
            <text v-else class="value-placeholder">{{ $t("app.home.pleaseSelect") }}</text>
            <wd-icon class="color-#999 font-size-5.5" name="chevron-right"></wd-icon>
          </view>
        </wd-datetime-picker>
      </view>
      <view class="menu-item">
        <view class="center">
          <text class="font-size-4 color-#333 font-bold">{{ $t("app.home.phoneNumber") }}</text>
        </view>
        <view class="menu-item-right" @click="navigatorTo('/pages/person-info/phone')">
          <text v-if="userInfo.phone">{{ userInfo.phone }}</text>
          <text v-else class="value-placeholder">{{ $t("app.home.fillPhoneNumber") }}</text>
          <wd-icon class="color-#999 font-size-5.5" name="chevron-right"></wd-icon>
        </view>
      </view>
      <view class="menu-item">
        <view class="center">
          <text class="font-size-4 color-#333 font-bold">{{ $t("app.home.email") }}</text>
        </view>
        <view class="menu-item-right" @click="navigatorTo('/pages/person-info/email')">
          <text v-if="userInfo.email">{{ userInfo.email }}</text>
          <text v-else class="value-placeholder">{{ $t("app.home.fillEmail") }}</text>
          <wd-icon class="color-#999 font-size-5.5" name="chevron-right"></wd-icon>
        </view>
      </view>
    </view>
    <wd-img-cropper
      v-model="cropperVisible"
      :img-src="cropperUrl"
      @confirm="handleConfirm"
    ></wd-img-cropper>
  </view>
</template>

<script lang="ts" setup>
import { useLangStore, useUserStore } from "@/store"
import i18n from "@/locale/index"
import moment from "moment"
import { UserData } from "@/api/user/types"
import { putUserInfo } from "@/api/user"
import { uploadPortrait } from "@/api/file"

const { t } = i18n.global as any

const userStore = useUserStore()

const langStore = useLangStore()

const birthday = ref<number>(Date.now())

const userInfo = ref<UserData>({})

const genderOptions = [
  {
    label: t("app.home.male"),
    value: 1,
  },
  {
    label: t("app.home.female"),
    value: 2,
  },
]

const genderMap: Record<number, string> = {
  1: t("app.home.male"),
  2: t("app.home.female"),
}

const cropperVisible = ref(false)

const cropperUrl = ref("")

const upload = () => {
  uni.chooseImage({
    count: 1,
    success: (res) => {
      const tempFilePaths = res.tempFilePaths[0]
      cropperUrl.value = tempFilePaths
      cropperVisible.value = true
    },
  })
}

const handleConfirm = (event: { tempFilePath: string }) => {
  const { tempFilePath } = event
  userInfo.value.portrait = tempFilePath
  uploadAvator(event)
}

const uploadAvator = (event: { tempFilePath: string }) => {
  uploadPortrait({ file: event }).then(({ data }) => {
    putAvatar(data.url)
  })
}

// 修改性别
const putGender = (event: { value: string }) => {
  putUserInfo({ gender: event.value }).then(() => {
    uni.showToast({
      title: t("app.home.modifySuccess"),
      icon: "success",
      duration: 1000,
    })
    setTimeout(() => {
      userStore.setUserInfo()
    }, 1000)
  })
}

// 修改生日
const putBirthday = (event: { value: moment.MomentInput }) => {
  putUserInfo({ birthday: moment(event.value).format("YYYY-MM-DD") }).then(() => {
    uni.showToast({
      title: t("app.home.modifySuccess"),
      icon: "success",
      duration: 1000,
    })
    setTimeout(() => {
      userStore.setUserInfo()
    }, 1000)
  })
}

// 修改头像
const putAvatar = (url: string) => {
  putUserInfo({ portrait: url }).then(() => {
    uni.showToast({
      title: t("app.home.modifySuccess"),
      icon: "success",
      duration: 1000,
    })
    setTimeout(() => {
      userStore.setUserInfo()
    }, 1000)
  })
}

const navigatorTo = (path: string) => {
  // #ifdef MP-WEIXIN
  if (path === "/pages/person-info/phone" || path === "/pages/person-info/email") {
    return false
  }
  // #endif
  uni.navigateTo({ url: path })
}

onShow((opt) => {
  userStore.setUserInfo()
})

watch(
  () => langStore.langPackageLoading,
  (value) => {
    if (!value) {
      uni.setNavigationBarTitle({
        title: t("app.home.personalInfo"),
      })
    }
  },
  {
    immediate: true,
  },
)

watch(
  () => userStore.userInfo,
  (value) => {
    if (value) {
      Object.assign(userInfo.value, value)

      if (value.birthday) {
        birthday.value = new Date(value.birthday).getTime()
      }
    }
  },
  {
    immediate: true,
    deep: true,
  },
)
</script>

<style scoped lang="scss">
page {
  height: 100%;
  background: #fff;
}

.main-container {
  @apply px-5 pt-5;

  .menu-list {
    @apply py-2;

    .menu-item {
      @apply h-14 flex-x-between;

      .menu-item-right {
        @apply flex-y-center font-size-3.5 color-#333;

        .value-placeholder {
          color: #999;
        }

        > image {
          @apply w-12 h-12;

          border-radius: 50%;
        }

        .introduction {
          @apply w-40;

          text-align: right;
        }
      }
    }
  }
}
</style>
