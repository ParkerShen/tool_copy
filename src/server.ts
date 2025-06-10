import express, { Application, Request, Response, NextFunction } from 'express';
import session from 'express-session';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import connectMongo from './db/mongo'; // MongoDB 连接
import logger from './util/logger'; // 日志模块
import routeLogger from './middleware/routeLogger';
import routes from './app/routes';
import db from './app/models';

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

// 设置静态文件目录，以便可以通过浏览器访问上传的图片
const imagesDir = path.join(__dirname, '..', 'images');
app.use('/images', express.static(imagesDir));

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