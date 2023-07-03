const express = require('express');
const router = express.Router();
const {
  createUser,
  updateUser,
  deleteUser,
  login
} = require('../controllers/user/post');
const {
  getUsers
} = require('../controllers/user/get');
const authenticateToken = require('./authMiddleware');

// 登录
router.post('/login', login);

// 定义需要拦截的接口
router.use(authenticateToken);


// // 获取所有用户
router.get('/getUsers', getUsers);

// 创建新用户
router.post('/create', createUser);

// 更新用户信息
router.post('/update', updateUser);

// 更新用户信息
router.post('/delete', deleteUser);


module.exports = router;