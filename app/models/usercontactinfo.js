const {
  DataTypes
} = require('sequelize');
const timestamps = require('./timestamps');
const modelConfig = require('./modelConfig');
module.exports = (sequelize) => {
  const Usercontactinfo = sequelize.define('Usercontactinfo', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    uid: {
      type: DataTypes.INTEGER,
      //  primaryKey: true,
      //  autoIncrement: true,
    },
    ins: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    fb: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    weibo: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    zhihu: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    ...timestamps
  }, modelConfig);

  return Usercontactinfo;
};