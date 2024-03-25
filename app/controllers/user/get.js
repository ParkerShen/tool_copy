const {
  User,
  Usercontactinfo,
  Role,
  Permission
} = require('../../models');
const {
  Op
} = require('sequelize');

// 获取所有用户
const getUsers = async (req, res) => {
  try {
    const {
      page,
      pageSize,
      username,
      phone,
      email
    } = req.query

    // 初始查询条件
    const whereClause = {
      deleted: 0,
    };

    // 添加模糊查询条件（如果有传递对应的字段值）
    if (username) {
      whereClause.username = {
        [Op.like]: `%${username}%`,
      };
    }
    if (phone) {
      whereClause.phone = {
        [Op.like]: `%${phone}%`,
      };
    }
    if (email) {
      whereClause.email = {
        [Op.like]: `%${email}%`,
      };
    }

    const {
      count,
      rows: users
    } = await User.findAndCountAll({
      where: whereClause,
      include: {
        model: Usercontactinfo,
        as: 'userC',
        attributes: ['fb', 'weibo', 'zhihu', 'ins']
      },
      offset: (+page - 1) * +pageSize,
      limit: +pageSize,
    });

    const totalCount = count;
    res.status(200).json({
      count: totalCount,
      code: 1,
      msg: '获取成功',
      data: users
    });
  } catch (error) {
    console.error('Error retrieving users with contact info:', error);
    res.status(500).json({
      error: '获取用户及联系信息时发生错误'
    });
  }
};

const getPermissions = async (req, res) => {
  try {
    const {
      permissions
    } = req.body
    res.status(200).json({
      "permissions": [
        "/index",
        "------------",
        "/user/list",
        "/user/dept",
        "/user/position",
        "/user/role",
        "/user/permission",
        "/user/menu",
        "------------",
        "/system/params",
        "/system/dict",
        "/system/log/action",
        "/system/log/login",
        "/system/monitor/users",
        "/system/monitor/server",
        "/system/monitor/redis",
        "/system/monitor/caches",
        "/system/dev/success",
        "/system/dev/fail",
        "/system/dev/403",
        "/system/dev/404",
        "------------",
        "/test"
      ]
    });
  } catch (error) {
    console.error('Error retrieving users with contact info:', error);
    res.status(500).json({
      error: '获取用户及联系信息时发生错误'
    });
  }
};



module.exports = {
  getUsers,
  getPermissions
};