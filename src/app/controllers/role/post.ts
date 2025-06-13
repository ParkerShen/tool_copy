import { Request, Response } from 'express';
import db from '../../models/platform';
const {Role} = db;

interface RoleRequestBody {
  name: string;
  description: string;
  menu: Array<{ id: number, pid: number }>;
  id?: string;
}

interface RoleRequestBody {
  name: string;
  description: string;
  menu: Array<{ id: number; pid: number }>;
  id?: string;
}

export const createRole = async (req: Request<{}, {}, RoleRequestBody>, res: Response): Promise<void> => {
  try {
    const { name, description, menu } = req.body;
    const existingRole = await Role.findOne({ where: { deleted: 0, name } } as any);

    if (existingRole) {
      res.status(200).json({ status: 2, message: '角色已存在，请修改' });
      return;
    }

    const uniqueValues = new Set(menu.flatMap(item => [item.id, item.pid]));
    const newRole = await Role.create({
      name,
      description,
      creatorId: 1,
      roleMenuId: Array.from(uniqueValues).join(','),
    } as any);

    res.status(200).json({ code: 1, message: '创建成功' });
  } catch (error) {
    console.error('Error creating role:', error);
    res.status(500).json({ message: 'Error creating role' });
  }
};

export const updateRole = async (req: Request<{}, {}, RoleRequestBody>, res: Response): Promise<void> => {
  try {
    const { id, name, description, menu } = req.body;
    const existingRole = await Role.findOne({ where: { name } });

    if (existingRole && existingRole.id !== id) {
      res.status(200).json({ status: 2, message: '角色已存在，请修改' });
      return;
    }

    const role = await Role.findByPk(id) as any;
    if (!role) {
      res.status(404).json({ message: '角色未找到' });
      return;
    }

    const uniqueValues = new Set(menu.flatMap(item => [item.id, item.pid]));
    role.name = name;
    role.uTime = new Date();
    role.description = description;
    role.roleMenuId = Array.from(uniqueValues).join(',');

    await role.save();
    res.status(200).json({ code: 1, message: '修改成功' });
  } catch (error) {
    console.error('Error updating role:', error);
    res.status(500).json({ message: 'Error updating role' });
  }
};

export const deleteRole = async (req: Request<{}, {}, { id: string }>, res: Response): Promise<void> => {
  const { id } = req.body;
  try {
    const role = await Role.findByPk(id) as any;
    if (!role) {
      res.status(404).json({ message: '角色未找到' });
      return;
    }

    role.deleted = 1;
    role.dTime = new Date();
    await role.save();

    res.status(200).json({ code: 1, message: '删除成功' });
  } catch (error) {
    console.error('Error deleting role:', error);
    res.status(500).json({ error: '删除角色时发生错误' });
  }
};