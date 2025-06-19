import type { RequestOptions } from '@@/plugin-request/request';
import type { RequestConfig } from '@umijs/max';
import { message, notification } from 'antd';
import { history, request } from '@umijs/max';

// 1. 错误类型增强
enum ErrorShowType {
  SILENT = 0,       // 静默处理，不提示用户
  WARN_MESSAGE = 1, // 警告提示（黄色提示）
  ERROR_MESSAGE = 2, // 错误提示（红色提示）
  NOTIFICATION = 3, // 右上角通知提醒
  REDIRECT = 9,     // 重定向到登录页
  TOKEN_EXPIRED = 10, // Token过期专用类型
  TOKEN_INVALID = 11  // Token无效专用类型
}

// 2. 与后端约定的响应数据格式
interface ResponseStructure {
  success: boolean;
  data: any;
  errorCode?: number;
  errorMessage?: string;
  showType?: ErrorShowType;
}

/**
 * 3. Token相关错误码定义
 * 这些错误码应与后端保持一致
 */
enum TokenErrorCode {
  TOKEN_MISSING = 1001,     // Token缺失
  TOKEN_EXPIRED = 1002,     // Token过期
  TOKEN_INVALID = 1003,     // Token无效
  TOKEN_REFRESH_FAILED = 1004 // Token刷新失败
}

/**
 * 4. Token处理工具函数
 */
const tokenUtils = {
  // 检查是否为Token相关错误
  isTokenError: (errorCode?: number) => {
    return errorCode && Object.values(TokenErrorCode).includes(errorCode);
  },
  
  // 处理Token过期
  handleTokenExpired: () => {
    // 清除本地存储的token
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    
    // 提示用户
    message.warning('登录已过期，请重新登录', 1.5);
    
    // 重定向到登录页
    setTimeout(() => {
      history.replace({
        pathname: '/user/login',
        query: {
          redirect: window.location.pathname,
        },
      });
    }, 1500);
  },
  
  // 刷新Token的方法（实际项目中需实现）
  refreshToken: async () => {
    try {
      // 实际项目中这里应该是调用刷新Token的API
      // const response = await request('/api/auth/refresh');
      
      // 模拟成功响应
      const mockResponse = {
        success: true,
        data: {
          token: 'new_access_token_xyz',
          expiresIn: 7200
        }
      };
      
      if (mockResponse.success) {
        // 保存新token
        localStorage.setItem('token', mockResponse.data.token);
        return mockResponse.data.token;
      }
    } catch (error) {
      console.error('刷新token失败:', error);
      return null;
    }
    return null;
  }
};

/**
 * 5. 错误处理增强版
 */
export const errorConfig: RequestConfig = {
  // 错误处理配置
  errorConfig: {
    // 错误抛出 - 添加Token错误识别
    errorThrower: (res: any) => {
      const { success, errorCode, errorMessage, showType } = 
        res as unknown as ResponseStructure;
      
      if (!success) {
        // 识别Token相关错误
        if (errorCode === TokenErrorCode.TOKEN_EXPIRED) {
          const error: any = new Error(errorMessage);
          error.name = 'TokenExpiredError';
          error.info = { errorCode, errorMessage, showType: ErrorShowType.TOKEN_EXPIRED };
          throw error;
        } else if (errorCode === TokenErrorCode.TOKEN_INVALID || 
                   errorCode === TokenErrorCode.TOKEN_MISSING) {
          const error: any = new Error(errorMessage);
          error.name = 'TokenInvalidError';
          error.info = { errorCode, errorMessage, showType: ErrorShowType.TOKEN_INVALID };
          throw error;
        } else if (errorCode === TokenErrorCode.TOKEN_REFRESH_FAILED) {
          const error: any = new Error(errorMessage);
          error.name = 'TokenRefreshError';
          error.info = { errorCode, errorMessage, showType: ErrorShowType.ERROR_MESSAGE };
          throw error;
        }
        
        // 普通业务错误
        const error: any = new Error(errorMessage);
        error.name = 'BizError';
        error.info = { errorCode, errorMessage, showType };
        throw error;
      }
    },
    
    // 错误处理 - 增强Token处理
    errorHandler: (error: any, opts: any) => {
      if (opts?.skipErrorHandler) throw error;
      
      // Token过期处理
      if (error.name === 'TokenExpiredError') {
        tokenUtils.handleTokenExpired();
        return;
      }
      
      // Token无效处理（立即跳转登录）
      if (error.name === 'TokenInvalidError') {
        tokenUtils.handleTokenExpired(); // 同过期处理
        return;
      }
      
      // Token刷新失败
      if (error.name === 'TokenRefreshError') {
        tokenUtils.handleTokenExpired(); // 同过期处理
        return;
      }
      
      // 原有错误处理逻辑保持不变...
      // (保持您代码中原有的错误处理逻辑)
    }
  },

  // 请求拦截器 - 改为动态获取token
  requestInterceptors: [
    (config: RequestOptions) => {
      // 动态获取token，优先从本地存储获取
      const token = localStorage.getItem('token') || sessionStorage.getItem('token') || '';
      
      // 添加Authorization头（推荐做法）
      const headers = {
        ...config.headers,
        Authorization: token ? `${token}` : ''
      };
      
      // 或者添加token作为查询参数（可选）
      let url = config.url || '';
      // if (token && url.includes('?')) {
      //   url += `&token=${token}`;
      // } else if (token) {
      //   url += `?token=${token}`;
      // }
      
      return { 
        ...config, 
        url,
        headers
      };
    },
  ],

  // 响应拦截器 - 增强Token校验
  responseInterceptors: [
    async (response: any) => {
      const { data } = response as unknown as ResponseStructure;
      const { config } = response;
      
      // 自动处理Token刷新
      if (data?.errorCode === TokenErrorCode.TOKEN_EXPIRED) {
        // 尝试刷新Token
        const newToken = await tokenUtils.refreshToken();
        
        if (newToken) {
          // 使用新Token重试原始请求
          const retryConfig = {
            ...config,
            headers: {
              ...config.headers,
              Authorization: `${newToken}`
            }
          };
          
          // 返回重试后的结果
          return request(retryConfig);
        }
      }
      
      // 常规失败处理
      if (data?.success === false) {
        // 提取错误消息（带默认值）
        const errorMsg = data.errorMessage || '请求处理失败';
        
        // 根据不同的showType进行不同的提示处理
        switch (data.showType) {
          case ErrorShowType.SILENT:
            // 静默处理，不做提示
            break;
          case ErrorShowType.WARN_MESSAGE:
            message.warning(errorMsg);
            break;
          case ErrorShowType.ERROR_MESSAGE:
            message.error(errorMsg);
            break;
          case ErrorShowType.NOTIFICATION:
            notification.warning({
              message: '操作提示',
              description: errorMsg,
            });
            break;
          default:
            message.error(errorMsg);
        }
      }
      
      return response;
    },
  ]
};

// 6. 重定向到登录页的通用方法
export const redirectToLogin = () => {
  localStorage.removeItem('token');
  sessionStorage.removeItem('token');
  
  history.replace({
    pathname: '/user/login',
    query: {
      redirect: window.location.pathname,
    },
  });
};