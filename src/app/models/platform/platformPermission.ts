import { DataTypes, Model, Sequelize } from 'sequelize';
import timestamps from './timestamps';
import modelConfig from './modelConfig';

interface PermissionAttributes {
  id: string;
  
  pid: number;
  creatorId: number;
  
  name: string;
  icon?: string;
  orderNum?: number;
  hide: number; 
  status: number;
  path?: string;
  component?: string; 
  access: string; // 新增权限标识字段
  type: number;  // 0-目录 1-菜单 2-按钮
}

export default (sequelize: Sequelize) => {
  class Permission extends Model<PermissionAttributes> implements PermissionAttributes {
    public id!: string;
    public pid!: number;
    public creatorId!: number;
    public name!: string;
    public hide!: number;
    public status!: number;
    public type!: number;
    public access!: string;
    static associate(models: any) {
      // 关联关系定义
    }
  }

  Permission.init({
    id: { type: DataTypes.INTEGER,  primaryKey: true, autoIncrement: true, },
    pid: { type: DataTypes.INTEGER, allowNull: false, comment: '一级菜单为0,父id' },
    access: { 
      type: DataTypes.STRING(100), 
      comment: '权限标识 (如: system:user:list)' 
    },
    creatorId: { type: DataTypes.INTEGER, allowNull: false, comment: '创建人' },
    name: { type: DataTypes.STRING, allowNull: false, comment: '菜单名' },
    icon: { type: DataTypes.STRING, comment: '图标' },
    type: { type: DataTypes.INTEGER, comment: '是否为目录, 0- 目录， 1-菜单  2 -按钮' },
    orderNum: { type: DataTypes.INTEGER, comment: '排序' },
    hide: { type: DataTypes.INTEGER, allowNull: false, comment: '是否显示 1-影藏 0-显示' },
    status: { type: DataTypes.INTEGER, allowNull: false, comment: '是否禁用 0-禁用, 1-启用' },
    path:{ type: DataTypes.STRING, allowNull: false, comment: '浏览器路径' },
    component: { type: DataTypes.STRING, comment: '代码组件路径' },
    ...timestamps
  }, {
    sequelize,
    ...modelConfig,
    tableName: 'platform_permission',
    comment: '菜单表'
  });

  return Permission;
};