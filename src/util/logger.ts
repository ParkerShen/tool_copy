import winston, { format } from 'winston';
import 'winston-mongodb';
import 'winston-daily-rotate-file';
import dotenv from 'dotenv';

// 扩展 Logger 接口（解决类型问题）
declare module 'winston' {
  interface Logger {
    logRequest: (req: any, res: Express.Response, next: any) => void;
    logError: (error: Error, req: any, res: Express.Response, next: any) => void;
  }
}

const { combine, timestamp, json, errors } = format;

dotenv.config();

interface LogMetadata {
  method?: string;
  path?: string;
  ip?: string;
  user?: string | number;
  stack?: string;
}

const logger = winston.createLogger({
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    json()
  ),
  transports: [
    new winston.transports.Console({
      format: combine(
        format.colorize(),
        format.printf((info: any) => `${info.timestamp} [${info.level}]: ${info.message}`)
      )
    }),
    new winston.transports.MongoDB({
      db: process.env.MONGO_LOG_URI!,
      collection: 'app_logs',
      options: { useUnifiedTopology: true },
      metaKey: 'metadata',
      decolorize: true,
      level: 'warn'
    }),
    new winston.transports.DailyRotateFile({
      filename: 'logs/application-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
      format: format.json()
    })
  ]
});

export interface RequestWithUser extends Express.Request {
  user?: {
    _id: string | number;
  };
}

// ✅ 现在不会报错
logger.logRequest = (req: any, res: Express.Response, next: any) => {
  const metadata: LogMetadata = {
    method: req.method,
    path: req.originalUrl,
    ip: req.ip,
    user: req.user?._id || 'anonymous'
  };

  logger.info('HTTP Request', { metadata });
  next();
};

// ✅ 现在不会报错
logger.logError = (error: Error, req: any, res: Express.Response, next: any) => {
  const metadata: LogMetadata = {
    path: req.originalUrl,
    method: req.method,
    userId: req.user?._id || 'anonymous',
    stack: error.stack
  } as any;

  logger.error(error.message, { metadata });
  next(error);
};

export default logger;