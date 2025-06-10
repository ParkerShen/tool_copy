import winston, { format, Logger as WinstonLogger } from 'winston';
import 'winston-mongodb';
import 'winston-daily-rotate-file';
import dotenv from 'dotenv';
import { Request, Response, NextFunction } from 'express';

// 扩展 Logger 接口
declare module 'winston' {
  interface Logger {
    logRequest: (req: Request, res: Response, next: NextFunction) => void;
    logError: (error: Error, req: Request, res: Response, next: NextFunction) => void;
    logCaptchaFailure: (req: Request, error: string) => void;
    logLoginAttempt: (username: string, success: boolean, reason?: string) => void;
    logRouteError: (module: string, error: Error, meta?: Record<string, any>) => void;
  }
}

const { combine, timestamp, json, errors } = format;

dotenv.config();

// 详细日志元数据接口
interface DetailedLogMetadata {
  // 请求信息
  method?: string;
  path?: string;
  ip?: string;
  user?: string | number;
  username?: string;
  
  // 响应信息
  statusCode?: number;
  responseTime?: number;
  
  // 错误信息
  stack?: string;
  captchaError?: string;
  authError?: string;
  
  // 请求数据
  requestBody?: any;
  queryParams?: any;
  params?: any;
  headers?: any;
  
  // 环境信息
  nodeVersion?: string;
  os?: string;
  
  // 调试信息
  module?: string;
  route?: string;
  operation?: string;
  variables?: Record<string, any>;
  source?: string;
  errorType?: string;
}

// 请求中的用户信息扩展
export interface RequestWithUser extends Request {
  user?: {
    _id: string | number;
    username?: string;
  };
}

// 创建带详细元数据支持的日志器
const logger = winston.createLogger({
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    json()
  ),
  transports: [
    // 控制台输出 - 增强美化格式
    new winston.transports.Console({
      format: combine(
        format.colorize(),
        format.printf((info: any) => {
          const metadata = info.metadata || {};
          let message = `${info.timestamp} [${info.level}]`;
          
          // 显示模块信息（如果存在）
          if (metadata.module) {
            message += ` [${metadata.module}]`;
          }
          
          // 请求信息
          if (metadata.method && metadata.path) {
            message += ` ${metadata.method} ${metadata.path}`;
            
            // 显示状态码和响应时间
            if (metadata.statusCode) {
              message += ` → ${metadata.statusCode}`;
            }
            if (metadata.responseTime) {
              message += ` (${metadata.responseTime}ms)`;
            }
          }
          
          // 用户信息
          if (metadata.user || metadata.username) {
            message += ` by ${metadata.username || metadata.user}`;
          }
          
          // 特定错误信息
          if (metadata.captchaError) {
            message += ` | CAPTCHA_ERROR: ${metadata.captchaError}`;
          }
          if (metadata.authError) {
            message += ` | AUTH_ERROR: ${metadata.authError}`;
          }
          if (metadata.errorType) {
            message += ` | ERROR_TYPE: ${metadata.errorType}`;
          }
          
          // 显示关键错误位置
          if (metadata.source) {
            const sourceParts = metadata.source.split('(');
            message += ` | AT: ${sourceParts[0].trim()}`;
            if (sourceParts[1]) {
              const location = sourceParts[1].replace(')', '').split(':');
              if (location.length >= 2) {
                message += ` (${location[0]}:${location[1]})`;
              }
            }
          }
          
          // 主消息体和堆栈
          message += ` | ${info.message}`;
          
          // 显示重要变量状态
          if (metadata.variables) {
            const vars = Object.entries(metadata.variables)
              .map(([key, val]) => `${key}=${JSON.stringify(val)}`)
              .join(', ');
            message += ` | VARS: ${vars}`;
          }
          
          return message;
        })
      )
    }),
    
    // MongoDB 存储
    new winston.transports.MongoDB({
      db: process.env.MONGO_LOG_URI!,
      collection: 'app_logs',
      metaKey: 'metadata',
      decolorize: true,
      level: 'warn' // 只记录警告及以上级别
    }),
    
    // 文件轮转存储
    new winston.transports.DailyRotateFile({
      filename: 'logs/application-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
      format: format.json(),
      level: 'info' // 记录所有级别到文件
    }),
    
    // 错误专用日志文件
    new winston.transports.DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
      format: format.json(),
      level: 'error' // 仅记录错误级别
    })
  ],
  
  // 捕获未处理的异常
  exceptionHandlers: [
    new winston.transports.File({ 
      filename: 'logs/exceptions.log',
      level: 'error'
    })
  ],
  
  // 捕获未处理的Promise拒绝
  rejectionHandlers: [
    new winston.transports.File({ 
      filename: 'logs/rejections.log',
      level: 'error'
    })
  ]
});

