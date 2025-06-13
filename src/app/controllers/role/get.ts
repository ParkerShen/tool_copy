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

    res.status(200).json({ code: 1, message: '获取成功', data: userRoleList });
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
    res.status(200).json({ code: 1, message: '获取成功', data: Tree });
  } catch (error) {
    console.error('Error getting menus:', error);
    res.status(500).json({ message: '获取菜单失败' });
  }
};