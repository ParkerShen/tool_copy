import { Sequelize, Model, DataTypes } from 'sequelize';
import dbConfig from '../config/db.config';
import UserModel from './user';
import RoleModel from './role';
import PermissionModel from './permission';
import RolePermissionModel from './rolePermission';
import BlackTokenModel from './blackToken';
import UserRoleModel from './userRole';
import UserContactInfoModel from './usercontactinfo';

const sequelize = new Sequelize(dbConfig.DB, dbConfig.USER, dbConfig.PASSWORD, {
  host: dbConfig.HOST,
  dialect: dbConfig.dialect,
  logging: false,
  sync: false as any,
  define: { underscored: true },
  
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

User.belongsToMany(Role, { through: UserRole, foreignKey: 'userId' });
Role.belongsToMany(User, { through: UserRole, foreignKey: 'roleId' });

Role.belongsToMany(Permission, { through: RolePermission, foreignKey: 'roleId' });
Permission.belongsToMany(Role, { through: RolePermission, foreignKey: 'permissionId' });

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

export default db;