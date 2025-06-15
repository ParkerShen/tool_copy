import { DataTypes, Model, Sequelize } from 'sequelize';
import timestamps from './timestamps';
import modelConfig from './modelConfig';

interface PermissionAttributes {
  id: string;
  permissionId: number;
  pid: number;
  creatorId: number;
  label?: string;
  name: string;
  icon?: string;
  orderNum?: number;
  hide: number;
  status: number;
  router?: string;
  component?: string;
  description?: string;
  keepalive: boolean; // 是否缓存
  perms: string; // 新增权限标识字段
  type: number;  // 0-目录 1-菜单 2-按钮
}

export default (sequelize: Sequelize) => {
  class Permission extends Model<PermissionAttributes> implements PermissionAttributes {
    public id!: string;
    public permissionId!: number;
    public pid!: number;
    public creatorId!: number;
    public name!: string;
    public hide!: number;
    public status!: number;
    public type!: number;
    public perms!: string;
    keepalive!: boolean; // 是否缓存
    static associate(models: any) {
      // 关联关系定义
    }
  }

  Permission.init({
    id: { type: DataTypes.STRING, comment: 'id' },
    permissionId: { type: DataTypes.INTEGER, primaryKey: true, comment: '权限id' },
    pid: { type: DataTypes.INTEGER, allowNull: false, comment: '一级菜单为0,父id' },
    perms: { 
      type: DataTypes.STRING(100), 
      comment: '权限标识 (如: system:user:list)' 
    },
    creatorId: { type: DataTypes.INTEGER, allowNull: false, comment: '创建人' },
    label: { type: DataTypes.STRING, comment: '国际化名' },
    name: { type: DataTypes.STRING, allowNull: false, comment: '菜单名' },
    icon: { type: DataTypes.STRING, comment: '图标' },
    type: { type: DataTypes.INTEGER, comment: '是否为目录, 0- 目录， 1-菜单  2 -按钮' },
    orderNum: { type: DataTypes.INTEGER, comment: '排序' },
    hide: { type: DataTypes.INTEGER, allowNull: false, comment: '是否显示 1- 显示 0-隐藏' },
    status: { type: DataTypes.INTEGER, allowNull: false, comment: '是否禁用 0-禁用, 1-启用' },
    router: { type: DataTypes.STRING, comment: '路由' },
    component: { type: DataTypes.STRING, comment: '组件路径' },
    description: { type: DataTypes.STRING, comment: '权限描述' },
    keepalive: { 
      type: DataTypes.BOOLEAN, 
      defaultValue: false,
      comment: '是否缓存' 
    },
    ...timestamps
  }, {
    sequelize,
    ...modelConfig,
    tableName: 'platform_permission',
    comment: '菜单表'
  });

  return Permission;
};