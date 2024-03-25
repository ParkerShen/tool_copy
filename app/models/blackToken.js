const {
  DataTypes
} = require('sequelize');
const timestamps = require('./timestamps');
const modelConfig = require('./modelConfig');
module.exports = (sequelize) => {
  const BlackToken = sequelize.define('BlackToken', {
    token: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: true,
    },
    ...timestamps
  }, {
    ...modelConfig, // 启用软删除
    tableName: 'black_token'
  });
  return BlackToken;
};