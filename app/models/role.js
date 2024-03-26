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
    label: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: '国际化名称',
    },
    status: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: '状态',
    },
    order: {
      type: DataTypes.INTEGER,
      comment: '排序',
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