const {
  DataTypes
} = require('sequelize');
const timestamps = require('./timestamps');
const modelConfig = require('./modelConfig');
module.exports = (sequelize) => {
  const Permission = sequelize.define('Permission', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      comment: '权限ID',
    },
    pid: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: '一级菜单为0,父id',
    },
    creatorId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: '创建人',
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: '权限名称',
    },
    description: {
      type: DataTypes.STRING,
      comment: '权限描述',
    },
    // 其他字段...
    ...timestamps,
  }, modelConfig);


  return Permission;
};