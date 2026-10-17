/**
 * 活动列表对象
 */
export interface ActivityVo {
  /**
   * id
   */
  _id?: any
  /**
   * 活动名称
   */
  name?: string
  /**
   * 活动封面图
   */
  image?: string
  /**
   * 活动背景图
   */
  background_image?: string
  /**
   * 活动规则
   */
  rule?: string
  /**
   * 活动模板地址
   */
  url?: string
  /**
   * 状态
   */
  status?: 0 | 1
  /**
   * 开始时间
   */
  start_time?: string
  /**
   * 截至时间
   */
  end_time?: string
}

/**
 * 活动列表分页
 */
export type ActivityPageResult = PageResult<ActivityVo[]>
