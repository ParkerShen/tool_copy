import { NextFunction, Request, Response } from 'express';
import db from '../../../models/platform';
import { Op } from 'sequelize';
import svgCaptcha from 'svg-captcha';
import moment from 'moment';
const { User, Role } = db;
interface UserQueryParams {
  page?: string;
  pageSize?: string;
  username?: string;
  status?: string;
  isAdmin?: string;
  roles?: string;
  avatar?:string;
  startTime?:string;
  endTime?:string;
  cTimeRange?:string[];
}

interface SessionWithCaptcha {
  captcha?: string;
}
// 取得用户列表
export const getUsers = async (req: Request<{}, {}, {}, UserQueryParams>, res: Response,next: NextFunction) => {
  try {
    const { page = '1', pageSize = '10', username, status, isAdmin, roles,cTimeRange } = req.query;
    const pageNum = parseInt(page);
    const size = parseInt(pageSize);
    const offset = (pageNum - 1) * size;
    const startTime = cTimeRange?.[0]
    const endTime = cTimeRange?.[1]
    
    // 基础查询条件
    const whereClause: any = { deleted: 0 };
    if (username) whereClause.username = { [Op.like]: `%${username}%` };
    if (status) whereClause.status = parseInt(status);
    if (isAdmin) whereClause.isAdmin = parseInt(isAdmin);
    if (startTime) {
      const cleanStartTime = String(startTime).replace(/^["']+|["']+$/g, '');
      const cleanEndTime = String(endTime).replace(/^["']+|["']+$/g, '');
      
      const startDateObj = new Date(cleanStartTime);
      const endDateObj = new Date(cleanEndTime);
      
        whereClause.cTime = whereClause.cTime || {};
        whereClause.cTime[Op.gte] = moment(startDateObj).format('YYYY-MM-DD HH:mm:ss');  
        whereClause.cTime[Op.lte] = moment(endDateObj).format('YYYY-MM-DD HH:mm:ss');  
    }
  
    const includeOptions: any = [{
      model: Role,
      attributes: [['name', 'roleName'], 'roleId'],
      through: { attributes: [] },
      required: false  // 默认不强制关联
    }];

    if (roles) {
      const roleId = parseInt(roles);
      includeOptions[0].required = true;  // 强制内连接
      includeOptions[0].where = { roleId };  // 添加角色过滤条件
    }
    const { count: totalCount, rows: users } = await User.findAndCountAll({
      where: whereClause,
      attributes: ['userId', 'username', 'isAdmin', 'avatar', 'status', 'cTime', 'loginCount', 'lastLoginAt'],
      offset,
      limit: size,
      include: includeOptions,
      distinct: true,
     
    });

    res.status(200).json({
      count: totalCount,
      current:+page,
      pageSize:+pageSize,
      success: true,
      message: '获取成功',
      data: users
    });
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ success: false, error: '获取用户列表失败' });
    next(error);
  }
};

// 获取角色列表
export const getAllUserroles = async (req: Request, res: Response) => {
  try {
    const userRoleList = await Role.findAll({
      where: { deleted: 0, status: 1 } as any,
      attributes: ['id', 'name', 'roleId']
    });

    res.status(200).json({ code: 1, message: '获取成功', data: userRoleList });
  } catch (error) {
    console.error('Error getting user roles:', error);
    res.status(500).json({ message: '获取用户角色失败' });
  }
};

// 验证码
export const captcha = async (req: Request, res: Response) => {
  try {
    const captcha = svgCaptcha.create({
      size: 4,
      noise: 3,
      color: true,
      background: '#f0f0f0',
      fontSize: 50
    });

    (req.session as SessionWithCaptcha).captcha = captcha.text;
    res.status(200).json({ code: 1, message: '获取验证码成功', data: { img: captcha.data } });
  } catch (error) {
    console.error('Error generating captcha:', error);
    res.status(500).json({ message: '生成验证码失败' });
  }
};


// 获取当前用户信息
export const currentUser = async (req: Request<{}, {}, {}, UserQueryParams>, res: Response, next: NextFunction) => {
  try {
    
    const userId = (req as any).user?.userId; 
    if (!userId) {
       res.status(401).json({ success: false,message: '未授权' });
       return
    }

    // 获取用户信息
    const user = await db.User.findByPk(userId, {
      include: [{
        model: db.Role,
        include: [{
          model: db.Permission,
          attributes: ['access'],
          where: { status: 1 } // 只获取启用状态的权限
        }]
      }]
    });

    if (!user) {
       res.status(404).json({ message: '用户不存在' });
       return
    }
    let permissions: string[] = [];
    
    // 管理员直接获取所有权限
    if(+(req as any).user.userId === 1){
      const allPermissions = await db.Permission.findAll({
        where: { status: 1 },
        attributes: ['access'],
        raw: true
      });
     
       permissions = allPermissions.map(p => p.access).filter(Boolean);
    }else{
       permissions = await  getUserPermissions((req as any).user?.userId)
    }
    
    res.status(200).json({
        success: true,
        data: {
          // 用户权限标识
          // access: 'admin1',
          permissions: Array.from(permissions),
          name: user.username,
          avatar: user.avatar,
        },
        
     
    });
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ error: '发生错误' });
    next(error)
  }
};

