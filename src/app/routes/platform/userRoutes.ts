import express from 'express';
import {
  createUser,
  updateUser,
  deleteUser,
  login,
  logout
} from '../../controllers/platform/user/post';
import {
  getUsers,
  getAllUserroles,
  captcha,
  currentUser,
} from '../../controllers/platform/user/get';

const router = express.Router();

// 平台管理端用户相关接口
router.post('/login', login);
router.get('/captcha', captcha);
router.post('/logout', logout);
router.post('/', createUser);
router.get('/', getUsers);
router.get('/getAllUserroles', getAllUserroles);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);
router.get('/currentUser', currentUser);

export default router;