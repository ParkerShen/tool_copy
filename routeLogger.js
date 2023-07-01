// 调取接口的时候打印路由
function routeLogger(req, res, next) {
  console.log(`[${req.method}] ${req.originalUrl}`);
  next();
}

module.exports = routeLogger;