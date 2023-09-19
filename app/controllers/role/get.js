const {
  User,
  Usercontactinfo,
  Role,
  Permission
} = require('../../models');
const {
  Op
} = require('sequelize');

// 获取所有角色
const getAllroles = async (req, res) => {
  // try {
  const {
    page = 1,
      pageSize = 10,
      // username,
      // phone,
      // email
  } = req.query

  // 查询总记录数
  Role.count().then(async (totalCount) => {
    // 计算偏移量以用于分页
    const offset = (+page - 1) * +pageSize;

    // 查询角色
    Role.findAll({
        where: {
          deleted: 0
        },
        offset: parseInt(offset),
        limit: parseInt(pageSize),
      })
      .then((roles) => {
        // 对每个角色查询关联的菜单
        const rolePromises = roles.map((role) => {
          return Role.findByPk(role.id, {
            raw: true,
            nest: true,
          });
        });

        // 并行执行所有角色的查询
        return Promise.all(rolePromises);
      })
      .then(async (rolesWithMenus) => {
        const processRolesWithMenus = async () => {
          for (const item of rolesWithMenus) {
            const arr = [];
            const arrid = item.roleMenuId.split(',');

            for (const item1 of arrid) {
              const pname = await Permission.findAll({
                where: {
                  id: item1,
                },
                raw: true,
                attributes: ['name', 'pid', 'id', 'description'],
              });
              arr.push({
                id: pname[0].id,
                name: pname[0].name,
                pid: pname[0].pid,
                description: pname[0].description,
              });
            }
            const resultArray = buildTree(arr, 0);
            item.menuName = resultArray;
          }

          const roleTree = rolesWithMenus;
          return roleTree;
        };

        // 调用异步函数以执行操作
        const result = await processRolesWithMenus();
        res.status(200).json({
          count: totalCount,
          code: 1,
          message: '获取成功',
          data: result,
        });
      })
      .catch((error) => {
        console.error('查询出错:', error);
      });
  });
};

// 获取所有节点
const getAllmenus = async (req, res) => {

  try {
    const menu = await Permission.findAll({
      where: {
        deleted: 0
      },
      raw: true,
      nest: true,
      attributes: ['id', 'name', 'pid', 'description']
    })

    const Tree = buildTree(menu, 0)

    res.status(200).json({
      code: 1,
      message: '获取成功',
      data: Tree
    });
  } catch (error) {
    console.log('error', error)

  }
};



function buildTree(arr, pid) {
  const result = [];
  for (const item of arr) {
    if (item.pid === pid) {
      const children = buildTree(arr, item.id);
      if (children.length > 0) {
        item.chird = children;
      }
      result.push(item);
    }
  }
  return result;
}

module.exports = {
  getAllroles,
  getAllmenus
};