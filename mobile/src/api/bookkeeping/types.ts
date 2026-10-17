/*
 * @Date: 2025-07-23 17:04:56
 * @LastEditors: parker 960822987@qq.com
 * @LastEditTime: 2025-07-24 15:40:18
 * @FilePath: \mobile\src\api\bookkeeping\types.ts
 */
/**
 * 接口响应（与 serveradmin 保持一致）
 */
export interface ApiResult<T> {
  code: number
  data: T
  message?: string
}

export interface ApiMessageResult {
  code: number
  message: string
}

/**
 * 月度统计结果
 */
export interface MonthlyStatsResult {
  /** 收入总额 */
  income: number
  /** 支出总额 */
  expense: number
}

export interface RecordCategory {
  /** 分类名称 */
  name: string
  /** 分类图标 */
  icon: string
  /** 分类颜色 */
  color: string
}

/** 记录关联的账户（用于列表展示） */
export interface RecordAccount {
  id: string
  name: string
  icon: string
  color: string
}

/**
 * 每日记录
 */
export interface DailyRecord {
  /** 记录ID */
  id: string | number
  /** 用户ID */
  userId: string
  /** 分类ID */
  categoryId: string | number
  /** 记录类型 */
  type: "income" | "expense"
  /** 金额（元，保留两位小数字符串） */
  amount: string
  /** 金额（整数分，本地模式提供） */
  amountCents?: number
  /** 账户ID（本地模式提供） */
  accountId?: string
  /** 账户信息 */
  account?: RecordAccount
  /** 标题 */
  title: string
  /** 备注 */
  remark?: string
  /** 记录日期 */
  recordDate: string
  /** 记录时间 */
  recordTime: string
  /** 图片（data URL，本地模式提供） */
  images?: string[]
  /** 标签（本地模式提供） */
  tags?: string[]
  /** 创建时间 */
  createdAt: string
  /** 更新时间 */
  updatedAt: string
  /** 分类信息 */
  category: RecordCategory
  /** 系统分类信息（本地模式下与 category 相同，兼容旧模板读取） */
  systemCategory?: RecordCategory
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
  /** 当日收入（分，本地模式） */
  dayIncomeCents?: number
  /** 当日支出（分，本地模式） */
  dayExpenseCents?: number
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
  categoryId: string | number
  /** 记录类型 */
  type?: "income" | "expense"
  /** 金额（服务端接受数字或字符串） */
  amount: number | string
  /** 账户ID（本地模式） */
  accountId?: string
  /** 标题 */
  title?: string
  /** 备注 */
  remark?: string
  /** 记录日期 */
  recordDate: string
  /** 记录时间 */
  recordTime?: string
  /** 图片（data URL，最多 3 张） */
  images?: string[]
  /** 标签（最多 5 个） */
  tags?: string[]
}

/** 标签使用次数 */
export interface TagUsage {
  name: string
  count: number
}

/**
 * 更新记录请求参数（允许携带页面上的附加字段）
 */
export type UpdateRecordRequest = Partial<CreateRecordRequest> & { [key: string]: any }

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

/**
 * 创建分类请求参数
 */
export interface CreateCategoryRequest {
  name: string
  type: "income" | "expense"
  icon?: string
  color?: string
}

/** 更新分类请求 */
export interface UpdateCategoryRequest {
  name?: string
  icon?: string
  color?: string
  sortOrder?: number
}

/** 账户类型 */
export type AccountType = "cash" | "debit" | "credit" | "ewallet" | "other"

/** 账户 */
export interface Account {
  id: string
  userId?: string
  name: string
  type: AccountType
  icon: string
  color: string
  /** 期初余额（分） */
  initialBalanceCents: number
  archived: boolean
  sortOrder: number
  isSystem: boolean
  createdAt: string
  updatedAt: string
}

/** 账户 + 实时余额（分） */
export interface AccountBalance extends Account {
  incomeCents: number
  expenseCents: number
  /** 期初 + 收入 − 支出 */
  balanceCents: number
  recordCount: number
}

export interface CreateAccountRequest {
  name: string
  type: AccountType
  icon?: string
  color?: string
  /** 期初余额（分，可为负） */
  initialBalanceCents?: number
  sortOrder?: number
}

export interface UpdateAccountRequest {
  name?: string
  type?: AccountType
  icon?: string
  color?: string
  initialBalanceCents?: number
  sortOrder?: number
  archived?: boolean
}

/** 日期范围（两端包含） */
export interface DateRange {
  start: string
  end: string
}

/** 记录筛选条件 */
export interface RecordFilters extends DateRange {
  type?: "income" | "expense"
  accountId?: string
  categoryId?: string
}

/** 区间收支汇总（分） */
export interface RangeStats {
  incomeCents: number
  expenseCents: number
  netCents: number
  recordCount: number
}

/** 账户区间统计 + 当前余额 */
export interface AccountPeriodStats extends RangeStats {
  accountId: string
  balanceCents: number
}

/** 分类排行（分） */
export interface CategoryStat {
  categoryId: string
  name: string
  icon: string
  color: string
  type: "income" | "expense"
  totalCents: number
  count: number
  /** 占同类型总额百分比，保留一位小数 */
  percent: number
}

/** 按日汇总（分，仅含有数据的日期） */
export interface DailyStat {
  date: string
  amountCents: number
  count: number
}

/**
 * 本地数据库概览
 */
export interface LocalDatabaseStats {
  recordCount: number
  categoryCount: number
  customCategoryCount: number
  firstRecordDate: string | null
  lastRecordDate: string | null
  totalIncome: number
  totalExpense: number
  /** .sqlite 文件字节数 */
  size: number
  /** 是否因 IndexedDB 不可用而只能保存在内存中 */
  memoryOnly: boolean
}
