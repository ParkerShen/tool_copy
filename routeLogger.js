const moment = require('moment');
// 调取接口的时候打印路由
function routeLogger(req, res, next) {
  const now = moment();
  console.log(`[${req.method}] ${req.originalUrl} - ${now.format('YYYY-MM-DD HH:mm:ss')}`);
  next();
}

module.exports = routeLogger;