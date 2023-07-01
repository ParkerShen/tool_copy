const {
  DataTypes
} = require('sequelize');

const timestamps = {
  cTime: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false
  },
  uTime: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false
  },
  dTime: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  deleted: {
    type: DataTypes.INTEGER,
    allowNull: false,
    required: true,
    defaultValue: 0,
  },

};

module.exports = timestamps;