
import express from 'express';
import {
  getAllPermissions,
} from '../../controllers/platform/menu/get';
import {
  createMenu,
  updateMenu,
  deleteMenu,
} from '../../controllers/platform/menu/post';
import { authenticateToken } from './authMiddleware';

const router = express.Router();
// 菜单配置，所有权限tree
router.get('/getAllPermissions',authenticateToken, getAllPermissions);
// 创建菜单
router.post('/',authenticateToken, createMenu);
// 更新菜单
router.put('/:id',authenticateToken, updateMenu);
// 删除菜单
router.delete('/:id',authenticateToken, deleteMenu);


export default router;