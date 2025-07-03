import { getUserInfo } from "@/api/user"
import { AgreementVersionData, RegCaptchaData, UserData } from "@/api/user/types"
import { defineStore } from "pinia"
import { ref } from "vue"

const initState = {
  account: "",
  nick_name: "",
  portrait: "",
  email: "",
  phone: "",
  gender: 1,
  introduction: "",
  birthday: "",
}

export const useUserStore = defineStore(
  "user",
  () => {
    const token = ref("")

    const openId = ref("")

    const userInfo = ref<UserData>({ ...initState })

    const countryCode = ref("+86")

    const regUserInfo = ref<RegCaptchaData>({})

    const captchaConfig = ref({ interval: 1 })

    const latitude = ref(0)

    const longitude = ref(0)

    const agreementVersions = ref<AgreementVersionData>({})

    const setToken = (val: string) => {
      token.value = val
      setUserInfo()
    }

    const clearToken = () => {
      token.value = ""
    }

    const setOpenId = (val: string) => {
      openId.value = val
    }

    const setUserInfo = (isLogin: boolean = true) => {
      if (isLogin) {
        getUserInfo().then(({ data }) => {
          userInfo.value = data
        })
      } else {
        clearUserInfo()
      }
    }

    const setCountryCode = (val: string) => {
      countryCode.value = val
    }

    const setRegUserInfo = (val: RegCaptchaData) => {
      regUserInfo.value = val
    }

    const setCaptchaConfig = (val: any) => {
      captchaConfig.value = val
    }

    const setLatitude = (val: number) => {
      latitude.value = val
    }

    const setLongitude = (val: number) => {
      longitude.value = val
    }

    const setAgreementVersions = (val: AgreementVersionData) => {
      agreementVersions.value = val
    }

    const clearUserInfo = () => {
      userInfo.value = { ...initState }
    }
    const reset = () => {
      userInfo.value = { ...initState }
    }
    const isLogined = computed(() => !!token.value && !!userInfo.value.account)

    return {
      token,
      openId,
      userInfo,
      countryCode,
      regUserInfo,
      captchaConfig,
      latitude,
      longitude,
      agreementVersions,
      setToken,
      clearToken,
      setOpenId,
      setUserInfo,
      setCountryCode,
      setRegUserInfo,
      clearUserInfo,
      setCaptchaConfig,
      setLatitude,
      setLongitude,
      setAgreementVersions,
      isLogined,
      reset,
    }
  },
  {
    persist: {
      storage: localStorage,
      paths: ["token", "openId", "userInfo", "regUserInfo", "agreementVersions"],
    },
  },
)
