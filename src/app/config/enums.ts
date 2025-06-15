export enum UserErrorCode {
    USER_NOT_FOUND = 1001,   // 用户名不存在
    PASSWORD_ERROR = 1002,   // 密码错误
    ACCOUNT_LOCKED = 1003    // 账户锁定
  }

/**
 * 认证相关错误码
 */
export enum AuthErrorCode {
    PERMISSION_DENIED = 2001,       // 权限不足
    RATE_LIMIT_EXCEEDED = 2002,    // 接口访问限制
    IP_BLOCKED = 2003              // IP访问受限
}

/**
 * 客户端请求错误码
 */
export enum ClientErrorCode {
    MISSING_PARAMETER = 4001,      // 参数缺失
    INVALID_PARAMETER = 4002,       // 参数格式错误
    RESOURCE_NOT_FOUND = 4003,     // 数据不存在
    RESOURCE_CONFLICT = 4009        // 数据冲突
}

/**
 * 系统内部错误码
 */
export enum SystemErrorCode {
    INTERNAL_ERROR = 5000,         // 系统内部错误
    DATABASE_ERROR = 5001,         // 数据库错误
    THIRD_PARTY_ERROR = 5003,      // 第三方服务异常
    SYSTEM_MAINTENANCE = 5005      // 系统维护中
}
  export enum ShowType {
    SILENT = 0,           // 静默处理
    WARN_MESSAGE = 1,     // 黄色警告提示
    ERROR_MESSAGE = 2,    // 红色错误提示
    NOTIFICATION = 3,     // 右上角通知
    REDIRECT = 9          // 重定向页面
  }

  export enum ErrorCode {
    /**
     * 认证类错误 (1xxx)
     */
    LOGIN_USER_NOT_FOUND = 1001,         // 用户不存在
    LOGIN_PASSWORD_ERROR = 1002,         // 密码错误
    ACCOUNT_LOCKED = 1003,               // 账户已锁定
    CAPTCHA_EXPIRED = 1004,              // 验证码已过期
    CAPTCHA_ERROR = 1005,                // 验证码错误
    TOKEN_INVALID = 1006,                // Token无效
    TOKEN_EXPIRED = 1007,                // Token已过期
    SESSION_EXPIRED = 1008,              // 会话已过期
    PERMISSION_DENIED = 1009,            // 权限不足（需重新登录）
    
    /**
     * 权限类错误 (2xxx)
     */
    ACCESS_FORBIDDEN = 2001,             // 访问被禁止
    API_RATE_LIMIT = 2002,               // 接口访问限制
    IP_BLOCKED = 2003,                   // IP访问受限
    FEATURE_DISABLED = 2004,              // 功能未开启
    LICENSE_EXPIRED = 2005,              // 系统许可证过期
    RESOURCE_NOT_ACCESSIBLE = 2006,      // 资源不可访问
    OPERATION_NOT_ALLOWED = 2007,        // 不允许的操作
    
    /**
     * 数据校验错误 (4xxx)
     */
    PARAM_REQUIRED = 4001,               // 缺少必填参数
    PARAM_FORMAT_ERROR = 4002,           // 参数格式错误
    DATA_NOT_FOUND = 4003,               // 数据不存在
    DATA_CONFLICT = 4004,                // 数据冲突
    DATA_VALIDATION_FAILED = 4005,       // 数据校验失败
    FILE_TYPE_NOT_SUPPORTED = 4006,      // 文件类型不支持
    FILE_SIZE_EXCEEDED = 4007,            // 文件大小超出限制
    UPLOAD_FAILED = 4008,                 // 文件上传失败
    
    /**
     * 业务逻辑错误 (4xxx)
     */
    ORDER_STATUS_ERROR = 4101,           // 订单状态错误
    STOCK_SHORTAGE = 4102,               // 库存不足
    PAYMENT_FAILED = 4103,               // 支付失败
    REFUND_NOT_ALLOWED = 4104,           // 当前不允许退款
    USER_EXISTS = 4105,                  // 用户已存在
    MOBILE_REGISTERED = 4106,             // 手机号已注册
    EMAIL_REGISTERED = 4107,              // 邮箱已注册
    
    /**
     * 系统级错误 (5xxx)
     */
    INTERNAL_SERVER_ERROR = 5000,        // 服务器内部错误
    DATABASE_ERROR = 5001,                // 数据库错误
    EXTERNAL_SERVICE_ERROR = 5002,       // 外部服务异常
    NETWORK_ERROR = 5003,                // 网络连接异常
    SYSTEM_MAINTENANCE = 5004,           // 系统维护中
    CONFIG_ERROR = 5005,                 // 系统配置错误
    UNSUPPORTED_OPERATION = 5006,        // 不支持的操作
    SERVICE_UNAVAILABLE = 5007,            // 服务不可用
    FATAL_ERROR = 5999                    // 致命错误（需人工介入）
  }