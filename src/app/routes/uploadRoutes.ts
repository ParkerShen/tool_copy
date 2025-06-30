import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import moment from 'moment';
import { uploadImage } from '../controllers/upload/post';
import { authenticateToken } from './authMiddleware';

const router = express.Router();

// === 新增：分类中间件 ===
const getCategory = (req: any, res: Response, next: NextFunction) => {
  // 从查询参数优先获取，或使用body中的值，或默认default
  req.category = req.query.category?.toString() || req.body.category?.toString() || 'default';
  next();
};

// === 修改：简化存储创建 ===
const storage = multer.diskStorage({
  destination: (req: any, file, cb) => { // 使用any类型访问req.category
    try {
      const dateDir = moment().format('YYYYMMDD');
      const basePath = path.join(__dirname, '..', '..', '..', 'public', 'images');
      const categoryPath = path.join(basePath, req.category); // 使用中间件设置的req.category
      const fullPath = path.join(categoryPath, dateDir);

      // 确保目录存在（支持递归创建）
      fs.mkdirSync(fullPath, { recursive: true });
      
      cb(null, fullPath);
    } catch (error) {
      cb(error as Error, '');
    }
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const random = Math.floor(Math.random() * 10000);
    cb(null, `${Date.now()}-${random}${ext}`);
  }
});

const upload = multer({ storage });

// === 关键修改：添加分类中间件 ===
// router.use(authenticateToken);
router.post('/uploadimage', 
  getCategory, // 新增分类中间件
  upload.single('image'),
  authenticateToken,uploadImage
);

export default router;