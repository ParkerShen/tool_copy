/*
 * @Date: 2025-07-21 17:27:24
 * @LastEditors: parker 960822987@qq.com
 * @LastEditTime: 2025-07-21 21:23:27
 * @FilePath: \serveradmin\src\app\routes\miniapp\index.ts
 */
import express from 'express';
import bookkeepingRoutes from './bookRoutes';


const router = express.Router();

router.use('/bookkeepings', bookkeepingRoutes);

export default router;