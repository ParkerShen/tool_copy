import { createI18n } from "vue-i18n"

import en from "./en.json"
import zhHans from "./zh-Hans.json" // 简体中文

const langMap: Record<string, string> = {
  zh_CN: "zh-Hans",
  zh_HK: "zh-Hant",
  en_US: "en",
  th_TH: "th",
}
let local = "zh-Hans"
// #ifdef MP-WEIXIN
local = uni.getStorageSync("lang") ? JSON.parse(uni.getStorageSync("lang")).lang : "zh-Hans"
// #endif

// #ifdef H5
local = localStorage.getItem("lang")
  ? JSON.parse(localStorage.getItem("lang") || "{lang: zh_CN}").lang
  : "zh-Hans"
// #endif

const messages: Record<string, any> = {
  "zh-Hans": zhHans,
  en,
}

const i18n = createI18n({
  locale: langMap[local], // 获取已设置的语言，fallback 语言需要再 manifest.config.ts 中设置
  messages,
})
console.log(i18n.global.locale)

/**
 * 非 vue 文件使用这个方法
 * @param { string } localeKey 多语言的key，eg: "app.name"
 */
export const translate = (localeKey: string) => {
  if (!localeKey) {
    console.error(`[i18n] Function translate(), localeKey param is required`)
    return ""
  }
  let message = messages[langMap[local]]
  const parts = localeKey.split(".")
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]
    if (message && Object.prototype.hasOwnProperty.call(message, part)) {
      message = message[part]
    } else {
      return localeKey
    }
  }

  return message
}

export function formatI18n(template: any, data: Record<string, any>) {
  return template.replace(/\{(.*?)\}/g, (match: any, key: string) => {
    const keys = key.split(".") // 分割嵌套键
    let value = data

    // 根据键遍历对象
    for (const k of keys) {
      value = value ? value[k] : undefined // 安全访问嵌套属性
      if (value === undefined) break // 如果找不到任何键则退出
    }

    return value !== undefined ? value : match // 返回值或原始匹配项
  })
}

export default i18n
