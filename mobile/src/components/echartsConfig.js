/*
 * @Date: 2025-07-15 14:30:06
 * @LastEditors: parker 960822987@qq.com
 * @LastEditTime: 2025-07-15 14:30:16
 * @FilePath: \mobile\src\components\echartsConfig.js
 */
import * as echarts from "echarts"

// 解决小程序端报错问题
if (typeof window === "undefined") {
  global.window = {}
}

export { echarts }
