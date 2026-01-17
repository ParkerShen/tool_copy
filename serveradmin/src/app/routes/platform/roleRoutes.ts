/*
 * @Date: 2025-06-09 14:58:18
 * @LastEditors: parker 960822987@qq.com
 * @LastEditTime: 2025-07-01 13:46:48
 * @FilePath: \serveradmin\src\app\routes\roleRoutes.ts
 */
import express from 'express';
import {
  createRole,
  updateRole,
  deleteRole
} from '../../controllers/platform/role/post';
import {
  getAllroles,
  getAllmenus,
  getRoleList,
} from '../../controllers/platform/role/get';
import { authenticateToken } from './authMiddleware';

const router = express.Router();

// router.use(authenticateToken);
router.get('/getAllroles',authenticateToken, getAllroles);
// 获取所有菜单
router.get('/getAllmenus',authenticateToken, getAllmenus);
// 创建角色
router.post('/',authenticateToken, createRole);
// 修改角色
router.put('/:id',authenticateToken, updateRole);
// 删除角色
router.delete('/:id',authenticateToken, deleteRole);
// 获取角色列表
router.get('/',authenticateToken, getRoleList);
// router.post('/updateRole', updateRole);
// router.post('/deleteRole', deleteRole);

export default router;