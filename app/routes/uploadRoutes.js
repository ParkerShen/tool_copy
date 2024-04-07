const express = require('express');
const multer = require('multer');
const router = express.Router();
const path = require('path');
const {
  uploadImage
} = require('../controllers/upload/post');

// 设置存储文件的目录和文件名
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
     // 使用绝对路径来存储文件
     const uploadDir = path.join(__dirname, '..','..','..', 'images','avatar');
     cb(null, uploadDir);
    //  cb(null, 'uploads/') // 存储在当前目录下的 uploads 文件夹中
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}${ext}`); // 使用时间戳作为文件名
  }
});
const upload = multer({storage});

const {
  authenticateToken
} = require('./authMiddleware');

// 定义需要拦截的接口
router.use(authenticateToken);


// 上传图片
router.post('/uploadimage', upload.single('image'), uploadImage);


module.exports = router;