import express from 'express';
const router = express.Router();
const bookkeepingController = require('../../controllers/mini/bookkeepingController');
import { authenticateMiniappToken } from '../middleware/miniappAuth';
// 小程序端认证中间件
// router.use(authenticateMiniappToken);

// 统计相关
router.get('/monthly-stats', bookkeepingController.getMonthlyStats);
router.get('/daily-records', bookkeepingController.getDailyRecords);
router.get('/chart-data', bookkeepingController.getMonthlyChartData); 

// 记账记录 CRUD
router.post('/records', bookkeepingController.createRecord);
router.put('/records/:id', bookkeepingController.updateRecord);
router.delete('/records/:id', bookkeepingController.deleteRecord);

// 分类管理 CRUD
router.get('/categories', bookkeepingController.getCategories);
router.post('/categories', bookkeepingController.createCategory);
router.put('/categories/:id', bookkeepingController.updateCategory);
router.delete('/categories/:id', bookkeepingController.deleteCategory);

export default router;
