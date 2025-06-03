const winston = require('winston');
const { combine, timestamp, json, errors } = winston.format;
const { format } = winston;
require('winston-mongodb');
require('winston-daily-rotate-file'); // 确保已安装 winston-daily-rotate-file
require('dotenv').config();

const logger = winston.createLogger({
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    json()
  ),
  transports: [
    // 控制台输出
    new winston.transports.Console({
      format: combine(
        winston.format.colorize(),
        format.printf(info => `${info.timestamp} [${info.level}]: ${info.message}`)
      )
    }),
    
    // MongoDB 存储（只记录 warn 及以上级别）
    new winston.transports.MongoDB({
      db: process.env.MONGO_LOG_URI,
      collection: 'app_logs',
      options: { useUnifiedTopology: true },
      metaKey: 'metadata',
      decolorize: true,
      level: 'warn'  // 只记录warn级别以上
    }),
    
    // 文件轮转存储 - 修正了这里的语法
    new winston.transports.DailyRotateFile({
      filename: 'logs/application-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
      format: format.json()
    })
  ]
});

// 请求日志中间件
logger.logRequest = (req, res, next) => {
  const metadata = {
    method: req.method,
    path: req.originalUrl,
    ip: req.ip,
    user: req.user?._id || 'anonymous'
  };

  logger.info('HTTP Request', { metadata });
  next();
};

// 错误日志中间件
logger.logError = (error, req, res, next) => {
  const metadata = {
    path: req.originalUrl,
    method: req.method,
    userId: req.user?._id || 'anonymous',
    stack: error.stack  // 直接记录错误堆栈
  };

  logger.error(error.message, { metadata });
  next(error);
};

module.exports = logger;