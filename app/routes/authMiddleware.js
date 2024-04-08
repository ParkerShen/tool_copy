const jwt = require('jsonwebtoken');
const {
  BlackToken
} = require('../models');
// 验证 Token 中间件
const authenticateToken = async (req, res, next) => {


  try {
  const token = req.headers.authorization;

  // 检查 Token 是否存在于 BlacklistToken 表中
  const invalidatedToken = await BlackToken.findOne({
    where: {
      token
    }
  });

  if (invalidatedToken) {
    // Token 存在于 BlacklistToken 表中，拦截请求并返回错误响应
    return res.status(401).json({
      message: 'Token 失效，请重新登录',
    });
  }

 
    // 验证 token 的合法性
    const decoded = jwt.verify(token, 'shenserver');
    req.user = decoded;
    next();
  } catch (error) {
    // token 验证失败，返回错误响应
    return res.status(200).json({
      code: 401,
      message: 'Token过期，重新登陆'
    });
  }

};

module.exports = {
  authenticateToken,
};