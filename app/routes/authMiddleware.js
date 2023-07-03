const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization;

  if (token) {
    jwt.verify(token, 'shenserver', (err, decoded) => {
      if (err) {
        return res.status(401).json({
          message: 'Token验证失败'
        });
      } else {
        req.user = decoded;
        next();
      }
    });
  } else {
    return res.status(401).json({
      message: '缺少Token'
    });
  }
};

module.exports = authenticateToken;