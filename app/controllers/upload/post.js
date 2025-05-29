const moment = require('moment');


// 上传图片接口
const uploadImage = async (req, res) => {
  
  if (!req.file) {
    return res.status(400).json({ message: '请上传图片' });
  }
  
  try {
    // 获取分类和日期信息
    const category = req.body.category || 'default';
    const dateDir = moment().format('YYYYMMDD');
    
    // 构建可访问的图片URL
    const imageUrl = `/images/${category}/${dateDir}/${req.file.filename}`;
    
    res.status(200).json({ 
      code:1,
      success: true,
      message: '图片上传成功',
      imageUrl
    });
  } catch (error) {
    console.error('处理上传图片失败:', error);
    res.status(500).json({ message: '服务器内部错误' });
  }
};



module.exports = {
  uploadImage,
};