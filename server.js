const express = require('express');
const app = express();
const db = require('./app/models');
const routeLogger = require('./routeLogger');
// 将 routeLogger 中间件应用于所有路由
app.use(routeLogger);
// 解析请求体中的JSON数据
app.use(express.json());


// 使用路由管理器
const routes = require('./app/routes');
app.use(routes);


// 启动服务器
const port = 3001;
db.sequelize.sync({
  force: false
}).then(() => {
  app.listen(port, () => {
    console.log(`服务器已启动，正在监听端口 ${port}`);
  });
});