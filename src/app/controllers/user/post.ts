import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import moment from 'moment';
import { Op, Sequelize, Transaction } from 'sequelize';
import db from '../../models/platform';
const { User,  UserRole, Role, BlackToken, Permission } = db;
import { generateToken } from '../../../util/jwtUtils';
import { generateRandom20String } from '../../../util/common';

// 登录接口
export const login = async (req: any, res: Response) => {
  try {
    const { username, password, verifyCode } = req.body;
    
    // 验证码检查
    // 这里的代码不能删除
    // if (!req.session?.captcha) {
    //   return res.status(200).json({
    //     code: 0,
    //     message: "验证码已过期，请重新获取"
    //   });
    // }
    
    // const inputCode = verifyCode.toLowerCase();
    // const sessionCode = (req.session as any).captcha.toLowerCase();
    
    // if (inputCode !== sessionCode) {
    //   return res.status(200).json({
    //     code: 0,
    //     message: "验证码错误，请重新输入",
    //   });
    // }

    const user = await User.findOne({
      where: { username, deleted: 0 } as any,
      raw: true,
    }) as any;

    if (!user) {
      return res.status(200).json({
        code: 0,
        message: "用户不存在，请重新输入",
      });
    }

    if (user.status === 0) {
      return res.status(200).json({
        code: 0,
        message: "当前账号已禁用，请联系管理员",
      });
    }

    if (!bcrypt.compareSync(password + user.salt, user.password)) {
      return res.status(200).json({
        code: 0,
        message: "密码错误，请重新输入",
      });
    }

    const getClientIp = () => {
      const forwardedFor = req.headers['x-forwarded-for'];
      if (typeof forwardedFor === 'string') {
        return forwardedFor.split(',')[0].trim();
      }
      return req.socket.remoteAddress || '';
    };
    const clientIp = getClientIp();

    const token = await generateToken(username);

    const userinfo = await User.findAll({
      where: { userId: user.id },
      raw:true,
      nest: true
    }) as any;

    try {
      // 更新登录信息
      await User.update({
        loginip: clientIp,
        loginCount: Sequelize.literal('login_count + 1'), // 使用原生的SQL递增
        lastLoginAt: new Date()
      }, {
        where: { userId: user.userId }
      });
    } catch (updateError) {
      console.error('更新登录信息失败:', updateError);
    }

    return res.status(200).json({
      code: 1,
      data: {
        accessToken: token,
        refreshToken: token,
        user: {
          id: userinfo[0].id,
          username: userinfo[0].username,
          email: userinfo[0].email,
          avatar: userinfo[0].avatar,
          permissions: transformArray(userinfo as any, 0),
        },
      },
      message: "登录成功",
    });
  } catch (error: any) {
    console.error("登录错误:", error);
    return res.status(500).json({
      code: 0,
      message: "服务器错误，请稍后重试",
      details: error.message
    });
  }
};

// 转换权限数组结构
const transformArray = (arr: any[], parentId: number): any[] => {
  const result: any[] = [];

  arr.forEach((item: any) => {
    if (item.Roles && Array.isArray(item.Roles)) {
      item.Roles.forEach((role: any) => {
        if (role.Permissions) {
          role.Permissions.forEach((perm: any) => {
            if (perm.parentId === parentId) {
              const children = transformArray([perm], perm.permissionId);
              const newItem = {
                id: perm.permissionId,
                parentId: perm.parentId,
                label: perm.label,
                name: perm.name,
                icon: perm.icon,
                type: perm.type,
                route: perm.route,
                order: perm.order,
                hide: perm.hide,
                status: perm.status,
                component: perm.component || null,
                children: children.length ? children : null,
              };
              result.push(newItem);
            }
          });
        }
      });
    }
  });

  return result;
};

// 登出接口
export const logout = async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    await BlackToken.create({ token });
    res.status(200).json({
      code: 1,
      message: "登出成功",
    });
  } catch (error: any) {
    res.status(500).json({
      code: 0,
      message: "登出失败",
      details: error.message
    });
  }
};