// 请求日志中间件 - 增强版
logger.logRequest = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    const metadata: DetailedLogMetadata = {
      method: req.method,
      path: req.originalUrl,
      ip: req.ip || req.socket.remoteAddress,
      user: (req as RequestWithUser).user?._id || 'anonymous',
      username: (req as RequestWithUser).user?.username,
      statusCode: res.statusCode,
      responseTime: duration,
      queryParams: req.query,
      params: req.params,
      headers: {
        'user-agent': req.headers['user-agent'],
        referer: req.headers.referer,
        'content-type': req.headers['content-type']
      },
      nodeVersion: process.version,
      os: process.platform
    };
    
    // 记录请求体但不包括敏感信息
    if (req.body && Object.keys(req.body).length > 0) {
      const sanitizedBody = { ...req.body };
      
      // 过滤敏感字段
      ['password', 'psalt', 'captcha'].forEach(field => {
        if (sanitizedBody[field]) {
          sanitizedBody[field] = '******';
        }
      });
      
      metadata.requestBody = sanitizedBody;
    }
    
    // 根据状态码选择日志级别
    const level = res.statusCode >= 400 ? 'warn' : 'info';
    
    logger.log(level, 'HTTP Request', { metadata });
  });
  
  next();
};

// 全局错误日志中间件
logger.logError = (error: Error, req: Request, res: Response, next: NextFunction) => {
  const metadata: DetailedLogMetadata = {
    path: req.originalUrl,
    method: req.method,
    ip: req.ip || req.socket.remoteAddress,
    user: (req as RequestWithUser).user?._id || 'anonymous',
    username: (req as RequestWithUser).user?.username,
    stack: error.stack,
    errorType: error.name,
    nodeVersion: process.version,
    os: process.platform
  };
  
  // 添加请求数据
  if (req.body && Object.keys(req.body).length > 0) {
    metadata.requestBody = { ...req.body };
    ['password', 'psalt', 'captcha'].forEach(field => {
      if (metadata.requestBody![field]) {
        metadata.requestBody![field] = '******';
      }
    });
  }
  
  if (req.query && Object.keys(req.query).length > 0) {
    metadata.queryParams = req.query;
  }
  
  // 特定错误类型增强
  if (req.originalUrl.includes('/captcha')) {
    metadata.captchaError = error.message;
  } else if (req.originalUrl.includes('/login')) {
    metadata.authError = error.message;
    metadata.module = 'Authentication';
  }
  
  // 提取错误位置
  const stackLines = error.stack?.split('\n') || [];
  if (stackLines.length > 1) {
    metadata.source = stackLines[1].trim();
  }
  
  logger.error(error.message, { metadata });
  next(error);
};

// 验证码失败专用日志方法
logger.logCaptchaFailure = (req: Request, error: string) => {
  const metadata: DetailedLogMetadata = {
    method: req.method,
    path: req.originalUrl,
    ip: req.ip || req.socket.remoteAddress,
    module: 'Captcha',
    captchaError: error,
    requestBody: {
      captcha: req.body?.captcha ? '******' : 'missing'
    },
    queryParams: req.query,
    nodeVersion: process.version,
    os: process.platform
  };
  
  logger.warn('CAPTCHA_FAILURE', { metadata });
};

// 登录尝试日志方法
logger.logLoginAttempt = (username: string, success: boolean, reason?: string) => {
  const metadata: DetailedLogMetadata = {
    username,
    authError: success ? undefined : reason,
    module: 'Authentication',
    nodeVersion: process.version,
    os: process.platform
  };
  
  const level = success ? 'info' : 'warn';
  const message = success ? 'LOGIN_SUCCESS' : 'LOGIN_FAILURE';
  
  if (!success) {
    metadata.errorType = 'AuthenticationError';
  }
  
  logger.log(level, message, { metadata });
};

// 路由错误专用日志方法（新增）
logger.logRouteError = (module: string, error: Error, meta: Record<string, any> = {}) => {
  const stackLines = error.stack?.split('\n') || [];
  const sourceLine = stackLines.length > 1 ? stackLines[1].trim() : '';
  
  const metadata: DetailedLogMetadata = {
    module,
    errorType: error.name,
    path: meta?.route || 'unknown',
    operation: meta?.operation || 'unknown',
    variables: meta?.variables || {},
    source: sourceLine,
    stack: error.stack,
    nodeVersion: process.version,
    os: process.platform
  };
  
  // 过滤敏感变量
  if (metadata.variables) {
    ['password', 'psalt', 'captcha'].forEach(field => {
      if (metadata.variables![field]) {
        metadata.variables![field] = '******';
      }
    });
  }
  
  logger.error(`ROUTE_ERROR: ${error.message}`, { metadata });
};

export default logger;