import pagesJson from "@/pages.json"
import { translate as t } from "@/locale/index"

console.log(pagesJson)

/** 判断当前页面是否是tabbar页  */
export const getIsTabbar = () => {
  if (!Object.keys(pagesJson).includes("tabBar")) {
    return false
  }
  const pages = getCurrentPages()
  const lastPage = getLastItem(pages)
  const currPath = lastPage.route
  return !!pagesJson.tabBar.list.find((e) => e.pagePath === currPath)
}

/**
 * test i18n in not .vue file
 */
export const testI18n = () => {
  console.log(t("app.name"))
  // 下面同样生效
  uni.showModal({
    title: "i18n 测试",
    content: t("app.name"),
  })
}
/**
 * 获取当前页面路由的 path 路劲和 redirectPath 路径
 * path 如 ‘/pages/login/index’
 * redirectPath 如 ‘/pages/demo/base/route-interceptor’
 */
export const currRoute = () => {
  const pages = getCurrentPages()
  console.log("pages:", pages)

  const lastPage = getLastItem(pages)
  const currRoute = (lastPage as any).$page
  // console.log('lastPage.$page:', currRoute)
  // console.log('lastPage.$page.fullpath:', currRoute.fullPath)
  // console.log('lastPage.$page.options:', currRoute.options)
  // console.log('lastPage.options:', (lastPage as any).options)
  // 经过多端测试，只有 fullPath 靠谱，其他都不靠谱
  const { fullPath } = currRoute as { fullPath: string }
  console.log(fullPath)
  // eg: /pages/login/index?redirect=%2Fpages%2Fdemo%2Fbase%2Froute-interceptor (小程序)
  // eg: /pages/login/index?redirect=%2Fpages%2Froute-interceptor%2Findex%3Fname%3Dfeige%26age%3D30(h5)
  return getUrlObj(fullPath)
}

const ensureDecodeURIComponent = (url: string): string => {
  if (url.startsWith("%")) {
    return ensureDecodeURIComponent(decodeURIComponent(url))
  }
  return url
}
/**
 * 解析 url 得到 path 和 query
 * 比如输入url: /pages/login/index?redirect=%2Fpages%2Fdemo%2Fbase%2Froute-interceptor
 * 输出: {path: /pages/login/index, query: {redirect: /pages/demo/base/route-interceptor}}
 */
export const getUrlObj = (url: string) => {
  const [path, queryStr] = url.split("?")
  console.log(path, queryStr)

  const query: Record<string, string> = {}
  queryStr.split("&").forEach((item) => {
    const [key, value] = item.split("=")
    console.log(key, value)
    query[key] = ensureDecodeURIComponent(value) // 这里需要统一 decodeURIComponent 一下，可以兼容h5和微信y
  })
  return { path, query }
}
/**
 * 得到所有的需要登录的pages，包括主包和分包的
 * 这里设计得通用一点，可以传递key作为判断依据，默认是 needLogin, 与 route-block 配对使用
 * 如果没有传 key，则表示所有的pages，如果传递了 key, 则表示通过 key 过滤
 */
export const getAllPages = (key = "needLogin") => {
  // 这里处理主包
  const pages = [
    ...pagesJson.pages
      .filter((page: any) => !key || page[key])
      .map((page) => ({
        ...page,
        path: `/${page.path}`,
      })),
  ]
  // 这里处理分包
  const subPages: any[] = []
  pagesJson.subPackages.forEach((subPageObj) => {
    // console.log(subPageObj)
    const { root } = subPageObj

    subPageObj.pages
      .filter((page: any) => !key || page[key])
      .forEach((page: { path: string } & Record<string, any>) => {
        subPages.push({
          ...page,
          path: `/${root}/${page.path}`,
        })
      })
  })
  const result = [...pages, ...subPages]
  console.log(`getAllPages by ${key} result: `, result)
  return result
}

/**
 * 得到所有的需要登录的pages，包括主包和分包的
 * 只得到 path 数组
 */
export const getNeedLoginPages = (): string[] => getAllPages("needLogin").map((page) => page.path)

/**
 * 得到所有的需要登录的pages，包括主包和分包的
 * 只得到 path 数组
 */
export const needLoginPages: string[] = getAllPages("needLogin").map((page) => page.path)

/** 主要是处理 arr.at(-1) 在安卓机上运行报错的 兼容性问题 */
export const getArrElementByIdx = (arr: any[], index: number) => {
  if (index < 0) return arr[arr.length + index]
  if (index >= arr.length) return undefined
  return arr[index]
}

export const getLastItem = (arr: any[]) => getArrElementByIdx(arr, -1)

/**
 * 过滤参数
 * @returns
 */
export const formatParams = (data: any, isTel: boolean) => {
  const params = { ...data }
  if (isTel) {
    params.phone_number = params.account
    delete params.email
  } else {
    params.email = params.account
    delete params.phone_number
    delete params.phone_area
  }
  delete params.account
  return params
}

/**
 * 格式化参数
 */
function filterKey(key: string) {
  // 特殊处理一下时间key
  if (key.includes("_begin") || key.includes("_end")) {
    return key.replace("_begin", "").replace("_end", "")
  }
  return key
}

export function formatQueryParams(params: any, cz: any) {
  const result = {
    limit: params.limit,
    page: params.page,
    log: params.log,
    queryGroups: [] as any,
  }

  // 遍历 params 对象中的属性
  for (const key in params) {
    // 排除 limit、page、log 属性
    if (key !== "limit" && key !== "page" && key !== "log") {
      if (params[key] === 0 || params[key]) {
        const val = typeof params[key] === "string" ? params[key].trim() : params[key]
        result.queryGroups.push([filterKey(key), cz[key], val])
      }
    }
  }

  result.queryGroups = JSON.stringify(result.queryGroups)

  return result
}

/**
 * 防抖函数
 * @param func
 * @param delay
 * @returns
 */
export const debounce = (func: any, delay: number) => {
  let timeout: string | number | NodeJS.Timeout
  return (...args: any) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), delay)
  }
}

/**
 * 节流函数
 * @param func
 * @param limit
 * @returns
 */
export const throttle = (func: any, limit: number) => {
  let lastFunc: string | number | NodeJS.Timeout
  let lastRan: number

  return (...args: any) => {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const context = this
    if (!lastRan) {
      func.apply(context, args)
      lastRan = Date.now()
    } else {
      clearTimeout(lastFunc)
      lastFunc = setTimeout(
        () => {
          if (Date.now() - lastRan >= limit) {
            func.apply(context, args)
            lastRan = Date.now()
          }
        },
        limit - (Date.now() - lastRan),
      )
    }
  }
}

/**
 * 获取url参数
 * @returns
 */
export function getDeviceName(url: string) {
  const regex = /[?&]device_name=([^&]*)/ // 匹配 device_name 后面的值
  const match = url.match(regex)
  return match ? decodeURIComponent(match[1]) : null // 解码并返回值
}

export function getCouponId(url: string) {
  const regex = /[?&]coupon_id=([^&]*)/ // 匹配 coupon_id 后面的值
  const match = url.match(regex)
  return match ? decodeURIComponent(match[1]) : null // 解码并返回值
}
