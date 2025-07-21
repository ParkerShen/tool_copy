/*
 * @Date: 2025-07-21 16:48:52
 * @LastEditors: parker 960822987@qq.com
 * @LastEditTime: 2025-07-21 17:00:17
 * @FilePath: \serveradmin\src\app\routes\platform\index.ts
 */
import express from 'express';
import userRoutes from './userRoutes';
import roleRoutes from '../roleRoutes';
import menuRoutes from '../menuRoutes';
import uploadRoutes from '../uploadRoutes';
import { authenticateToken } from '../middleware/platformAuth';

const router = express.Router();

// 平台管理端认证中间件
router.use(authenticateToken);

router.use('/users', userRoutes);
router.use('/roles', roleRoutes);
router.use('/menus', menuRoutes);
router.use('/uploads', uploadRoutes);

export default router;