export const getUserPermissions = async (userId: number) => {
  try {
    // 1. 获取用户的所有角色ID
    const userWithRoles = await db.User.findByPk(userId, {
      include: [{
        model: db.Role,
        attributes: ['roleId'], // 只取需要的字段
        through: { attributes: [] }
      }]
    }) as any;

    if (!userWithRoles) return [];
    
    const roleIds = userWithRoles.Roles.map((role: any) => role.roleId);
    if (roleIds.length === 0) return [];

    // 2. 一次性获取所有权限ID（去重）
    const rolePermissions = await db.RolePermission.findAll({
      where: { roleId: roleIds },
      attributes: ['permissionId'],
      raw: true
    });

    const permissionIds = [...new Set(rolePermissions.map(rp => rp.permissionId))];
    if (permissionIds.length === 0) return [];

    // 3. 一次性获取所有权限标识
    const permissions = await db.Permission.findAll({
      where: { 
        id: permissionIds,
        status: 1 // 只要启用状态的权限
      },
      attributes: ['access'],
      raw: true
    });

    // 4. 返回权限标识数组
    return permissions
      .map(p => p.access)
      .filter(Boolean); // 过滤空值
  } catch (error) {
    console.error('获取权限失败:', error);
    return [];
  }
};


// 获取权限
// export const currentPermission = async (req: Request<{userId: number}, {}, {}, UserQueryParams>, res: Response,next:NextFunction) => {
//   try {
//     const userId = (req as any).user?.userId; // 从认证中间件中获取用户ID

//     if (!userId) {
//        res.status(401).json({ message: '未授权' });
//        return
//     }

//     // 获取用户信息（包含角色）
//     const user = await db.User.findByPk(userId, {
//       include: [{
//         model: db.Role,
//         include: [{
//           model: db.Permission,
//           where: { 
//             status: 1, // 只获取启用状态的权限
//             type: [0, 1, 2] // 只获取目录和菜单类型
//           }
//         }]
//       }]
//     });

//     if (!user) {
//        res.status(404).json({ message: '用户不存在' });
//        return
//     }

//     // 管理员直接获取所有菜单
//     if (user.isAdmin === 1) {
//       const allPermissions = await db.Permission.findAll({
//         where: {
//           status: 1,
//           type: [0, 1, 2] // 目录和菜单类型
//         },
//         order: [['orderNum', 'ASC']]
//       });
      
//       const menuTree = await buildMenuTree(allPermissions);
//        res.json(menuTree);
//        return
//     }

//     // 普通用户：收集所有权限ID
//     const permissionIds = new Set<number>();
//     user.Roles?.forEach((role: any) => {
//       role.Permissions.forEach((permission: any) => {
//         permissionIds.add(permission.id);
//       });
//     });

