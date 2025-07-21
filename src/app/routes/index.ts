import express from 'express';
import platformRoutes from './platform';
import clientRoutes from './client';
import miniappRoutes from './miniapp';

const router = express.Router();

// 平台管理端路由
router.use('/platform', platformRoutes);

// PC端用户路由
router.use('/client', clientRoutes);

// 小程序端路由
router.use('/miniapp', miniappRoutes);

export default router;
