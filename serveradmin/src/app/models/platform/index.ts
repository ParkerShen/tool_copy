/*
 * @Date: 2025-07-18 18:56:54
 * @LastEditors: parker 960822987@qq.com
 * @LastEditTime: 2025-07-21 21:59:18
 * @FilePath: \serveradmin\src\app\models\platform\index.ts
 */
/*
 * @Date: 2025-06-29 15:59:39
 * @LastEditors: parker 960822987@qq.com
 * @LastEditTime: 2025-06-30 23:34:24
 * @FilePath: \serveradmin\src\app\models\platform\index.ts
 */
import { Sequelize, Model, DataTypes } from 'sequelize';
import dbConfig from '../../config/db.config';
import UserModel from './platformUser';
import RoleModel from './platformRole';
import PermissionModel from './platformPermission';
import RolePermissionModel from './platformRolePermission';
import BlackTokenModel from './platformBlackToken';
import UserRoleModel from './platformUserRole';
import UserContactInfoModel from './platformUserContactInfo';

const sequelize = new Sequelize(dbConfig.DB, dbConfig.USER, dbConfig.PASSWORD, {
  host: dbConfig.HOST,
  dialect: dbConfig.dialect,
  logging: false,
  sync: false as any,
  define: {
    freezeTableName: true,
    timestamps: true,
    underscored: true,
    paranoid: true
  },
  pool: dbConfig.pool,
  timezone: '+08:00'
});

const User = UserModel(sequelize);
const UserRole = UserRoleModel(sequelize);
const Usercontactinfo = UserContactInfoModel(sequelize);
const Role = RoleModel(sequelize);
const BlackToken = BlackTokenModel(sequelize);
const Permission = PermissionModel(sequelize);
const RolePermission = RolePermissionModel(sequelize);

const models = {
  User,
  Role,
  Permission,
  RolePermission,
  UserRole,
  Usercontactinfo,
  BlackToken
};

User.belongsToMany(Role, { through: UserRole, foreignKey: 'userId' });
Role.belongsToMany(User, { through: UserRole, foreignKey: 'roleId' });

Object.values(models).forEach(model => {
  if (typeof model.associate === 'function') {
    model.associate(models);
  }
});

const db = {
  Sequelize,
  sequelize,
  ...models
};

export default db;