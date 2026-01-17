/*
 * @Date: 2025-07-21 16:48:53
 * @LastEditors: parker 960822987@qq.com
 * @LastEditTime: 2025-07-21 17:04:34
 * @FilePath: \serveradmin\src\app\routes\client\index.ts
 */
import express from 'express';
import userRoutes from '../platform/userRoutes';
import { authenticateClientToken } from '../../routes/middleware/clientAuth';

const router = express.Router();

// 客户端认证中间件
router.use(authenticateClientToken);

router.use('/users', userRoutes);

export default router;
