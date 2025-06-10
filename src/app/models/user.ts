import { DataTypes, Model, Sequelize } from 'sequelize';
import timestamps from './timestamps';
import modelConfig from './modelConfig';

interface UserAttributes {
  id: number;
  userId: number;
  status: number;
  username: string;
  password: string;
  salt: string;
  email?: string;
  phone?: string;
  avatar?: string;
  isAdmin: number;
  truename?: string;
  loginip?: string;
  logins?: number;
  logintime?: Date;
}

export default (sequelize: Sequelize) => {
  class User extends Model<UserAttributes> implements UserAttributes {
    public id!: number;
    public userId!: number;
    public status!: number;
    public username!: string;
    public password!: string;
    public salt!: string;
    public isAdmin!: number;

    static associate(models: any) {
      User.belongsToMany(models.Role, { through: models.UserRole, foreignKey: 'userId' });
    }
  }

  User.init({
    id: { type: DataTypes.INTEGER, allowNull: false },
    userId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    status: { type: DataTypes.INTEGER, comment: '账号状态，1 启用 0 禁用' },
    username: { type: DataTypes.STRING, allowNull: false },
    password: { type: DataTypes.STRING, allowNull: false },
    salt: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING },
    phone: { type: DataTypes.STRING },
    avatar: { type: DataTypes.STRING, comment: '头像' },
    isAdmin: { type: DataTypes.TINYINT },
    truename: { type: DataTypes.STRING },
    loginip: { type: DataTypes.STRING },
    logins: { type: DataTypes.INTEGER, comment: '登录次数' },
    logintime: { type: DataTypes.DATE, allowNull: true, comment: '最新登录时间' },
    ...timestamps
  }, {
    sequelize,
    ...modelConfig
  });

  return User;
};