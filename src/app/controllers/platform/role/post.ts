/*
 * @Date: 2025-06-09 14:58:18
 * @LastEditors: parker 960822987@qq.com
 * @LastEditTime: 2025-07-01 16:40:39
 * @FilePath: \serveradmin\src\app\controllers\role\post.ts
 */
/*
 * @Date: 2025-06-09 14:58:18
 * @LastEditors: parker 960822987@qq.com
 * @LastEditTime: 2025-06-30 21:29:24
 * @FilePath: \serveradmin\src\app\controllers\role\post.ts
 */
import { NextFunction, Request, Response } from 'express';
import db from '../../../models/platform';
const {Role,RolePermission,Permission,UserRole} = db;
import { Op, Sequelize, Transaction } from 'sequelize';
interface RoleRequestBody {
  name: string;
  description: string;
  menu: Array<{ id: number; pid: number }>;
  id?: string;
}

interface CreateRoleRequest {

  roleId:number; // 主键
  name: string; // 角色名字
  description?: string; // 描述
  status: number; // 启用状态 0 禁用 1 启用
  accesss: string[]; // 权限标识数组
}


export const createRole = async (req: Request<{}, {}, CreateRoleRequest>, res: Response,next:NextFunction): Promise<void> => {
  const t = await db.sequelize.transaction();
  
  try {
    const { name, description, status, accesss } = req.body;

  const role =  await Role.findOne({where: { name, deleted: 0 } as any,
    transaction: t})
  
  if(role){
    res.status(200).json({
      success: false,
      message: '当前角色名称已存在',
    });
    return
  }

    // 2. 创建角色
    const newRole = await Role.create({
      creatorId:(req as any).user?.userId,
      name,
      description: description || '',
      status,
    }, { transaction: t });
    
    // 3. 根据accesss查询权限ID
    const permissions = await Permission.findAll({
      where: {
        access: accesss
      },
      transaction: t
    });
    
    // 4. 验证所有权限是否存在
    const foundAccesss = permissions.map(p => p.access);
    const missingAccesss = accesss.filter(access => !foundAccesss.includes(access));
    
    if (missingAccesss.length > 0) {
      await t.rollback();
       res.status(400).json({
        success: false,
        message: `以下权限标识不存在: ${missingAccesss.join(', ')}`,
      });
      return
    }
    
    // 5. 创建角色权限关联
    const rolePermissions = permissions.map(permission => ({
      roleId: +newRole.roleId,
      permissionId: +permission.id,
    }));
    
    await RolePermission.bulkCreate(rolePermissions, { transaction: t });
    
    // 6. 提交事务
    await t.commit();
    
    // 7. 返回成功响应
    res.json({
      success: true,
      message: '角色创建成功',
      data: {}
    });
    
  } catch (error: any) {
    // 回滚事务
    await t.rollback();
    
    console.error('创建角色失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: error.message
    });
    next(error)
  }
};

interface RoleAttributes{
  name?:string;
description?:string;
status?:number;
}

// 更新角色
export const updateRole = async (req: Request<{}, {}, CreateRoleRequest>, res: Response, next: NextFunction): Promise<void> => {
  const t = await db.sequelize.transaction();
  
  try {
    const { name, description, status, accesss } = req.body;
    const roleId = (req as any).params.id
    // 1. 验证角色是否存在
    const role = await Role.findOne({
      where: { roleId, deleted: 0 },
      transaction: t
    });
    
    if (!role) {
      await t.rollback();
      res.status(404).json({
        success: false,
        message: '角色不存在或已被删除',
      });
      return;
    }
    
    // 2. 检查角色名称是否重复（排除自身）
    if (name) {
      const existingRole = await Role.findOne({
        where: { 
          name, 
          // roleId: { [db.Sequelize.Op.ne]: roleId },
          roleId: { [Op.ne]: roleId },
          deleted: 0 
        },
        transaction: t
      });
      
      if (existingRole) {
        await t.rollback();
        res.status(400).json({
          success: false,
          message: '角色名称已存在',
        });
        return;
      }
    }
    
    // 3. 更新角色基本信息
    const updateData: Partial<RoleAttributes> = {};
    if (name) updateData.name = name;
    if (description) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    
    if (Object.keys(updateData).length > 0) {
      await Role.update(updateData, {
        where: { roleId },
        transaction: t
      });
    }
    
    // 4. 处理权限更新
    if (accesss) {
      // 4.1 查询新权限
      const permissions = await Permission.findAll({
        where: {
          access: accesss
        },
        transaction: t
      });
      
      // 4.2 验证所有权限是否存在
      const foundAccesss = permissions.map(p => p.access);
      const missingAccesss = accesss.filter(access => !foundAccesss.includes(access));
      
      if (missingAccesss.length > 0) {
        await t.rollback();
        res.status(400).json({
          success: false,
          message: `以下权限标识不存在: ${missingAccesss.join(', ')}`,
        });
        return;
      }
      
      // 4.3 删除旧权限关联
      await RolePermission.destroy({
        where: { roleId },
        transaction: t
      });
      
      // 4.4 创建新权限关联
      const rolePermissions = permissions.map(permission => ({
        roleId: +roleId,
        permissionId: +permission.permissionId, // 注意使用 permissionId 字段
      }));
      
      await RolePermission.bulkCreate(rolePermissions, { transaction: t });
    }
    
    // 5. 提交事务
    await t.commit();
    
    // 6. 返回成功响应
    res.json({
      success: true,
      message: '角色更新成功',
      data: {}
    });
    
  } catch (error: any) {
    // 回滚事务
    await t.rollback();
    
    console.error('更新角色失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: error.message
    });
    next(error);
  }
};


// 删除角色
export const deleteRole = async (req: Request<{}, {}, { roleId: number }>, res: Response, next: NextFunction): Promise<void> => {
  const t = await db.sequelize.transaction();
  
  try {
    const  roleId  = (req as any).params.id ;
    
    // 1. 验证角色是否存在
    const role = await Role.findOne({
      where: { roleId, deleted: 0 },
      transaction: t
    });
    
    if (!role) {
      await t.rollback();
      res.status(404).json({
        success: false,
        message: '角色不存在或已被删除',
      });
      return;
    }
    
    // 2. 检查是否有用户关联此角色
    const userRoleCount = await UserRole.count({
      where: { roleId },
      transaction: t
    });
    
    if (userRoleCount > 0) {
      await t.rollback();
      res.status(400).json({
        success: false,
        message: '该角色已被用户使用，无法删除',
      });
      return;
    }
    
    // 3. 执行软删除
    const now = new Date();
    
    // 3.1 删除角色
    await Role.update({
      deleted: 1,
      dTime: now
    }, {
      where: { roleId },
      transaction: t
    });
    
    // 3.2 删除角色权限关联
    await RolePermission.update({
      deleted: 1,
      dTime: now
    }, {
      where: { roleId },
      transaction: t
    });
    
    // 4. 提交事务
    await t.commit();
    
    // 5. 返回成功响应
    res.json({
      success: true,
      message: '角色删除成功',
      data: {}
    });
    
  } catch (error: any) {
    // 回滚事务
    await t.rollback();
    
    console.error('删除角色失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: error.message
    });
    next(error);
  }
};

interface DeleteRoleRequest {
  roleId: number;
}
