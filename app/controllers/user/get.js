const {
  User,
  Usercontactinfo,
  Role,
  Permission,
  UserRole
} = require('../../models');
const {
  Op
} = require('sequelize');

// 获取所有用户
const getUsers = async (req, res) => {
  try {
    const {
      page = 1,
      pageSize = 10,
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

    // const {
    //   count,
    //   rows: users
    // } = await User.findAndCountAll({
    //   where: whereClause,
    //   include: {
    //     model: Usercontactinfo,
    //     as: 'userC',
    //     attributes: ['fb', 'weibo', 'zhihu', 'ins']
    //   },
    //   offset: (+page - 1) * +pageSize,
    //   limit: +pageSize,
    // });

    const {count,rows: users} = await User.findAndCountAll({
      where: whereClause,
      attributes: ['userId', 'username','email','phone','isAdmin','avatar','status'], // 选择 User 表中需要的字段
      offset: (+page - 1) * +pageSize,
      limit: +pageSize,
      include: [
        {
          model: Role,
          attributes: [['name','roleName'],'roleId'], // 选择 Role 表中需要的字段
          through: {
            model: UserRole,
            attributes: [] // 不需要显示 UserRole 表中的字段，因为它只是关联表
          },
          required: false, // 使用 required: false 来确保即使关联表中没有匹配的记录，也能查询到 User 记录
          duplicating: false, // 设置 duplicating: false 来确保关联表中的重复记录不会影响计数
        }
      ],
      distinct: true, // 使用 distinct 来确保只计算唯一的 User 记录
    });

    const totalCount = count;
    res.status(200).json({
      count: totalCount,
      code: 1,
      message: '获取成功',
      data: users
    });
  } catch (error) {
    console.error('Error retrieving users with contact info:', error);
    res.status(500).json({
      error: '获取用户及联系信息时发生错误'
    });
  }
};

// 获取添加用户所有角色列表
const getAllUserroles = async (req, res) => {

  try {
    const userRoleList = await Role.findAll({
      where: {
        deleted: 0,
        status:1
      },
      attributes: ['id', 'name','label','status']
    })

    res.status(200).json({
      code: 1,
      message: '获取成功',
      data: userRoleList
    });
  } catch (error) {
    console.log('error', error)

  }
};

module.exports = {
  getUsers,
  getAllUserroles
};