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