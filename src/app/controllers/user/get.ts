import { Request, Response } from 'express';
import db from '../../models/platform';
import { Op } from 'sequelize';
import svgCaptcha from 'svg-captcha';

const { User, Role, UserRole } = db;
interface UserQueryParams {
  page?: string;
  pageSize?: string;
  username?: string;
  status?: string;
  isAdmin?: string;
  roles?: string;
}

interface SessionWithCaptcha  {
  captcha?: string;
}

export const getUsers = async (req: Request<{}, {}, {}, UserQueryParams>, res: Response) => {
  try {
    const { page = '1', pageSize = '10', username, status, isAdmin, roles } = req.query;
    
    const whereClause: any = { deleted: 0 };
    if (username) whereClause.username = { [Op.like]: `%${username}%` };
    if (status) whereClause.status = parseInt(status);
    if (isAdmin) whereClause.isAdmin = parseInt(isAdmin);

    const { count, rows: users } = await User.findAndCountAll({
      where: whereClause,
      attributes: ['userId', 'username', 'email', 'phone', 'isAdmin', 'avatar', 'status', 'cTime'],
      offset: (parseInt(page) - 1) * parseInt(pageSize),
      limit: parseInt(pageSize),
      include: [{
        model: Role,
        attributes: [['name', 'roleName'], 'roleId'],
        through: { attributes: [] },
        required: false
      }],
      distinct: true
    }) as any;

    let filteredUsers = users;
    if (roles) {
      const roleId = parseInt(roles);
      filteredUsers = users.filter((user: any) => 
        user.Roles.some((role: any) => role.roleId === roleId)
      );
    }

    res.status(200).json({
      count: filteredUsers.length,
      code: 1,
      message: '获取成功',
      data: filteredUsers
    });
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ error: '获取用户时发生错误' });
  }
};

export const getAllUserroles = async (req: Request, res: Response) => {
  try {
    const userRoleList = await Role.findAll({
      where: { deleted: 0, status: 1 }as any,
      attributes: ['id', 'name', 'roleId']
    });

    res.status(200).json({ code: 1, message: '获取成功', data: userRoleList });
  } catch (error) {
    console.error('Error getting user roles:', error);
    res.status(500).json({ message: '获取用户角色失败' });
  }
};

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