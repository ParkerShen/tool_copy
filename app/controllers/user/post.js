const {
  User,
  Usercontactinfo,
  BlackToken
} = require('../../models');

const bcrypt = require('bcrypt');

function generateRandomString(length) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    result += characters.charAt(randomIndex);
  }

  return result;
}

const {
  generateToken
} = require('../../../util/jwtUtils');

// 登录接口
const login = async (req, res) => {

  try {


    // 处理登录逻辑，验证用户名和密码等
    const {
      username,
      password
    } = req.body

    const user = await User.findOne({
      where: {
        username,
        deleted: 0
      },
      raw: true
    });

    // const saltRounds = 10; // 盐的轮数，用于增加哈希复杂度
    // // 密码加密方式  ,注册有用到
    // const hashedPassword = bcrypt.hashSync('123456a123', saltRounds);
    // console.log('hashedPassword', hashedPassword)

    // 判断用户是否存在
    if (user) {
      //判断密码是否准确
      if (bcrypt.compareSync(password + user.salt, user.password)) {
        // console.log('密码验证通过');
        // 登录成功，生成 token
        const token = await generateToken(username);
        // 将 token 返回给客户端
        res.status(200).json({
          code: 1,
          token: token,
          message: '登录成功'
        });
      } else {
        // console.log('密码验证失败');
        res.status(200).json({
          code: 0,
          message: '密码错误，请重新输入'
        });
      }


    } else {
      res.status(200).json({
        code: 0,
        message: '用户不存在，请重新输入'
      });

    }

  } catch (error) {
    console.log('error', error)
    res.status(500).json({
      message: '错误'
    });
  }

};

// 登出接口
const logout = async (req, res) => {
  const {
    token
  } = req.body;


  // 将 Token 添加到 BlacklistToken 表中
  await BlackToken.create({
    token
  });

  res.status(200).json({
    code: 1,
    message: '登出成功',
  });
};

// 创建新用户
const createUser = async (req, res) => {

  try {

    const {
      username,
      email = '',
      phone = '',
      isAdmin,
      ins = '',
      fb = '',
      weibo = '',
      zhihu = '',
      truename = ''
    } = req.body;
    let {
      password = ''
    } = req.body
    // 创建新的用户

    const user = await User.findOne({
      where: {
        deleted: 0,
        username
      }
    })
    if (user) {
      res.status(200).json({
        status: 2,
        message: '账号已存在，请修改',
      });
      return
    }

    const salt = generateRandomString(4)
    // 定义盐的轮数
    const saltRounds = 10;
    // 默认密码为123456
    if (password !== '') {
      console.log('有设置密码')
      // 使用 bcrypt 生成哈希密码
      password = bcrypt.hashSync(password + salt, saltRounds);
    } else {
      console.log('没有设置密码')
      password = bcrypt.hashSync('123456' + salt, saltRounds);
    }

    const newUser = await User.create({
      roleId: 1,
      username,
      password,
      isAdmin,
      salt,
      truename,
      email,
      phone
    });
    // 创建用户联系信息
    const newContactInfo = await Usercontactinfo.create({
      uid: newUser.id,
      ins,
      fb,
      weibo,
      zhihu
    });

    // 返回成功响应
    res.status(200).json({
      status: 1,
      message: '创建成功',
      // newUser,
      // newContactInfo
    });

  } catch (error) {
    // 处理错误情况
    console.error('Error creating user:', error);
    res.status(500).json({
      message: 'Error creating user'
    });
  }

};

// 删除用户
const deleteUser = async (req, res) => {
  const userId = req.body.id;
  try {
    // 更新 User 表
    const user = await User.findByPk(userId);
    user.deleted = 1;
    user.dTime = new Date();
    await user.save();

    // 更新 UserContactInfo 表
    const contactInfo = await Usercontactinfo.findOne({
      where: {
        uid: userId
      }
    });
    contactInfo.deleted = 1;
    contactInfo.dTime = new Date();
    await contactInfo.save();

    res.status(200).json({
      code: 1,
      message: '删除成功'
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      error: '删除用户时发生错误'
    });
  }
};

// 修改用户
const updateUser = async (req, res) => {
  const userId = req.body.id;
  const {
    username,
    password,
    email,
    phone,
    fb,
    ins,
    weibo,
    zhihu,
    isAdmin
  } = req.body;

  try {
    // 更新 User 表
    const user = await User.findByPk(userId);
    user.username = username;
    // user.password = password;
    user.email = email;
    user.phone = phone;
    user.uTime = new Date(); // 设置 uTime 字段为当前时间
    user.isAdmin = isAdmin


    if (password !== '') {
      // 定义盐的轮数
      const saltRounds = 10;
      // 使用 bcrypt 生成哈希密码
      const hashedPassword = bcrypt.hashSync(password + req.user.salt, saltRounds);
      user.password = hashedPassword
    }
    await user.save();

    // 更新 UserContactInfo 表
    const contactInfo = await Usercontactinfo.findOne({
      where: {
        uid: userId
      }
    });
    if (contactInfo) {
      contactInfo.ins = ins;
      contactInfo.fb = fb;
      contactInfo.weibo = weibo;
      contactInfo.zhihu = zhihu;
      contactInfo.uTime = new Date();
      await contactInfo.save();
    }

    res.status(200).json({
      code: 1,
      message: '更新成功'
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      error: '更新用户时发生错误'
    });
  }
};

module.exports = {
  createUser,
  deleteUser,
  updateUser,
  login,
  logout
};