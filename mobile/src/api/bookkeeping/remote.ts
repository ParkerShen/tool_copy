/**
 * 远程接口实现：访问 serveradmin 的 /api/miniapp/bookkeepings/*。
 * 仅在 VITE_DATA_MODE === "server" 时使用，standalone 构建不会走这里。
 */
import { http } from "@/utils/http"
import type {
  ApiMessageResult,
  ApiResult,
  Category,
  CreateCategoryRequest,
  CreateRecordRequest,
  DailyRecord,
  DailyRecordGroup,
  MonthlyStatsResult,
  UpdateRecordRequest,
} from "./types"

/** http 的泛型声明与实际响应结构不完全一致，这里统一收窄返回值 */
function messageResult<T>(promise: Promise<IResData<T>>): Promise<ApiMessageResult> {
  return promise as unknown as Promise<ApiMessageResult>
}

/**
 * 获取月度统计数据
 */
export function getMonthlyStats(month: string): Promise<ApiResult<MonthlyStatsResult>> {
  return http<MonthlyStatsResult>({
    url: "/api/miniapp/bookkeepings/monthly-stats",
    method: "GET",
    query: { month },
  })
}

/**
 * 获取每日记录列表
 */
export function getDailyRecords(month: string): Promise<ApiResult<DailyRecordGroup[]>> {
  return http<DailyRecordGroup[]>({
    url: "/api/miniapp/bookkeepings/daily-records",
    method: "GET",
    query: { month },
  })
}

/**
 * 获取月度图表数据
 */
export function getMonthlyChartData(
  month: string,
  type: "income" | "expense" = "expense",
): Promise<ApiResult<number[]>> {
  return http<number[]>({
    url: "/api/miniapp/bookkeepings/chart-data",
    method: "GET",
    query: { month, type },
  })
}

/**
 * 创建记账记录
 */
export function createRecord(data: CreateRecordRequest): Promise<ApiResult<DailyRecord>> {
  return http<DailyRecord>({
    url: "/api/miniapp/bookkeepings/records",
    method: "POST",
    data,
  })
}

/**
 * 更新记账记录
 */
export function updateRecord(
  id: string | number,
  data: UpdateRecordRequest,
): Promise<ApiMessageResult> {
  return messageResult(
    http<null>({
      url: `/api/miniapp/bookkeepings/records/${id}`,
      method: "PUT",
      data,
    }),
  )
}

/**
 * 删除记账记录
 */
export function deleteRecord(id: string | number): Promise<ApiMessageResult> {
  return messageResult(
    http<null>({
      url: `/api/miniapp/bookkeepings/records/${id}`,
      method: "DELETE",
    }),
  )
}

/**
 * 获取分类列表
 */
export function getCategories(type?: "income" | "expense"): Promise<ApiResult<Category[]>> {
  return http<Category[]>({
    url: "/api/miniapp/bookkeepings/categories",
    method: "GET",
    query: type ? { type } : {},
  })
}

/**
 * 新增自定义分类
 */
export function createCategory(
  data: CreateCategoryRequest,
): Promise<ApiResult<Category>> {
  return http<Category>({
    url: "/api/miniapp/bookkeepings/categories",
    method: "POST",
    data,
  })
}

/**
 * 删除自定义分类
 */
export function deleteCategory(id: string | number): Promise<ApiMessageResult> {
  return messageResult(
    http<null>({
      url: `/api/miniapp/bookkeepings/categories/${id}`,
      method: "DELETE",
    }),
  )
}
