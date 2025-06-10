import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import db from '../models';
const { BlackToken } = db;

interface DecodedToken {
  _id: string;
  [key: string]: any;
}

export const authenticateToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (req.path === '/captcha') return next();

    const token = req.headers.authorization;
    if (!token) {
      res.status(401).json({ message: '未提供Token' });
      return;
    }

    const invalidatedToken = await BlackToken.findOne({ where: { token } });
    if (invalidatedToken) {
      res.status(401).json({ message: 'Token 失效，请重新登录' });
      return;
    }

    const decoded = jwt.verify(token, 'shenserver') as DecodedToken;
    (req as any).user = decoded;
    next();
  } catch (error) {
    res.status(200).json({ code: 401, message: 'Token过期，重新登陆' });
  }
};