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
  getAllUserroles,
  captcha
} = require('../controllers/user/get');
const {
  authenticateToken
} = require('./authMiddleware');

// 登录
router.post('/login', login);

// 获取验证码
router.get('/captcha', captcha);


// 登出
router.post('/logout', logout);

// 定义需要拦截的接口
router.use(authenticateToken);

// 创建新用户
router.post('/create', createUser);




// // 获取所有用户
router.get('/getUsers', getUsers);

// 添加用户获取所有角色
router.get('/getAllUserroles', getAllUserroles);


// 更新用户信息
router.post('/update', updateUser);

// 删除用户信息
router.post('/delete', deleteUser);


module.exports = router;