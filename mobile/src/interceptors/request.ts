/*
 * @Date: 2025-07-03 15:10:43
 * @LastEditors: parker 960822987@qq.com
 * @LastEditTime: 2025-08-04 13:30:31
 * @FilePath: \mobile\src\interceptors\request.ts
 */
/* eslint-disable no-param-reassign */
import qs from "qs"
import { useLangStore, useUserStore } from "@/store"

export type CustomRequestOptions = UniApp.RequestOptions & {
  query?: Record<string, any>
} & IUniUploadFileOptions

let baseURL = import.meta.env.VITE_SERVER_BASEURL

// #ifdef MP-WEIXIN
baseURL = "http://localhost:3001"
// #endif

const httpInterceptor = {
  invoke(options: CustomRequestOptions) {
    if (options.query) {
      const queryStr = qs.stringify(options.query)
      if (options.url.includes("?")) {
        options.url += `&${queryStr}`
      } else {
        options.url += `?${queryStr}`
      }
    }

    // #ifdef H5
    if (process.env.NODE_ENV !== "development" && !options.url.includes("https://innoai")) {
      options.url = baseURL + options.url
    }
    // #endif

    // #ifdef MP-WEIXIN
    options.url = baseURL + options.url
    // #endif

    options.timeout = 10000
    options.header = {
      platform: "mp-weixin",
      ...options.header,
    }

    const userStore = useUserStore()
    const token = userStore.token || ""
    if (token) {
      options.header.Authorization = `Bearer ${token}`
    }

    const langStore = useLangStore()
    const lang = langStore.lang || "zh_CN"
    if (lang) {
      options.header["x-current-language"] = lang
    }

    // #ifdef H5
    options.header["x-current-origin"] = 2
    // #endif

    // #ifdef MP-WEIXIN
    options.header["x-current-origin"] = 5
    // #endif
  },
}

export const requestInterceptor = {
  install() {
    uni.addInterceptor("request", httpInterceptor)
    uni.addInterceptor("uploadFile", httpInterceptor)
  },
}
