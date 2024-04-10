const {
  User,
  UserRole,
  Usercontactinfo,
  BlackToken,
  Role,
  Permission,
  sequelize
} = require('../../models');

const bcrypt = require('bcrypt');
const moment = require('moment')
const { Op,Sequelize  } = require('sequelize');

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

const {
  generateRandom20String
} = require('../../../util/common');
// const { Model } = require('sequelize');

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

     const saltRounds = 10; // 盐的轮数，用于增加哈希复杂度
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

        const userinfo = await User.findAll({
          where: {
            id: user.id
          },
          raw: true,
          attributes: ['id', 'username', 'email', 'avatar'],
          include: [
            {
              model: Role,
              attributes: [],
              through: {
                attributes: []
              },
              include: {
                model: Permission,
                attributes: ['id', 'permissionId', ['pid', 'parentId'], 'label', 'name', 'icon', 'type', 'route', 'order', 'component', 'hide', 'status'],
                through: {
                  attributes: []
                },
              }
            }
          ]
        })
        // 将 token 返回给客户端
        res.status(200).json({
          code: 1,
          data: {
            accessToken: token,
            refreshToken: token,
            user: {
              id: userinfo[0].id,
              username: userinfo[0].username,
              email: userinfo[0].email,
              avatar: userinfo[0].avatar,
              "permissions": transformArray(userinfo, 0)
            }
          },
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

function transformArray(arr, parentId) {
  const result = [];

  arr.forEach(item => {
    if (item['Roles.Permissions.parentId'] === parentId) {
      const children = transformArray(arr, +item['Roles.Permissions.permissionId']);
      const newItem = {
        id: item['Roles.Permissions.permissionId'],
        parentId: item['Roles.Permissions.parentId'],
        label: item['Roles.Permissions.label'],
        name: item['Roles.Permissions.name'],
        icon: item['Roles.Permissions.icon'],
        type: item['Roles.Permissions.type'],
        route: item['Roles.Permissions.route'],
        order: item['Roles.Permissions.order'],
        hide: item['Roles.Permissions.hide'],
        status: item['Roles.Permissions.status'],
        component: item['Roles.Permissions.component'] ? item['Roles.Permissions.component'] : null,
        children: children.length ? children : null
      };

      result.push(newItem);
    }
  });

  return result;
}

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

    await sequelize.transaction(async (t) => {

      const {
        username,
        email,
        phone,
        isAdmin,
        roles,
        status,
        avatar
      } = req.body;
      let {
        password = ''
      } = req.body
      // 创建新的用户

      const user = await User.findOne({
        where: {
          deleted: 0,
          username
        },
        transaction: t
      })
      if (user) {
        res.status(200).json({
          code: 0,
          message: '账号已存在，请修改',
        });
        return
      }
      if (phone) {
        const user = await User.findOne({
          where: {
            deleted: 0,
            phone
          },
          transaction: t
        })
        if (user) {
          res.status(200).json({
            code: 0,
            message: '手机号码已存在，请修改',
          });
          return
        }
      }
      if (email) {
        const user = await User.findOne({
          where: {
            deleted: 0,
            email
          },
          transaction: t
        })
        if (user) {
          res.status(200).json({
            code: 0,
            message: '邮箱已存在，请修改',
          });
          return
        }
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
        id: generateRandom20String(),
        userId: moment().unix(),
        username,
        password,
        isAdmin,
        salt,
        email,
        phone,
        status,
        avatar
      }, {
        transaction: t
      });

      await Promise.all(roles.map(async (item) => {
        await UserRole.create({
          userId: newUser.userId,
          roleId: item,
        }, { transaction: t });
      }));

      // 返回成功响应
      res.status(200).json({
        code: 1,
        message: '创建成功',
      });
    })

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
  const userId = req.body.userId;
  try {
    // 更新 User 表
    // 1. 更新 User 表中 deleted 字段为 1
    await User.update(
      { deleted: 1 },
      {
        where: { userId }, // 根据条件选择需要更新的记录
      }
    );

    // 2. 删除 UserRole 表中 userId 等于之前更新的 User 表中 userId 的记录
    await UserRole.destroy({
      where: {
        userId
      },
    });

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
  const userId = req.body.userId;
  const {
    username,
    password,
    email,
    phone,
    status,
    avatar,
    isAdmin,
    roles
  } = req.body;

  try {
    // 更新 User 表
    const user = await User.findByPk(userId);
    user.username = username;
    if(password){
      user.password = password;
    }
    user.email = email;
    user.phone = phone;
    user.status = status;
    user.avatar = avatar;
    user.uTime = new Date(); // 设置 uTime 字段为当前时间
    user.isAdmin = isAdmin


    if (password !== '') {
      // 定义盐的轮数
      const saltRounds = 10;
      // 使用 bcrypt 生成哈希密码
      const hashedPassword = bcrypt.hashSync(password + user.salt,saltRounds);
      user.password = hashedPassword
    }
    await user.save();

    await UserRole.destroy({
      where: {
        userId
      },
    });
    await Promise.all(roles.map(async (item) => {
      await UserRole.create({
        userId,
        roleId: item,
      });
    }));

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