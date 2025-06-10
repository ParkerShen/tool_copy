import { DataTypes, Model, Sequelize } from 'sequelize';
import timestamps from './timestamps';
import modelConfig from './modelConfig';

interface UserRoleAttributes {
  id: number;
  userId: number;
  roleId: number;
}

export default (sequelize: Sequelize) => {
  class UserRole extends Model<UserRoleAttributes> implements UserRoleAttributes {
    public id!: number;
    public userId!: number;
    public roleId!: number;
    
    static associate(models: any) {
      // 关联关系定义
    }
  }

  UserRole.init({
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      comment: '主键'
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: '关联user表外键'
    },
    roleId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: '关联role表外键'
    },
    ...timestamps
  }, {
    sequelize,
    ...modelConfig,
    tableName: 'user_role'
  });

  return UserRole;
};