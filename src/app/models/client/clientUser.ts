import { DataTypes, Model, Sequelize } from 'sequelize';
import timestamps from '../platform/timestamps';
import modelConfig from '../platform/modelConfig';

interface ClientUserAttributes {
  userId: number;
  username: string;
  password: string;
  salt: string;
  status: number;
  deleted: number;
}

export default (sequelize: Sequelize) => {
  class ClientUser extends Model<ClientUserAttributes> implements ClientUserAttributes {
    public userId!: number;
    public username!: string;
    public password!: string;
    public salt!: string;
    public status!: number;
    public deleted!: number;
  }

  ClientUser.init({
    userId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    username: { type: DataTypes.STRING, allowNull: false, unique: true },
    password: { type: DataTypes.STRING, allowNull: false },
    salt: { type: DataTypes.STRING, allowNull: false },
    status: { type: DataTypes.INTEGER, defaultValue: 1 },
    deleted: { type: DataTypes.INTEGER, defaultValue: 0 },
    ...timestamps
  }, {
    sequelize,
    ...modelConfig,
    tableName: 'client_user',
    comment: '客户端用户表'
  });

  return ClientUser;
};