const {
  User,
  Usercontactinfo
} = require('../../models');

// 获取所有用户
const getUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      where: {
        deleted: 0,
      },
      attributes: ['id', 'username', 'password', 'email', 'phone'],
      include: {
        model: Usercontactinfo,
        as: 'userC',
        attributes: ['fb', 'weibo', 'zhihu']
      }
    });

    res.status(200).json(users);
  } catch (error) {
    console.error('Error retrieving users with contact info:', error);
    res.status(500).json({
      error: '获取用户及联系信息时发生错误'
    });
  }
};

module.exports = {
  getUsers
};