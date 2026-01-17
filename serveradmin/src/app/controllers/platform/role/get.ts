/*
 * @Author: parker 960822987@qq.com
 * @Date: 2025-06-09 14:58:18
 * @LastEditors: parker 960822987@qq.com
 * @LastEditTime: 2025-07-02 20:39:50
 * @FilePath: \serveradmin\src\app\controllers\role\get.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */

import { NextFunction, Request, Response } from 'express';
import db from '../../../models/platform';
import { Op } from 'sequelize';
const {Role, Permission,RolePermission} = db;
import moment from 'moment';
interface RoleQueryParams {
  page?: string;
  pageSize?: string;
  name?: string; // 角色名称
  status?: string; 
  cTimeRange?:string[];
}

interface MenuItem {
  id: number;
  pid: number;
  name: string;
  description?: string;
  chird?: MenuItem[];
}


export const getAllroles = async (req: Request, res: Response,next:NextFunction) => {
  try {
    const userRoleList = await Role.findAll({
      where: { deleted: 0, status: 1 } as any,
      attributes: ['id', 'name', 'label', 'status']
    });

    res.status(200).json({ success: true, message: '获取成功', data: userRoleList });
  } catch (error) {
    console.error('Error getting roles:', error);
    res.status(500).json({ message: '获取角色失败' });
    next(error)
  }
};

// 获取所有菜单
export const getAllmenus = async (req: Request, res: Response,next: NextFunction) => {
  try {
    // 1. 查询所有权限数据
    const permissions = await Permission.findAll({
      attributes: ['permissionId', 'pid', 'title', 'access', 'type', 'orderNum'],
      order: [['orderNum', 'ASC']],
      raw: true
    });

    // 2. 构建树形结构
    const buildTree = (parentId: number = 0): { title: string; key: string; children: any[] }[] => {
      return permissions
        .filter(permission => permission.pid === parentId)
        .sort((a, b) => a.orderNum - b.orderNum)
        .map(node => ({
          title: node.title,
          key: node.access,
          children: buildTree(Number(node.permissionId))
        }));
    };

    // 3. 获取顶级节点 (pid=0)
    const treeData = buildTree();

    res.json({
      success: true,
      data: treeData,
      message: '权限树获取成功'
    });
  } catch (error) {
    console.error('获取权限树失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
    next(error)
  }
};

// 取得角色列表
export const getRoleList  = async (req: Request<{}, {}, {}, RoleQueryParams>, res: Response,next: NextFunction) => {
  try {
    const { page = '1', pageSize = '10', name, status, cTimeRange } = req.query;
    const pageNum = parseInt(page);
    const size = parseInt(pageSize);
    const offset = (pageNum - 1) * size;
    const startTime = cTimeRange?.[0]
    const endTime = cTimeRange?.[1]
    
    // 基础查询条件
    const whereClause: any = { deleted: 0 };
    if (name) whereClause.name = { [Op.like]: `%${name}%` };
    if (status) whereClause.status = parseInt(status);
    if (startTime) {
      const cleanStartTime = String(startTime).replace(/^["']+|["']+$/g, '');
      const cleanEndTime = String(endTime).replace(/^["']+|["']+$/g, '');
      
      const startDateObj = new Date(cleanStartTime);
      const endDateObj = new Date(cleanEndTime);
      
        whereClause.cTime = whereClause.cTime || {};
        whereClause.cTime[Op.gte] = moment(startDateObj).format('YYYY-MM-DD HH:mm:ss');  
        whereClause.cTime[Op.lte] = moment(endDateObj).format('YYYY-MM-DD HH:mm:ss');  
    }
  
     // 获取角色列表
     const { count, rows: roles } = await Role.findAndCountAll({
      where:whereClause,
      offset,
      limit: size,
      order: [['cTime', 'DESC']],
      attributes: ['roleId', 'name', 'status', 'description', 'cTime'],
      raw:true,
    });
    
    // 获取角色ID数组
    const roleIds = roles.map(role => role.roleId);
    
    // 获取这些角色的权限
    const rolePermissions = await RolePermission.findAll({
      where: { roleId: roleIds },
      include: [{
        model: Permission,
        as: 'permission',
        attributes: ['access']
      }],
      raw:true
    });
    res.status(200).json({
      total: count,
      current:+page,
      pageSize:+pageSize,
      success: true,
      message: '获取成功',
      data: mergePermissions(rolePermissions,roles)
    });
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ success: false, error: '获取角色列表失败' });
    next(error);
  }
};

function mergePermissions(arr1:any, arr2:any) {
  // 创建角色映射表（roleId -> 角色对象）
  const roleMap = new Map();
  
  // 深拷贝 arr2 并初始化 permissions 数组
  const arr3 = arr2.map((role:any) => {
    const newRole = {...role, permissions: []};
    roleMap.set(newRole.roleId, newRole);
    return newRole;
  });

  // 遍历权限数组，将权限添加到对应角色
  arr1.forEach((item:any) => {
    const role = roleMap.get(item.roleId);
    if (role && item['permission.access']) {
      role.permissions.push(item['permission.access']);
    }
  });

  return arr3;
}