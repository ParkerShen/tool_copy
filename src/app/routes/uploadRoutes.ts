import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import moment from 'moment';
import { uploadImage } from '../controllers/upload/post';
import { authenticateToken } from './authMiddleware';

const router = express.Router(); 

const createStorage = () => {
  return multer.diskStorage({
    destination: (req: Request, file: any, cb: (error: Error | null, destination: string) => void) => {
      try {
        const category = req.body.category || 'default';
        const dateDir = moment().format('YYYYMMDD');
        const basePath = path.join(__dirname, '..', '..', 'images');
        const categoryPath = path.join(basePath, category);
        const fullPath = path.join(categoryPath, dateDir);
        
        [basePath, categoryPath, fullPath].forEach(dir => {
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
          }
        });
        
        cb(null, fullPath);
      } catch (error) {
        cb(error as Error, '');
      }
    },
    filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
      const ext = path.extname(file.originalname);
      const random = Math.floor(Math.random() * 10000);
      cb(null, `${Date.now()}-${random}${ext}`);
    }
  });
};

const upload = multer({ storage: createStorage() });

router.use(authenticateToken);
// router.post('/uploadimage', upload.single('image'), uploadImage);

export default router;