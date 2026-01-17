/**
 * 语言类型
 */
export interface LanguageIndexVo {
  /**
   * id
   */
  _id?: any
  /**
   * 状态
   */
  status?: 0 | 1
  /**
   * 语言标识Key
   */
  flag?: string
  /**
   * 对应国家语言
   */
  name?: string
  /**
   * 简称
   */
  abbreviation?: string
  /**
   * 图标地址
   */
  icon?: string
  /**
   * 备注
   */
  remark?: string
  /**
   * 创建时间
   */
  created_at?: string
  /**
   * 更新时间
   */
  updated_at?: string
}

/**
 * 语言类型分页
 */
export type LanguageIndexPageResult = PageResult<LanguageIndexVo[]>
