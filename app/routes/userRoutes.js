const express = require('express');
const router = express.Router();
const {
  createUser,
  updateUser,
  deleteUser,
  login,
  logout
} = require('../controllers/user/post');
const {
  getUsers,
  getPermissions
} = require('../controllers/user/get');
const {
  authenticateToken
} = require('./authMiddleware');

// 登录
router.post('/login', login);

// 登出
router.post('/logout', logout);

// 创建新用户
router.post('/create', createUser);

// 定义需要拦截的接口
// router.use(authenticateToken);


// // 获取所有用户
router.get('/getUsers', getUsers);


// 更新用户信息
router.post('/update', updateUser);

// 更新用户信息
router.post('/delete', deleteUser);


module.exports = router;