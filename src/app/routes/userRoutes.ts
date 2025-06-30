/*
 * @Author: parker 960822987@qq.com
 * @Date: 2025-06-09 14:58:18
 * @LastEditors: parker 960822987@qq.com
 * @LastEditTime: 2025-06-28 12:13:44
 * @FilePath: \serveradmin\src\app\routes\userRoutes.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import express from 'express';
import {
  createUser,
  updateUser,
  deleteUser,
  login,
  logout
} from '../controllers/user/post';
import {
  getUsers,
  getAllUserroles,
  captcha,
  currentUser,
  // currentPermission,
  // currentMenu,
} from '../controllers/user/get';
import { authenticateToken } from './authMiddleware';

const router = express.Router();
// 用户登录 使用return
router.post('/login', login);
// 不使用return
router.get('/captcha', captcha);
router.post('/logout', logout);
// router.use(authenticateToken);
router.post('/',authenticateToken, createUser); 
router.get('/',authenticateToken, getUsers);
router.get('/getAllUserroles',authenticateToken, getAllUserroles); 
router.put('/:id',authenticateToken, updateUser);
router.delete('/:id',authenticateToken, deleteUser);
// 获取当前用户权限
// router.get('/currentPermission', currentPermission);
// router.get('/currentPermission',authenticateToken, currentPermission);
// router.get('/currentMenu', (req: express.Request<{ userId: number }>, res: express.Response, next: express.NextFunction) => {
//   currentMenu(req, res).catch(next); 
// });
// 获取当前用户信息
router.get('/currentUser',authenticateToken, currentUser);

export default router;