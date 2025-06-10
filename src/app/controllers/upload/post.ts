import { Request, Response } from 'express';
import moment from 'moment';

export const uploadImage = (req: any, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ message: '请上传图片' });
  }
  
  try {
    const category = req.body.category || 'default';
    const dateDir = moment().format('YYYYMMDD');
    const imageUrl = `/images/${category}/${dateDir}/${req.file.filename}`;
    
    res.status(200).json({ 
      code: 1,
      success: true,
      message: '图片上传成功',
      imageUrl
    });
  } catch (error) {
    console.error('上传图片失败:', error);
    res.status(500).json({ message: '服务器内部错误' });
  }
};