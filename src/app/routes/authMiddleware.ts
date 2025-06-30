import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import db from '../models/platform';
const { BlackToken } = db;

interface DecodedToken {
  _id: string;
  [key: string]: any;
}

export const authenticateToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // 设置免认证路径白名单
  const ALLOWED_PATHS = ['/login', '/captcha', '/logout']; 
  if (ALLOWED_PATHS.includes(req.path)) return next(); // 白名单直接放行

  try {
    const token = req.headers.authorization;
    if (!token) {
      res.status(401).json({ message: '未提供Token' });
      return;
    }

    const invalidatedToken = await BlackToken.findOne({ where: { token } });
    if (invalidatedToken) {
      res.status(401).json({ message: 'Token失效，请重新登录' });
      return;
    }

    const decoded = jwt.verify(token, 'shenserver') as DecodedToken;
    (req as any).user = decoded;
    next();
  } catch (error) {
    console.error('Token验证失败:', error);
    res.status(401).json({ message: 'Token过期，请重新登录' });
    next(error)
  }
};