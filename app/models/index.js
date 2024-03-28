const {
  Sequelize
} = require('sequelize');
const dbConfig = require('../config/db.config');
const UserModel = require('./user'); // 修改为正确的路径和文件名
const RoleModel = require('./role');
const PermissionModel = require('./permission');
const RolePermissionModel = require('./rolePermission');
const BlackTokenModel = require('./blackToken');
const UserRoleModel = require('./userRole');
const UserContactInfoModel = require('./usercontactinfo');
const sequelize = new Sequelize(dbConfig.DB, dbConfig.USER, dbConfig.PASSWORD, {
  host: dbConfig.HOST,
  dialect: dbConfig.dialect,
  logging: false,
  sync: false, // 禁用模型自动同步
  define: {
    underscored: true, // 启用下划线命名法
  },
  freezeTableName: true,
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

  timezone: '+08:00' //东八时区

});

const User = UserModel(sequelize);
const UserRole = UserRoleModel(sequelize);
const Usercontactinfo = UserContactInfoModel(sequelize);
const Role = RoleModel(sequelize);
const BlackToken = BlackTokenModel(sequelize);
const Permission = PermissionModel(sequelize);
const RolePermission = RolePermissionModel(sequelize);



// 定义用户-角色关联模型

User.belongsToMany(Role, { through: UserRole,foreignKey:'userId' });
Role.belongsToMany(User, { through: UserRole,foreignKey:'roleId' });

// 定义角色-权限关联模型

Role.belongsToMany(Permission, { through: RolePermission,foreignKey:'roleId' });
Permission.belongsToMany(Role, { through: RolePermission,foreignKey:'permissionId' });

const db = {
  Sequelize,
  sequelize,
  User,
  Role,
  Usercontactinfo,
  BlackToken,
  Permission,
  RolePermission,
  UserRole
};
module.exports = db;