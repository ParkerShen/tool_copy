import { CustomRequestOptions } from "@/interceptors/request"
import { useUserStore, useLangStore, useCouponStore } from "@/store"
import i18n from "@/locale/index"

const { t } = i18n.global as any

const loadingMap: Record<string, string> = {
  zh_CN: "加载中...",
  zh_HK: "加載中…",
  en_US: "loading...",
  th_TH: "กำลังโหลด...",
}

const loginTipsMap: Record<string, string> = {
  zh_CN: "请登录",
  zh_HK: "請登入",
  en_US: "Please login",
  th_TH: "กรุณาเข้าสู่ระบบ",
}

export const http = <T>(options: CustomRequestOptions) => {
  const langStore = useLangStore()
  if (options.method === "GET" && !options.url.includes("language_doc")) {
    uni.showToast({
      title: loadingMap[langStore.lang],
      icon: "loading",
      duration: 30000,
    })
  }
  // 1. 返回 Promise 对象
  return new Promise<IResData<T>>((resolve, reject) => {
    uni.request({
      ...options,
      dataType: "json",
      // #ifndef MP-WEIXIN
      responseType: "json",
      // #endif
      // 响应成功
      success(res) {
        if (options.method === "GET") {
          setTimeout(() => {
            uni.hideToast()
          }, 300)
        }
        const userStore = useUserStore()
        const data = res.data as IResData<T>
        // 状态码 2xx，参考 axios 的设计
        if (data.code === 200) {
          // 2.1 提取核心数据 res.data
          resolve(data)
        } else if (data.code === 401) {
          // 401错误  -> 清理用户信息，跳转到登录页
          const couponStore = useCouponStore()
          userStore.clearToken()
          userStore.clearUserInfo()
          // #ifdef H5
          if (location.hash.slice(1).includes("/pages/coupon/index")) {
            couponStore.setCouponRouter(location.hash.slice(1))
          }
          // #endif
          uni.showToast({
            icon: "error",
            duration: 2000,
            position: "top",
            title: loginTipsMap[langStore.lang],
            success() {
              // #ifdef H5
              setTimeout(() => {
                uni.reLaunch({ url: "/pages/login/index" })
              }, 1000)
              // #endif
            },
          })
          // reject(res)
        } else {
          // 其他错误 -> 根据后端错误信息轻提示
          if (res.header["content-type"] === "application/json") {
            resolve(data)
            return
          }
          if (options.responseType === "text") {
            resolve(data)
            return
          }
          if (data.data && Object.prototype.hasOwnProperty.call(data.data, "verify_result")) {
            resolve(data)
            return
          }
          if (
            options.url.includes("coupon/receive") &&
            [80711008, 80711009, 80711010].includes(data.code)
          ) {
            resolve(data)
            return
          }
          if (!options.url.includes("join") || options.url.includes("receive")) {
            uni.showToast({
              icon: "error",
              duration: 2000,
              position: "top",
              title: t("err." + data.code) || "Request Error",
            })
          }
          reject(data)
        }
      },
      // 响应失败
      fail(err) {
        uni.showToast({
          icon: "error",
          title: "Network Error",
        })
        reject(err)
      },
    })
  })
}

// uni.uploadFile封装
export const uniFileUpload = <T>(options: CustomRequestOptions) => {
  // 1. 返回 Promise 对象
  return new Promise<IResData<T>>((resolve, reject) => {
    uni.uploadFile({
      ...options,
      // 响应成功
      success(res) {
        // 状态码 2xx，参考 axios 的设计
        const data = JSON.parse(res.data) as IResData<T>
        if (data.code === 0) {
          resolve(data)
        } else if (res.statusCode === 401) {
          // 401错误  -> 清理用户信息，跳转到登录页
          // userStore.clearUserInfo()
          // uni.navigateTo({ url: '/pages/login/login' })
          reject(res)
        } else {
          // 其他错误 -> 根据后端错误信息轻提示
          uni.showToast({
            icon: "error",
            duration: 2000,
            position: "top",
            title: "Upload Error",
          })
          reject(res)
        }
      },
      // 响应失败
      fail(err) {
        uni.showToast({
          icon: "error",
          title: "Network Error",
        })
        reject(err)
      },
    })
  })
}
