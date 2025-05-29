const express = require('express');
const session = require('express-session');
const app = express();
const db = require('./app/models');
const routeLogger = require('./routeLogger');
const cors = require('cors');
const path = require('path');
// 将 routeLogger 中间件应用于所有路由
app.use(routeLogger);
// 解析请求体中的JSON数据
app.use(express.json());
app.use(cors());

// 配置 Session 中间件
app.use(session({
  secret: 'secure_random_string_here', // 使用环境变量存储
  resave: false,
  saveUninitialized: true,
  cookie: { 
    secure: false, // 开发环境设为 false
    maxAge: 1000 * 60 * 15 // 15分钟过期
  }
}));


// 使用路由管理器
const routes = require('./app/routes');
app.use('/api', routes);

// 设置静态文件目录，以便可以通过浏览器访问上传的图片
const imagesDir = path.join(__dirname, '..', 'images');
app.use('/images', express.static(imagesDir)); 

// 启动服务器
const port = 3001;
db.sequelize.sync({
  force: false
}).then(() => {
  app.listen(port, () => {
    console.log(`服务器已启动，正在监听端口 ${port}`);
  });
});