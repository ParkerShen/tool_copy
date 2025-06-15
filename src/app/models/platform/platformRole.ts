import { DataTypes, Model, Sequelize } from 'sequelize';
import timestamps from './timestamps';
import modelConfig from './modelConfig';

interface RoleAttributes {
  id: string;
  roleId: number;
  creatorId?: number;
  name: string;
  label: string;
  status: number;
  order?: number;
  description?: string;
}

export default (sequelize: Sequelize) => {
  class Role extends Model<RoleAttributes> implements RoleAttributes {
    public id!: string;
    public roleId!: number;
    public name!: string;
    public label!: string;
    public status!: number;
    
    static associate(models: any) {
      Role.belongsToMany(models.User, { through: models.UserRole, foreignKey: 'roleId' });
      Role.belongsToMany(models.Permission, { through: models.RolePermission, foreignKey: 'roleId' });
    }
  }

  Role.init({
    id: { type: DataTypes.STRING, allowNull: false, comment: 'id' },
    roleId: { type: DataTypes.INTEGER, primaryKey: true, comment: '角色ID' },
    creatorId: { type: DataTypes.INTEGER, comment: '创建人id' },
    name: { type: DataTypes.STRING, allowNull: false, comment: '角色名称' },
    label: { type: DataTypes.STRING, allowNull: false, comment: '国际化名称' },
    status: { type: DataTypes.INTEGER, allowNull: false, comment: '状态' },
    order: { type: DataTypes.INTEGER, comment: '排序' },
    description: { type: DataTypes.STRING, comment: '角色描述' },
    ...timestamps
  }, {
    sequelize,
    ...modelConfig,
    tableName: 'platform_role',
    comment: '角色表',
    indexes: [
      { unique: true, fields: ['name'] } // 角色名唯一索引
    ]
  });

  return Role;
};