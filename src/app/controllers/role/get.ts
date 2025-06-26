/*
 * @Author: parker 960822987@qq.com
 * @Date: 2025-06-09 14:58:18
 * @LastEditors: parker 960822987@qq.com
 * @LastEditTime: 2025-06-23 22:58:46
 * @FilePath: \serveradmin\src\app\controllers\role\get.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */

import { Request, Response } from 'express';
import db from '../../models/platform';

const {Role, Permission} = db;

interface MenuItem {
  id: number;
  pid: number;
  name: string;
  description?: string;
  chird?: MenuItem[];
}

export const getAllroles = async (req: Request, res: Response) => {
  try {
    const userRoleList = await Role.findAll({
      where: { deleted: 0, status: 1 } as any,
      attributes: ['id', 'name', 'label', 'status']
    });

    res.status(200).json({ success: true, message: '获取成功', data: userRoleList });
  } catch (error) {
    console.error('Error getting roles:', error);
    res.status(500).json({ message: '获取角色失败' });
  }
};

export const getAllmenus = async (req: Request, res: Response) => {
  try {
    const menu = await Permission.findAll({
      where: { deleted: 0 } as any,
      raw: true,
      attributes: ['id', 'name', 'pid', 'description']
    });

    const buildTree = (arr: MenuItem[], pid: number): MenuItem[] => {
      const result: MenuItem[] = [];
      for (const item of arr) {
        if (item.pid === pid) {
          const children = buildTree(arr, item.id);
          if (children.length > 0) item.chird = children;
          result.push(item);
        }
      }
      return result;
    };

    const Tree = buildTree(menu as any, 0);
    res.status(200).json({ success: true, message: '获取成功', data: Tree });
  } catch (error) {
    console.error('Error getting menus:', error);
    res.status(500).json({ message: '获取菜单失败' });
  }
};