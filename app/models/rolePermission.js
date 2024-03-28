const {
  DataTypes
} = require('sequelize');
const timestamps = require('./timestamps');
const modelConfig = require('./modelConfig');
module.exports = (sequelize) => {
  const RolePermission = sequelize.define('RolePermission', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      comment: '主键',
    },
    roleId: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: '关联Role表外键',
      // primaryKey: true,
    },
    permissionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: '关联permisson表外键',
      // primaryKey: true,
    },
    // 其他字段...
    ...timestamps,
  }, {
    ...modelConfig, // 启用软删除
    tableName: 'role_permission'
  });

  return RolePermission;
};