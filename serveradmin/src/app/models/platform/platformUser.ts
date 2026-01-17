/*
 * @Author: parker 960822987@qq.com
 * @Date: 2025-06-09 14:58:18
 * @LastEditors: parker 960822987@qq.com
 * @LastEditTime: 2025-06-29 16:23:37
 * @FilePath: \serveradmin\src\app\models\platform\platformUser.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { DataTypes, Model, Sequelize } from 'sequelize';
import timestamps from '../timestamps';
import modelConfig from '../modelConfig';

interface UserAttributes {
 
  userId: number;
  departmentId: number;
  status: number;
  username: string;
  password: string;
  salt: string;
  email?: string;
  phone?: string;
  avatar?: string;
  isAdmin: number;
  name?: string;
  nickName?: string;
  loginip?: string;
  loginCount?: number;
  lastLoginAt?: Date;
  Roles?: number[];
}

export default (sequelize: Sequelize) => {
  class User extends Model<UserAttributes> implements UserAttributes {
  
    public userId!: number;
    public status!: number;
    public username!: string;
    public password!: string;
    public salt!: string;
    public isAdmin!: number;
    public departmentId!: number;
    public avatar?: string;
    public Roles?: number[];

    static associate(models: any) {
      User.belongsToMany(models.Role, { through: models.UserRole, foreignKey: 'userId' });
    }
  }

  User.init({
   
    userId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, comment: '主键/用户id' },
    departmentId: { type: DataTypes.INTEGER, allowNull: true, comment: '部门id' },
    status: { type: DataTypes.INTEGER, comment: '账号状态，1 启用 0 禁用' },
    username: { type: DataTypes.STRING, allowNull: false },
    password: { type: DataTypes.STRING, allowNull: false },
    salt: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING },
    phone: { type: DataTypes.STRING },
    avatar: { type: DataTypes.STRING, comment: '头像' },
    isAdmin: { type: DataTypes.TINYINT },
    name: { type: DataTypes.STRING, comment: '正式姓名' },
    nickName: { type: DataTypes.STRING, comment: '正式姓名' },
    loginip: { type: DataTypes.STRING, comment: '登录ip' },
    loginCount: { type: DataTypes.INTEGER, comment: '登录次数',defaultValue: 0 },
    lastLoginAt: { type: DataTypes.DATE, allowNull: true, comment: '最新登录时间' },
    ...timestamps
  }, {
    sequelize,
    ...modelConfig,
    tableName: 'platform_user',
    comment: '用户表'
  });

  return User;
};