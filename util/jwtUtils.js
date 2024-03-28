const jwt = require('jsonwebtoken');
const {
  User,
  Role,
} = require('../app/models');

// 生成 JWT token
const generateToken = async (username) => {

  if (username) {
    const user = await User.findOne({
      where: {
        username,
        deleted: 0
      },
      include: [{
        model: Role,
      }],
      raw: true,
      nest: true
    });

    const payload = user;

    const secretKey = 'shenserver'; // 根据你的需求设置密钥

    const options = {
      expiresIn: '1d', // 设置 token 的有效期为一天
    };

    return jwt.sign(payload, secretKey, options);
  }


};

// 调用生成 token 的函数
const token = generateToken();
// console.log(token);

module.exports = {
  generateToken
};