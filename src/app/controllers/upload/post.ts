/*
 * @Author: parker 960822987@qq.com
 * @Date: 2025-06-09 14:58:18
 * @LastEditors: parker 960822987@qq.com
 * @LastEditTime: 2025-06-28 12:23:57
 * @FilePath: \serveradmin\src\app\controllers\upload\post.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { NextFunction, Request, Response } from 'express';

// Extend the Request type to include the category property
declare global {
  namespace Express {
    interface Request {
      category?: string;
    }
  }
}
import moment from 'moment';

export const uploadImage = (req: Request, res: Response,next: NextFunction) => {
  if (!req.file) {
     res.status(400).json({ message: '请上传图片' });
     return
  }

  try {
    const category = req.category; // 从中间件获取
    const dateDir = moment().format('YYYYMMDD');
    const imageUrl = `/images/${category}/${dateDir}/${req.file.filename}`;
    
    res.status(200).json({ 
      success: true,
      message: '图片上传成功',
      data: imageUrl
    });
  } catch (error) {
    console.error('上传图片失败:', error);
    res.status(500).json({ message: '服务器内部错误' });
    next(error)
  }
};