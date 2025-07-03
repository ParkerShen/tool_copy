import { http } from "@/utils/http"
import { LanguageIndexPageResult } from "./types"

/**
 * 获取语言类型分页数据
 */
export function getVisitorLanguageIndexList(queryParams?: any) {
  return http<LanguageIndexPageResult>({
    url: "/language/home/language_type",
    method: "GET",
    query: queryParams,
  })
}

/**
 * 获取语言包
 */
export function getLanguagePackage(lang?: string) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `https://innoai-01.oss-cn-shenzhen.aliyuncs.com/language_doc/${lang}.json?t=20240808`,
      data: {},
      header: {
        "content-type": "application/json",
      },
      success(res) {
        resolve(res.data)
      },
    })
  })
}
