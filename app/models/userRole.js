const {
  DataTypes
} = require('sequelize');
const timestamps = require('./timestamps');
const modelConfig = require('./modelConfig');
module.exports = (sequelize) => {
  const UserRole = sequelize.define('UserRole', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      comment: '主键',
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: '关联user表外键',
      // primaryKey: true,
    },
    roleId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: '关联role表外键',
    },
    // 其他字段...
    ...timestamps
  }, {
    ...modelConfig, // 启用软删除
    tableName: 'user_role'
  });

  return UserRole;
};