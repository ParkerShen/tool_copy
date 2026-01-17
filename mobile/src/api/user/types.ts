/**
 * H5登录请求参数
 */
export interface LoginData {
  /**
   * 账号
   */
  account?: string
  /**
   * 手机号
   */
  phone_number?: string
  /**
   * 手机区号
   */
  phone_area?: string
  /**
   * 邮箱
   */
  email?: string
  /**
   * 密码
   */
  password?: string
}

/**
 * 微信小程序已授权手机号登录请求参数
 */
export interface WxLoginData {
  /**
   * 微信小程序id 1: 万事通
   */
  wx_mini_id?: number
  /**
   * wx.login 获得的code
   */
  code?: string
}

/**
 * 微信小程序未授权手机号登录请求参数
 */
export interface WxLoginOrRegData {
  /**
   * 微信小程序id 1: 万事通
   */
  wx_mini_id?: number
  /**
   * 用户openid
   */
  openid?: string
  /**
   * 手机授权组件获取的code
   */
  phone_code?: string
}

/**
 * H5登录响应
 */
export interface LoginResult {
  /**
   * 访问token
   */
  token?: string
  /**
   * 过期时间(单位：毫秒)
   */
  expires?: number
  /**
   * token 类型
   */
  type?: string
}

/**
 * 微信小程序登录响应
 */
export interface WxLoginResult {
  /**
   * 访问token
   */
  token?: string
  /**
   * 用户openid
   */
  openid?: string
  /**
   * 是否已经授权过手机号码
   */
  phone_flag?: boolean
}

/**
 * 微信小程序登录响应
 */
export interface WxLoginOrRegResult {
  /**
   * 访问token
   */
  token?: string
  /**
   * bearer
   */
  type?: string
  /**
   * 过期时间
   */
  expires?: number
}

/**
 * 注册请求参数
 */
export interface SigninData {
  /**
   * 昵称
   */
  nick_name?: string
  /**
   * 账号
   */
  account?: string
  /**
   * 手机号
   */
  phone_number?: string
  /**
   * 手机区号
   */
  phone_area?: string
  /**
   * 邮箱
   */
  email?: string
  /**
   * 密码
   */
  password?: string
  /**
   * 确认密码
   */
  confirmPwd?: string
  /**
   * 验证码
   */
  captcha?: string
  /**
   * 隐私协议版本号
   */
  privacy_agreement_version?: string
  /**
   * 注册协议版本号
   */
  reg_agreement_version?: string
}

/**
 * 注册响应
 */
export interface SigninResult {
  /**
   * 访问token
   */
  token?: string
  /**
   * 过期时间(单位：毫秒)
   */
  expires?: number
  /**
   * token 类型
   */
  type?: string
}

/**
 * 注册验证码
 */
export interface RegCaptchaData {
  /**
   * 账号
   */
  account?: string
  /**
   * 手机号
   */
  phone_number?: string
  /**
   * 手机区号
   */
  phone_area?: string
  /**
   * 邮箱
   */
  email?: string
  /**
   * 验证码参数
   */
  captcha_verify_param?: string
}

/**
 * 注册验证码响应
 */
export interface RegCaptchaResult {
  /**
   * 验证码缓存key
   */
  captchaKey?: string
  /**
   * 验证码图片Base64字符串
   */
  captchaBase64?: string
  /**
   * 验证结果
   */
  verify_result?: string
}

/**
 * 验证码响应
 */
export interface CountrysResult {
  /**
   * 开头字母
   */
  index: string
  /**
   * 验证码图片Base64字符串
   */
  data: {
    name: string
    code: string
  }[]
}

/**
 * 用户信息
 */
export interface UserData {
  /**
   * id
   */
  _id?: string
  /**
   * 账号
   */
  account?: string
  /**
   * 昵称
   */
  nick_name?: string
  /**
   * 头像地址
   */
  portrait?: string
  /**
   * 邮箱
   */
  email?: string
  /**
   * 手机
   */
  phone?: string
  /**
   * 性别，1：男，2：女
   */
  gender?: number
  /**
   * 个人介绍
   */
  introduction?: string
  /**
   * 生日，格式：yyyy-MM-dd
   */
  birthday?: string
  /**
   * 令牌token
   */
  token?: string
}

/**
 * 协议、隐私保护请求参数
 */
export interface AgreementData {
  /**
   * 协议类型 1:用户注册协议 2:隐私保护政策
   */
  type?: number
  /**
   * 经度，拿不到不传，不要传空字符串
   */
  longitude?: number
  /**
   * 纬度，拿不到不传，不要传空字符串
   */
  latitude?: number
}

/**
 * 修改手机号请求参数
 */
export interface UpdatePhoneData {
  /**
   * 手机号码
   */
  phone_number?: string
  /**
   * 手机区号
   */
  phone_area?: string
  /**
   * 验证码
   */
  captcha?: string
}

/**
 * 修改邮箱请求参数
 */
export interface UpdateEmailData {
  /**
   * 邮箱
   */
  email?: string
  /**
   * 验证码
   */
  captcha?: string
}

/**
 * 用户注册协议版本数据
 */
export interface AgreementVersionData {
  /**
   * 注册协议
   */
  reg?: {
    /**
     * 版本
     */
    version?: string
    /**
     * 协议链接
     */
    url?: string
  }
  /**
   * 隐私政策
   */
  privacy_protect?: {
    /**
     * 版本
     */
    version?: string
    /**
     * 协议链接
     */
    url?: string
  }
}
