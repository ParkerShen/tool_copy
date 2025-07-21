import express from 'express';
import userRoutes from './userRoutes';
import { authenticateMiniappToken } from '../middleware/miniappAuth';

const router = express.Router();

// 小程序端认证中间件
router.use(authenticateMiniappToken);

router.use('/users', userRoutes);

export default router;