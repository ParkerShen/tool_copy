import { NextFunction, Request, Response } from 'express';
import db from '../../../models/platform';
import { Op } from 'sequelize';
import svgCaptcha from 'svg-captcha';
import moment from 'moment';
const { Permission } = db;
import { generateRandom20String } from '../../../../util/common'

// 取得所有权限
export const getAllPermissions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 获取所有权限数据（按 orderNum 排序）
    const permissions = await Permission.findAll({
      attributes: [
        'id',
        'permissionId',
        'pid',
        'creatorId',
        'title',
        'name',
        'icon',
        'orderNum',
        'hide',
        'status',
        'path',
        'component',
        'access',
        'type'
      ],
      order: [['orderNum', 'ASC']],
      raw: true
    });

    // 构建树形结构
    const buildTree: any = (parentId = 0) => {
      const children = permissions
        .filter(permission => permission.pid === parentId)
        .map(child => ({
          ...child,
          children: buildTree(child.permissionId)
        }));

      return children.length ? children : undefined;
    };

    const treeData = buildTree();

    res.json({
      success: true,
      message: 'Success',
      data: treeData
    });
  }
  catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ success: false, error: 'tree列表失败' });
    next(error);
  }
};





