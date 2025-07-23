/*
 * @Date: 2025-07-03 15:10:43
 * @LastEditors: parker 960822987@qq.com
 * @LastEditTime: 2025-07-23 16:19:02
 * @FilePath: \mobile\src\store\index.ts
 */
import { createPinia } from "pinia"
import { createPersistedState } from "pinia-plugin-persistedstate" // 数据持久化

const store = createPinia()
store.use(
  createPersistedState({
    storage: {
      getItem: uni.getStorageSync,
      setItem: uni.setStorageSync,
    },
  }),
)

export default store

// 模块统一导出
export * from "./user"
export * from "./lang"
export * from "./coupon"
// eslint-disable-next-line import/extensions
export * from "./tabbar"
export * from "./bookkeeping"
