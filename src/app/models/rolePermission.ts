import { DataTypes, Model, Sequelize } from 'sequelize';
import timestamps from './timestamps';
import modelConfig from './modelConfig';

interface RolePermissionAttributes {
  id: string;
  roleId: number;
  permissionId: number;
}

export default (sequelize: Sequelize) => {
  class RolePermission extends Model<RolePermissionAttributes> implements RolePermissionAttributes {
    public id!: string;
    public roleId!: number;
    public permissionId!: number;
    
    static associate(models: any) {
      // 关联关系定义
    }
  }

  RolePermission.init({
    id: { type: DataTypes.STRING, allowNull: false, comment: '主键' },
    roleId: { type: DataTypes.INTEGER, allowNull: false, comment: '关联Role表外键', primaryKey: true },
    permissionId: { type: DataTypes.INTEGER, allowNull: false, comment: '关联permission表外键' },
    ...timestamps
  }, {
    sequelize,
    ...modelConfig,
    tableName: 'role_permission'
  });

  return RolePermission;
};