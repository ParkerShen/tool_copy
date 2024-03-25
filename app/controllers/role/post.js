const {
  User,
  Role
} = require('../../models');



// 创建新角色
const createRole = async (req, res) => {

  try {

    const {
      name,
      description,
      menu
    } = req.body;

    console.log('name', name)

    const role = await Role.findOne({
      where: {
        deleted: 0,
        name
      }
    })
    console.log('role', role)
    if (role) {
      res.status(200).json({
        status: 2,
        msg: '角色已存在，请修改',
      });
      return
    }


    // 使用 Set 来确保唯一性
    const uniqueValues = new Set(menu.map(item => item.id).concat(menu.map(item => item.pid)));

    // 将 Set 转换为数组，并生成逗号分隔的字符串
    const idString = Array.from(uniqueValues).join(',');

    const newRole = await Role.create({
      name,
      description,
      creatorId: 1,
      roleMenuId: idString
    });

    // 返回成功响应
    res.status(200).json({
      code: 1,
      msg: '创建成功',
      // newUser,
      // newContactInfo
    });

  } catch (error) {
    // 处理错误情况
    console.error('Error creating user:', error);
    res.status(500).json({
      msg: 'Error creating user'
    });
  }

};

// 修改新角色
const updateRole = async (req, res) => {

  try {

    const {
      id,
      name,
      description,
      menu
    } = req.body;

    const role = await Role.findOne({
      where: {
        name
      }
    })
    if (role) {
      res.status(200).json({
        status: 2,
        msg: '角色已存在，请修改',
      });
      return
    }

    const role1 = await Role.findOne({
      where: {
        id
      }
    })

    // 使用 Set 来确保唯一性
    const uniqueValues = new Set(menu.map(item => item.id).concat(menu.map(item => item.pid)));

    // 将 Set 转换为数组，并生成逗号分隔的字符串
    const idString = Array.from(uniqueValues).join(',');

    role1.name = name
    role1.uTime = new Date()
    role1.description = description
    role1.roleMenuId = idString

    await role1.save()

    // 返回成功响应
    res.status(200).json({
      code: 1,
      msg: '修改成功',
    });

  } catch (error) {
    // 处理错误情况
    console.error('Error update role:', error);
    res.status(500).json({
      msg: 'Error update role'
    });
  }

};

// // 删除用户
const deleteRole = async (req, res) => {
  const {
    id
  } = req.body;
  try {
    // 更新 User 表
    const role = await Role.findByPk(id);
    role.deleted = 1;
    role.dTime = new Date();
    await role.save();

    res.status(200).json({
      code: 1,
      msg: '删除成功'
    });
  } catch (error) {
    console.error('Error delete user:', error);
    res.status(500).json({
      error: '删除用户时发生错误'
    });
  }
};

module.exports = {
  createRole,
  updateRole,
  deleteRole
};