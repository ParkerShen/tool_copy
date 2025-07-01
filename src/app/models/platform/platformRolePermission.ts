import { DataTypes, Model, Sequelize } from 'sequelize';
import timestamps from './timestamps';
import modelConfig from './modelConfig';

interface RolePermissionAttributes {
  id?: string;
  roleId: number;
  permissionId: number;
  deleted?:number;
  dTime?:Date | null;
}

export default (sequelize: Sequelize) => {
  class RolePermission extends Model<RolePermissionAttributes> implements RolePermissionAttributes {
    public id!: string;
    public roleId!: number;
    public permissionId!: number;
    public deleted!:number;
    public dTime!:Date | null;
    static associate(models: any) {
      // 关联关系定义
      RolePermission.belongsTo(models.Role, { foreignKey: 'roleId' });
      RolePermission.belongsTo(models.Permission, { 
        foreignKey: 'permissionId',
        as: 'permission' // 确保有别名
      });
    }
  }

  RolePermission.init({
    id: { type: DataTypes.STRING, allowNull: true,autoIncrement: true, comment: '主键' },
    roleId: { type: DataTypes.INTEGER, allowNull: false, comment: '角色ID', primaryKey: true },
    permissionId: { type: DataTypes.INTEGER, allowNull: false, comment: '菜单id', },
    ...timestamps
  }, {
    sequelize,
    ...modelConfig,
    tableName: 'platform_role_permission',
    comment: '角色权限中间表',
  });

  return RolePermission;
};