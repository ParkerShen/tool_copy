const express = require('express');
const router = express.Router();
const {
  createRole,
  updateRole,
  deleteRole
} = require('../controllers/role/post');
const {
  getAllroles,
  getAllmenus
} = require('../controllers/role/get');
const {
  authenticateToken
} = require('./authMiddleware');
// 定义需要拦截的接口
router.use(authenticateToken);
// 取得所有角色
router.get('/getAllroles', getAllroles);

// 取得所有菜单
router.get('/getAllmenus', getAllmenus);

// 创建角色
router.post('/createRole', createRole);

// 修改角色
router.post('/updateRole', updateRole);
// 删除角色
router.post('/deleteRole', deleteRole);






// // 登录
// router.post('/login', login);


module.exports = router;