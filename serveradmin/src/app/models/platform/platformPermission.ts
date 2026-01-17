/*
 * @Date: 2025-06-29 15:59:39
 * @LastEditors: parker 960822987@qq.com
 * @LastEditTime: 2025-07-02 20:40:45
 * @FilePath: \serveradmin\src\app\models\platform\platformPermission.ts
 */
import { DataTypes, Model, Sequelize } from 'sequelize';
import timestamps from '../timestamps';
import modelConfig from '../modelConfig';

interface PermissionAttributes {
  id?: string;
  permissionId?: number;
  pid: number;
  creatorId: number;
  title: string;
  name: string;
  icon?: string;
  orderNum?: number;
  hide: number; 
  status: number;
  path?: string;
  component?: string; 
  access: string; // 新增权限标识字段
  type: number;  // 0-目录 1-菜单 2-按钮
  cTime?:Date;
  dTime?:Date;
  description?: string;
}

export default (sequelize: Sequelize) => {
  class Permission extends Model<PermissionAttributes> implements PermissionAttributes {
    public id!: string;
    public permissionId!: number;
    public title!: string;
    public pid!: number;
    public creatorId!: number;
    public name!: string;
    public hide!: number;
    public orderNum!: number;
    public status!: number;
    public type!: number;
    public access!: string;
    public cTime!:Date;
    public dTime!:Date;
    static associate(models: any) {
      // 添加与 RolePermission 的关联
      Permission.hasMany(models.RolePermission, {
        foreignKey: 'permissionId',
        as: 'rolePermissions'
      });
      
      // 添加与 Role 的多对多关联
      Permission.belongsToMany(models.Role, {
        through: models.RolePermission,
        foreignKey: 'permissionId', // 指向 Permission 的主键 id
        otherKey: 'roleId'           // 指向 Role 的外键
      });
    }
  }

  Permission.init({
    id: { type: DataTypes.STRING,  primaryKey: false, allowNull: false },
    permissionId: { type: DataTypes.INTEGER,  primaryKey: true, autoIncrement: true,allowNull: false, },
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
    title: { type: DataTypes.STRING, comment: '权限标题' },
    ...timestamps
  }, {
    sequelize,
    ...modelConfig,
    tableName: 'platform_permission',
    comment: '菜单表'
  });

  return Permission;
};