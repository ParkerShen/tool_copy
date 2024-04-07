// const {
//   User,
//   Usercontactinfo,
//   BlackToken,
//   Role,
//   Permission,
//   RolePermission
// } = require('../../models');


// 上传图片接口
const uploadImage = async (req, res) => {
  try {
    console.log('req.file',req.file)
    const imageUrl = `http://localhost:3001/${req.file.path}`; // 构建图片链接
    // 将 Windows 文件路径转换为 Unix 风格路径
const unixStylePath = imageUrl.replace(/\\/g, '/');
// 截取 '/images' 之后的部分
const imagePath = unixStylePath.split('/images')[1];
    res.status(200).json({
      code: 1,
      data:{
        url:'/images'+imagePath,
      },
      message: '上传成功'
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      error: '上传发生错误'
    });
  }
};



module.exports = {
  uploadImage,
};