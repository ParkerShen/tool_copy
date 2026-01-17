import { NextFunction, Request, Response } from 'express';
import db from '../../../models/platform';
import { Op } from 'sequelize';
import svgCaptcha from 'svg-captcha';
import moment from 'moment';
const { Permission } = db;
import { generateRandom20String } from '../../../../util/common'


// 创建菜单
export const createMenu = async (req: Request, res: Response, next: NextFunction) => {
    const t = await db.sequelize.transaction();
  try {
    const {
      pid,
      title,
      name,
      icon,
      orderNum,
      hide,
      status,
      path,
      component,
      access,
      type,
      description,
    } = req.body;

    // 验证父节点是否存在
    if (pid !== 0) {
      const parent = await db.Permission.findByPk(pid,{transaction: t});
      if (!parent) {
        await t.rollback();
         res.status(400).json({
          code: 400,
          message: '父节点不存在'
        });
        return
      }
    }

    // 创建新权限
    const newPermission = await Permission.create({
      id: generateRandom20String(),
      pid,
      creatorId: (req as any).user?.userId,
      title,
      name,
      icon: icon || null,
      orderNum: orderNum || 0,
      hide: hide || 0,
      status: status || 1,
      path: path || null,
      component: component || null,
      access,
      type,
      description,
      cTime : new Date,
    }, { transaction: t });

    await t.commit(); 

    res.json({
      success: true,
      message: '权限创建成功',
      data: newPermission
    });

  }
  catch (error) {
    await t.rollback();
    console.error('Error getting users:', error);
    res.status(500).json({ success: false, error });
    next(error);
  }
};

// 更新菜单
export const updateMenu = async (req: Request, res: Response, next: NextFunction) => {
    const t = await db.sequelize.transaction();
  try {

    const permissionId = req.params.id;
    const {
      pid,
      title,
      name,
      icon,
      orderNum,
      hide,
      status,
      path,
      component,
      access,
      type,
      description,
    } = req.body;

    // 查找要更新的权限
    const permission = await db.Permission.findByPk(permissionId, { transaction: t });
    if (!permission) {
    await t.rollback();
       res.status(404).json({
        success: false,
        message: '权限节点不存在'
      });
      return
    }

    // 验证父节点是否存在
    if (pid !== 0) {
      const parent = await db.Permission.findByPk(pid, { transaction: t });
      if (!parent) {
         res.status(400).json({
          success: false,
          message: '父节点不存在'
        });
        return
      }
    }

    // 更新权限
    await permission.update({
      pid,
      title,
      name,
      icon: icon || null,
      orderNum: orderNum || 0,
      hide: hide || 0,
      status: status || 1,
      path: path || null,
      component: component || null,
      access,
      type,
      description,
      dTime:new Date
    });

    await t.commit(); 

    res.json({
      success: true,
      message: '权限更新成功',
      data: permission
    });

  }
  catch (error) {
    await t.rollback();
    console.error('Error getting users:', error);
    res.status(500).json({ success: false, error: '菜单跟新失败' });
    next(error);
  }
};


// 删除菜单
export const deleteMenu = async (req: Request, res: Response, next: NextFunction) => {
  const permissionId = req.params.id;
  try {
    // 查找要删除的权限
    const permission = await db.Permission.findByPk(permissionId);
    if (!permission) {
       res.status(404).json({
        success:false,
        message: '权限节点不存在'
      });
      return
    }

    // 检查是否有子节点
    const childCount = await db.Permission.count({
      where: { pid: permissionId }
    });

    if (childCount > 0) {
       res.status(400).json({
        success:false,
        message: '无法删除含有子节点的权限'
      });
      return
    }

    // 检查是否被角色引用
    const rolePermissionCount = await db.RolePermission.count({
      where: { permissionId }
    });

    if (rolePermissionCount > 0) {
       res.status(400).json({
        success:false,
        message: '无法删除已被角色引用的权限'
      });
      return
    }

    // 删除权限
    await permission.destroy();

    res.json({
      success:true,
      message: '权限删除成功'
    });
  }
  catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ success: false, error: '菜单删除失败' });
    next(error);
  }
};




