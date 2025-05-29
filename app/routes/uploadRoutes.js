const express = require('express');
const multer = require('multer');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const moment = require('moment');
const { uploadImage } = require('../controllers/upload/post');

// 创建动态存储路径的函数
const createStorage = () => {
  return multer.diskStorage({
    destination: function (req, file, cb) {
      try {
        // 1. 从请求参数获取分类目录（默认为'default'）
        const category = req.body.category || 'default';
        
        // 2. 生成日期目录（格式：YYYYMMDD）
        const dateDir = moment().format('YYYYMMDD');
        
        // 3. 构建完整路径：项目根目录/images/分类/日期
        const basePath = path.join(__dirname, '..', '..', 'images');
        const categoryPath = path.join(basePath, category);
        const fullPath = path.join(categoryPath, dateDir);
        
        // 4. 递归创建目录（如果不存在）
        if (!fs.existsSync(basePath)) fs.mkdirSync(basePath);
        if (!fs.existsSync(categoryPath)) fs.mkdirSync(categoryPath);
        if (!fs.existsSync(fullPath)) fs.mkdirSync(fullPath);
        
        console.log(`文件将保存到: ${fullPath}`);
        cb(null, fullPath);
      } catch (error) {
        console.error('创建目录失败:', error);
        cb(error, null);
      }
    },
    filename: function (req, file, cb) {
      // 生成唯一文件名：时间戳+随机数+扩展名
      const ext = path.extname(file.originalname);
      const random = Math.floor(Math.random() * 10000);
      cb(null, `${Date.now()}-${random}${ext}`);
    }
  });
};

// 动态创建multer实例
const upload = multer({ storage: createStorage() });

const { authenticateToken } = require('./authMiddleware');
router.use(authenticateToken);

// 上传图片接口
router.post('/uploadimage', upload.single('image'), uploadImage);

module.exports = router;