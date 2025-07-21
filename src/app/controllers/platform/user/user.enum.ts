export enum UserErrorCode {
    USER_NOT_FOUND = 1001,   // 用户名不存在
    PASSWORD_ERROR = 1002,   // 密码错误
    ACCOUNT_LOCKED = 1003    // 账户锁定
  }
  
  export enum ShowType {
    SILENT = 0,           // 静默处理
    WARN_MESSAGE = 1,     // 黄色警告提示
    ERROR_MESSAGE = 2,    // 红色错误提示
    NOTIFICATION = 3,     // 右上角通知
    REDIRECT = 9          // 重定向页面
  }