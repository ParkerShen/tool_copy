/**
 * 数据库查询类型枚举
 */
export const enum SelectTypeEnum {
  /**
   * 等于
   */
  EQ = "eq",

  /**
   * 模糊查询
   */
  LIKE = "like",
  /**
   * 大于等于
   */
  GTE = "gte",

  /**
   * 大于
   */
  GT = "gt",
  /**
   * 小于等于
   */
  LTE = "lte",

  /**
   * 小于
   */
  LT = "lt",

  /**
   * 范围内
   */
  IN = "in",

  /**
   * 范围外
   */
  NIN = "nin",
}
