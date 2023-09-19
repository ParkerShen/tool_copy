const express = require('express');
const router = express.Router();
const {
  createUser,
  updateUser,
  deleteUser,
  login,
  logout
} = require('../controllers/role/post');
const {
  getAllroles
} = require('../controllers/role/get');
const {
  authenticateToken
} = require('./authMiddleware');
// 定义需要拦截的接口
router.use(authenticateToken);
// 取得所有角色
router.get('/getAllroles', getAllroles);
// // 登录
// router.post('/login', login);


module.exports = router;