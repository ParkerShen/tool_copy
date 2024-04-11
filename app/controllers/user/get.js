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
      status,
      isAdmin,
      roles // 传入的角色 ID 数组
    } = req.query;

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
    if (status) {
      whereClause.status = status;
    }
    if (isAdmin) {
      whereClause.isAdmin = isAdmin;
    }


    let { count, rows: users } = await User.findAndCountAll({
      where: whereClause,
      attributes: ['userId', 'username', 'email', 'phone', 'isAdmin', 'avatar', 'status', 'cTime'],
      offset: (+page - 1) * +pageSize,
      limit: +pageSize,
      include: [
        {
          model: Role,
          attributes: [['name', 'roleName'], 'roleId'],
          through: {
            model: UserRole,
            attributes: [],
          },
          required: false, // 只有当有角色 ID 时才设置为 true
          duplicating: false,
        },
      ],
      distinct: true,
    });
    

    let totalCount = count;

    if(roles){
      users = filterUsersByRoleId(users, +roles)
      totalCount = users.length
    }


    res.status(200).json({
      count: totalCount,
      code: 1,
      message: '获取成功',
      data: users
    });
  } catch (error) {
    console.error('Error retrieving users with contact info:', error);
    res.status(500).json({
      error: '获取用户及联系信息时发生错误',
    });
  }
};

// 处理角色查询
const filterUsersByRoleId = (users, roleId) => {
  return users.filter(user => {
    return user.Roles.some(role => role.roleId === roleId);
  });
};

// 获取添加用户所有角色列表
const getAllUserroles = async (req, res) => {

  try {
    const userRoleList = await Role.findAll({
      where: {
        deleted: 0,
        status:1
      },
      attributes: ['id', 'name','roleId']
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