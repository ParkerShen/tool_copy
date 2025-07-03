/**
 * 券包列表对象
 */
export interface CouponRecordVo {
  /**
   * id
   */
  _id?: any
  /**
   * 核销码
   */
  code?: string
  /**
   * 优惠券名称
   */
  name?: string
  /**
   * 优惠券名称
   */
  coupon_name?: string
  /**
   * 封面图
   */
  image?: string
  /**
   * 店铺logo图片，最多4张
   */
  storeLogos?: string[]
  /**
   * 优惠券二维码
   */
  qr_code_flag?: string
  /**
   * 使用规则
   */
  rule?: string
  /**
   * 状态，1：未使用，2：已使用，3：已过期
   */
  usage_status?: number
  /**
   * 生效时间
   */
  start_time?: string
  /**
   * 失效时间
   */
  end_time?: string
}

/**
 * 券包列表分页
 */
export type CouponRecordPageResult = PageResult<CouponRecordVo[]>

/**
 * 店铺一级分类
 */
export interface StoreCategoryVo {
  /**
   * id
   */
  _id?: any
  /**
   * 分类名称
   */
  name?: string
}

/**
 * 优惠券列表对象
 */
export interface CouponVo {
  /**
   * id
   */
  _id?: any
  /**
   * 优惠券领取记录id
   */
  coupon_record_id?: string
  /**
   * 优惠券名称
   */
  name?: string
  /**
   * 优惠券图标
   */
  icon?: string
  /**
   * 开始时间
   */
  utc_start_time?: string
  /**
   * 结束时间
   */
  utc_end_time?: string
  /**
   * 领取状态，1：未领取，2：已领取, 3：今日已领取
   */
  receive_status?: number
  /**
   * 优惠券类型，1：不限次数，2：只限一次，3：每天一次
   */
  join_type?: number
  /**
   * 总数量
   */
  total?: number
  /**
   * 使用数量
   */
  use_total?: number
  /**
   * 领取数量
   */
  receive_total?: number
  /**
   * 剩余数量
   */
  residue_number?: number
  /**
   * 店铺logo图片，最多4张
   */
  storeLogos?: string[]
  /**
   * 使用范围，1：所有店铺，2：指定店铺
   */
  use_scope_type?: number
  /**
   * 店铺信息
   */
  store_info?: {
    /**
     * 店铺id
     */
    _id?: string
    /**
     * 店铺名称
     */
    store_name?: string
    /**
     * 店铺logo
     */
    store_logo?: string
  }[]
}

/**
 * 优惠券列表分页
 */
export type CouponPageResult = PageResult<CouponVo[]>

/**
 * 优惠券二维码携带信息
 */
export interface CouponQrcodeVo {
  /**
   * 优惠券id
   */
  coupon_id?: string
  /**
   * 设备序列号
   */
  device_name?: string
}
