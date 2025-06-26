import express, { Application, Request, Response, NextFunction } from 'express';
import session from 'express-session';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import connectMongo from './db/mongo'; // MongoDB 连接
import logger from './util/logger'; // 日志模块
import routeLogger from './middleware/routeLogger';
import routes from './app/routes';
import db from './app/models/platform';
import fs from 'fs';
dotenv.config();

const app: Application = express();

// 将 routeLogger 中间件应用于所有路由
app.use(routeLogger);

// 解析请求体中的 JSON 数据
app.use(express.json());
app.use(cors());

// 连接 MongoDB
connectMongo();

// 使用请求日志中间件
app.use(logger.logRequest);

// 配置 Session 中间件
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'secure_random_string_here', // 使用环境变量存储
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: false, // 开发环境设为 false
      maxAge: 1000 * 60 * 15, // 15分钟过期
    },
  })
);

// 使用路由管理器
app.use('/api', routes);

// 在路由之后添加错误日志中间件
app.use(logger.logError);

// ============ 静态文件访问配置 ============
// 1. 设置根目录静态访问 - 默认访问 public 目录
const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));

// 2. 创建静态图片目录并确保其存在
const imagesDir = path.join(__dirname, '..', 'public', 'images');

// 如果目录不存在则创建
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
  console.log(`📁 已创建图片目录: ${imagesDir}`);
}

// 设置图片访问路由
app.use('/images', express.static(imagesDir));
console.log(`🌐 静态图片服务已启动: http://localhost:${process.env.PORT || 3001}/images/`);

// 自定义静态文件访问路由
app.get('/static/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(imagesDir, filename);
  
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({
      success: false,
      message: '图片不存在',
      path: filePath
    });
  }
});

// 3. 允许从根目录直接访问 public 下的文件
app.get('/*', (req, res, next) => {
  if (!req.url.startsWith('/api')) {
    const filePath = path.join(publicDir, req.url);
    
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      res.sendFile(filePath);
    } else {
      next(); // 交给后续中间件处理
    }
  } else {
    next();
  }
})

// 启动服务器
const port = process.env.PORT || 3001;
db.sequelize
  .sync({
    force: false,
  })
  .then(() => {
    app.listen(port, () => {
      console.log(`服务器已启动，正在监听端口 ${port}`);
    });
  })
  .catch((error: Error) => {
    console.error('数据库同步失败:', error);
  });