//     // 获取所有关联的权限及其父级
//     const allRelevantPermissions = await db.Permission.findAll({
//       where: {
//         id: Array.from(permissionIds),
//         status: 1,
//         type: [0, 1, 2]
//       },
//       include: [{
//         model: db.Permission,
//         as: 'Parent',
//         required: false,
//         where: { status: 1 }
//       }]
//     });

    

//     // 提取所有相关权限ID（包括父级）
//     const allPermissionIds = new Set<number>();
//     allRelevantPermissions.forEach(permission => {
//       allPermissionIds.add(+permission.id);
//       if (permission.Parent) {
//         allPermissionIds.add(permission.Parent.id);
//       }
//     });

//     // 获取完整的权限树
//     const permissions = await db.Permission.findAll({
//       where: {
//         id: Array.from(allPermissionIds),
//         status: 1,
//         type: [0, 1, 2]
//       },
//       order: [['orderNum', 'ASC']]
//     });

//     // 构建菜单树
//     const menuTree = await buildMenuTree(permissions);
//     res.json(menuTree);
//   } catch (error) {
//     console.error('获取菜单失败:', error);
//     res.status(500).json({ message: '服务器内部错误' });
//     next(error)
//   }

// };

// export const currentMenu = async (req: Request<{userId: number}, {}, {}, UserQueryParams>, res: Response) => {
//   try {
//     const userId = (req as any).user?.userId;

//     if (!userId) {
//       return res.status(401).json({ message: '未授权' });
//     }

//     // 获取用户信息
//     const user = await db.User.findByPk(userId, {
//       include: [{
//         model: db.Role,
//         include: [{
//           model: db.Permission,
//           attributes: ['id', 'access', 'type'],
//           where: { 
//             status: 1,
//             type: 2 // 只获取按钮权限
//           }
//         }]
//       }]
//     });

//     if (!user) {
//       return res.status(404).json({ message: '用户不存在' });
//     }

//     // 管理员直接获取所有按钮权限
//     if (user.isAdmin === 1) {
//       const allButtonPermissions = await db.Permission.findAll({
//         where: { 
//           status: 1,
//           type: 2 // 按钮类型
//         },
//         attributes: ['access'],
//         raw: true
//       });
      
//       const permissions = allButtonPermissions.map(p => p.access).filter(Boolean);
//       return res.json({success:true, data:Array.from(permissions)});
//     }

//     // 普通用户：收集所有按钮权限标识
//     const buttonPermissions = new Set<string>();
//     user.Roles.forEach((role: any) => {
//       role.Permissions.forEach((permission: any) => {
//         if (permission.access && permission.type === 2) {
//           buttonPermissions.add(permission.access);
//         }
//       });
//     });

//     res.json({success:true, data:Array.from(buttonPermissions)});
//   } catch (error) {
//     console.error('获取按钮权限失败:', error);
//     res.status(500).json({ message: '服务器内部错误' });
//   }

// };


// async function buildMenuTree(permissions: any[], pid: number = 0): Promise<any[]> {
//   const tree = [];
  
//   // 查找当前层级的所有权限项
//   const items = permissions.filter(p => p.pid === pid);
  
//   for (const item of items) {
//     // 跳过按钮类型（2）和隐藏的项
//     if (item.type === 2 || item.hide === 1) continue;
    
//     const menuItem: any = {
//       path: item.path,
//       name: item.name,
//       icon: item.icon,
//       access: item.access,
//       component: item.component
//     };
    
//     // 递归构建子菜单
//     const children = await buildMenuTree(permissions, item.id);
//     if (children.length > 0) {
//       menuItem.routes = children;
      
//       // 为有子菜单的项添加重定向到第一个子菜单
//       if (children[0].path) {
//         menuItem.routes.unshift({
//           path: menuItem.path,
//           redirect: children[0].path
//         });
//       }
//     }
    
//     tree.push(menuItem);
//   }
  
//   // 按orderNum排序
//   return tree.sort((a, b) => (a.orderNum || 0) - (b.orderNum || 0));
// }


