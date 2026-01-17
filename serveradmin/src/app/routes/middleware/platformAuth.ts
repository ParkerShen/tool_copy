import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import db from '../../models/platform';

const { BlackToken } = db;

export const authenticateToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const ALLOWED_PATHS = ['/login', '/captcha', '/logout'];
  if (ALLOWED_PATHS.includes(req.path)) return next();

  try {
    const token = req.headers.authorization;
    if (!token) {
      res.status(401).json({ message: '未提供Token' });
      return;
    }

    // 检查平台端黑名单
    const invalidatedToken = await BlackToken.findOne({ where: { token } });
    if (invalidatedToken) {
      res.status(401).json({ message: 'Token失效，请重新登录' });
      return;
    }

    const decoded = jwt.verify(token, 'shenserver') as any;
    
    // 验证是否为平台端token
    if (decoded.clientType !== 'platform') {
      res.status(403).json({ message: '无权限访问平台管理端' });
      return;
    }

    (req as any).user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token过期，请重新登录' });
  }
};