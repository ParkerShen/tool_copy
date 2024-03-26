const {
  DataTypes
} = require('sequelize');
const timestamps = require('./timestamps');
const modelConfig = require('./modelConfig');
module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    roleId: {
      type: DataTypes.INTEGER,
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    salt: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
    },
    phone: {
      type: DataTypes.STRING,
    },
    avatar: {
      type: DataTypes.STRING,
      Comment:'头像'
    },
    isAdmin: {
      type: DataTypes.TINYINT,
    },
    truename: {
      type: DataTypes.STRING,
    },
    loginip: {
      type: DataTypes.STRING,
    },
    logins: {
      type: DataTypes.INTEGER,
      Comment: '登录次数'
    },
    logintime: {
      type: DataTypes.DATE,
      allowNull: true,
      Comment: '最新登录时间'
    },
    ...timestamps
  }, modelConfig);


  return User;
};