/*
 * @Date: 2025-07-23 16:56:06
 * @LastEditors: parker 960822987@qq.com
 * @LastEditTime: 2025-07-24 15:37:51
 * @FilePath: \mobile\src\api\bookkeeping\index.ts
 */
import { http } from "@/utils/http"
import type {
  MonthlyStatsResult,
  DailyRecord,
  DailyRecordGroup,
  ChartDataResult,
  CreateRecordRequest,
  Category,
} from "./types"

/**
 * 获取月度统计数据
 */
export function getMonthlyStats(month: string) {
  return http<{ code: number; data: MonthlyStatsResult }>({
    url: "/api/miniapp/bookkeepings/monthly-stats",
    method: "GET",
    query: { month },
  })
}

/**
 * 获取每日记录列表
 */
export function getDailyRecords(month: string) {
  return http<{ code: number; data: DailyRecordGroup[] }>({
    url: "/api/miniapp/bookkeepings/daily-records",
    method: "GET",
    query: { month },
  })
}

/**
 * 获取月度图表数据
 */
export function getMonthlyChartData(month: string, type: "income" | "expense" = "expense") {
  return http<{ code: number; data: number[] }>({
    url: "/api/miniapp/bookkeepings/chart-data",
    method: "GET",
    query: { month, type },
  })
}

/**
 * 创建记账记录
 */
export function createRecord(data: CreateRecordRequest) {
  return http<{ code: number; data: DailyRecord }>({
    url: "/api/miniapp/bookkeepings/records",
    method: "POST",
    data,
  })
}

/**
 * 更新记账记录
 */
export function updateRecord(id: number, data: Partial<DailyRecord>) {
  return http<{ code: number; message: string }>({
    url: `/api/miniapp/bookkeepings/records/${id}`,
    method: "PUT",
    data,
  })
}

/**
 * 删除记账记录
 */
export function deleteRecord(id: number) {
  return http<{ code: number; message: string }>({
    url: `/api/miniapp/bookkeepings/records/${id}`,
    method: "DELETE",
  })
}

/**
 * 获取分类列表
 */
export function getCategories(type?: "income" | "expense") {
  return http<{ code: number; data: Category[] }>({
    url: "/api/miniapp/bookkeepings/categories",
    method: "GET",
    query: type ? { type } : {},
  })
}

// 导出类型
export type {
  MonthlyStatsResult,
  DailyRecord,
  DailyRecordGroup,
  ChartDataResult,
  CreateRecordRequest,
  Category,
}
