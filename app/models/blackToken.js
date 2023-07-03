const {
  DataTypes
} = require('sequelize');
const timestamps = require('./timestamps');
const modelConfig = require('./modelConfig');
module.exports = (sequelize) => {
  const BlackToken = sequelize.define('BlackToken', {
    token: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    ...timestamps
  }, modelConfig);

  return BlackToken;
};