// 创建新用户
export const createUser = async (req: Request, res: Response) => {
  const t = await db.sequelize.transaction();
   
  try {
    const { username, email, phone, isAdmin, roles = [], status, avatar } = req.body;
    let { password = "" } = req.body;

    // 参数验证
    if (!username) {
       res.status(200).json({
        code: 0,
        message: "用户名不能为空",
      });
    }

    // 检查用户名唯一性
    const existingUser = await User.findOne({
      where: { username, deleted: 0 } as any,
      transaction: t
    });

    if (existingUser) {
      await t.rollback();
       res.status(200).json({
        code: 0,
        message: "账号已存在，请修改",
      });
    }

    // 检查手机号唯一性
    if (phone) {
      const phoneUser = await User.findOne({
        where: { phone, deleted: 0 } as  any,
        transaction: t
      });

      if (phoneUser) {
        await t.rollback();
         res.status(200).json({
          code: 0,
          message: "手机号码已存在，请修改",
        });
      }
    }

    // 检查邮箱唯一性
    if (email) {
      const emailUser = await User.findOne({
        where: { email, deleted: 0 } as any,
        transaction: t
      });

      if (emailUser) {
        await t.rollback();
         res.status(200).json({
          code: 0,
          message: "邮箱已存在，请修改",
        });
      }
    }

    // 密码处理
    const salt = generateRandom20String();
    const saltRounds = 10;
    
    if (password) {
      password = bcrypt.hashSync(password + salt, saltRounds);
    } else {
      password = bcrypt.hashSync("123456" + salt, saltRounds);
    }

    // 创建用户
    const id = generateRandom20String();
    const newUser = await User.create({
      userId: moment().unix(),
      username,
      password,
      isAdmin: isAdmin ? 1 : 0,
      salt,
      email: email || null,
      phone: phone || null,
      status: status || 1,
      avatar: avatar || null,
      cTime: new Date(),
      uTime: new Date(),
      deleted: 0,
      logins: 0
    } as any, { transaction: t });

    // 分配角色
    await Promise.all(roles.map(async (roleId: number) => {
      await UserRole.create({
        userId: newUser.getDataValue('userId'),
        roleId,
        cTime: new Date(),
        uTime: new Date()
      }  as any, { transaction: t });
    }));

    await t.commit();
    
    res.status(200).json({
      code: 1,
      message: "创建成功",
    });
  } catch (error: any) {
    await t.rollback();
    res.status(500).json({
      code: 0,
      message: "创建用户失败",
      details: error.message
    });
  }
};

// 删除用户
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    await User.update(
      { deleted: 1 }  as any,
      { where: { userId } }
    );

    res.status(200).json({
      code: 1,
      message: "删除成功",
    });
  } catch (error: any) {
    res.status(500).json({
      code: 0,
      message: "删除用户失败",
      details: error.message
    });
  }
};

// 修改用户
export const updateUser = async (req: Request, res: Response) => {
  try {
    const { userId, username, password, email, phone, status, avatar, isAdmin, roles = [] } = req.body;

    const user = await User.findByPk(userId) as any;
    if (!user) {
       res.status(200).json({
        code: 0,
        message: "用户不存在",
      });
    }

    // 更新基本信息
    user.username = username;
    user.email = email || user.email;
    user.phone = phone || user.phone;
    user.status = status !== undefined ? status : user.status;
    user.avatar = avatar || user.avatar;
    user.uTime = new Date();
    user.isAdmin = isAdmin;

    // 密码更新
    if (password) {
      const hashedPassword = bcrypt.hashSync(password + user.salt, 10);
      user.password = hashedPassword;
    }

    await user.save();

    // 更新角色
    await UserRole.destroy({ where: { userId } });
    await Promise.all(roles.map(async (roleId: number) => {
      await UserRole.create({
        userId,
        roleId,
        cTime: new Date(),
        uTime: new Date()
      }as any) ;
    }));

    res.status(200).json({
      code: 1,
      message: "更新成功",
    });
  } catch (error: any) {
    res.status(500).json({
      code: 0,
      message: "更新用户失败",
      details: error.message
    });
  }
};