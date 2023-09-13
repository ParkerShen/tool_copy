const {
  Sequelize
} = require('sequelize');
const dbConfig = require('../config/db.config');
const UserModel = require('./user'); // 修改为正确的路径和文件名
const RoleModel = require('./role');
const BlackTokenModel = require('./blackToken');
const UserContactInfoModel = require('./usercontactinfo');
const sequelize = new Sequelize(dbConfig.DB, dbConfig.USER, dbConfig.PASSWORD, {
  host: dbConfig.HOST,
  dialect: dbConfig.dialect,
  logging: false,
  sync: false, // 禁用模型自动同步

  pool: {
    max: dbConfig.pool.max,
    min: dbConfig.pool.min,
    acquire: dbConfig.pool.acquire,
    idle: dbConfig.pool.idle
  },
  // define: {
  //   freezeTableName: true // 全局定义  表名===模型名称
  // },
  // define 配置项用于定义模型的行为
  define: {
    underscored: true, // 启用下划线命名法
  },
  timezone: '+08:00' //东八时区

});
const User = UserModel(sequelize);
const Usercontactinfo = UserContactInfoModel(sequelize);
const Role = RoleModel(sequelize);
const BlackToken = BlackTokenModel(sequelize);
// 设置 User 与 UserContactInfo 的关联
User.hasOne(Usercontactinfo, {
  foreignKey: 'uid',
  as: 'userC',
  onDelete: 'CASCADE'
});
Usercontactinfo.belongsTo(User, {
  foreignKey: 'uid',
  as: 'userC'
});

// 建立 User 与 Role 的关联关系
User.belongsTo(Role, {
  foreignKey: 'roleId',
  as: 'userRole',
  onDelete: 'SET NULL', // 设置为 SET NULL，如果删除了角色，则将 roleId 置为 NULL
});

const db = {
  Sequelize,
  sequelize,
  User,
  Role,
  Usercontactinfo,
  BlackToken
};
module.exports = db;