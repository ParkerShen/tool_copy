/* eslint-disable no-param-reassign */
import qs from "qs"
import { useLangStore, useUserStore } from "@/store"

export type CustomRequestOptions = UniApp.RequestOptions & {
  query?: Record<string, any>
} & IUniUploadFileOptions // 添加uni.uploadFile参数类型

// 请求根地址
let baseURL = import.meta.env.VITE_SERVER_BASEURL

// #ifdef MP-WEIXIN
baseURL = "https://sit-api.guardforceai.cn"
// #endif

// 拦截器配置
const httpInterceptor = {
  // 拦截前触发
  invoke(options: CustomRequestOptions) {
    // 接口请求支持通过 query 参数配置 queryString
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

    // 2. 请求超时
    options.timeout = 10000 // 10s
    // 3. 添加小程序端请求头标识
    options.header = {
      platform: "mp-weixin", // 可选值与 uniapp 定义的平台一致，告诉后台来源
      ...options.header,
    }
    // 4. 添加 token 请求头标识
    const userStore = useUserStore()
    const token = userStore.token || ""
    if (token) {
      options.header.Authorization = `Bearer ${token}`
    }
    // 5. 添加 语言 请求头标识
    const langStore = useLangStore()
    const lang = langStore.lang || "zh_CN"
    if (lang) {
      options.header["x-current-language"] = lang
    }
    // 6. 添加 渠道 请求头标识
    // #ifdef H5
    options.header["x-current-origin"] = 2
    // #endif

    // #ifdef MP-WEIXIN
    options.header["x-current-origin"] = 5
    // #endif

    // 6. 添加 文件上传 请求头标识
    // if (options.url.includes("portrait_upload")) {
    //   options.header["Content-Type"] = "multipart/form-data"
    // }

    // if (options.url.includes("language_doc")) {
    //   options.header["Cache-Control"] = "no-cache"
    // }
  },
}

export const requestInterceptor = {
  install() {
    // 拦截 request 请求
    uni.addInterceptor("request", httpInterceptor)
    // 拦截 uploadFile 文件上传
    uni.addInterceptor("uploadFile", httpInterceptor)
  },
}
