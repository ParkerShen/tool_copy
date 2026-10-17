/*
 * @Date: 2025-07-23 17:04:56
 * @LastEditors: parker 960822987@qq.com
 * @LastEditTime: 2025-07-24 15:40:18
 * @FilePath: \mobile\src\api\bookkeeping\types.ts
 */
/**
 * 月度统计结果
 */
export interface MonthlyStatsResult {
  /** 收入总额 */
  income: number
  /** 支出总额 */
  expense: number
}

/**
 * 每日记录
 */
export interface DailyRecord {
  /** 记录ID */
  id: number
  /** 用户ID */
  userId: string
  /** 分类ID */
  categoryId: number
  /** 记录类型 */
  type: "income" | "expense"
  /** 金额 */
  amount: string
  /** 标题 */
  title: string
  /** 备注 */
  remark?: string
  /** 记录日期 */
  recordDate: string
  /** 记录时间 */
  recordTime: string
  /** 创建时间 */
  createdAt: string
  /** 更新时间 */
  updatedAt: string
  /** 分类信息 */
  category: {
    /** 分类名称 */
    name: string
    /** 分类图标 */
    icon: string
    /** 分类颜色 */
    color: string
  }
}

/**
 * 每日记录分组
 */
export interface DailyRecordGroup {
  /** 日期 */
  date: string
  /** 记录列表 */
  records: DailyRecord[]
  /** 当日收入 */
  dayIncome: number
  /** 当日支出 */
  dayExpense: number
}

/**
 * 图表数据结果
 */
export interface ChartDataResult {
  /** 图表数据数组 */
  data: number[]
}

/**
 * 创建记录请求参数
 */
export interface CreateRecordRequest {
  /** 分类ID */
  categoryId: number
  /** 记录类型 */
  type?: "income" | "expense"
  /** 金额 */
  amount: number
  /** 标题 */
  title?: string
  /** 备注 */
  remark?: string
  /** 记录日期 */
  recordDate: string
  /** 记录时间 */
  recordTime?: string
}

/**
 * 分类信息
 */
export interface Category {
  /** 分类ID */
  id: string | number
  /** 分类名称 */
  name: string
  /** 分类类型 */
  type: "income" | "expense"
  /** 图标标识 */
  icon: string
  /** 颜色 */
  color: string
  /** 排序 */
  sortOrder: number
  /** 是否系统分类 */
  isSystem: boolean
  /** 用户ID */
  userId?: string
  /** 创建时间 */
  createdAt: string
  /** 更新时间 */
  updatedAt: string
  /** 删除时间 */
  deletedAt?: string
  /** 来源标识 */
  source: "system" | "custom"
}
