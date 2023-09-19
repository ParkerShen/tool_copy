const {
  DataTypes
} = require('sequelize');
const timestamps = require('./timestamps');
const modelConfig = require('./modelConfig');
module.exports = (sequelize) => {
  const Role = sequelize.define('Role', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      comment: '角色ID',
    },
    creatorId: {
      type: DataTypes.INTEGER,
      comment: '创建人id',
    },
    roleMenuId: {
      type: DataTypes.STRING,
      comment: '菜单列表id',
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: '角色名称',
    },
    description: {
      type: DataTypes.STRING,
      comment: '角色描述',
    },
    // 其他字段...
    ...timestamps,
  }, modelConfig);


  return Role;
};