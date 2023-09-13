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