/*
 * @Date: 2025-07-23 13:42:45
 * @LastEditors: parker 960822987@qq.com
 * @LastEditTime: 2025-07-24 15:47:05
 * @FilePath: \serveradmin\src\app\models\mini\miniBookkeepingSystemCategory.ts
 */
import { DataTypes, Model, Sequelize } from 'sequelize';
import timestamps from '../timestamps';
import modelConfig from '../modelConfig';

interface SystemCategoryAttributes {
  id: string;
  name: string;
  type: string;
  icon: string;
  color: string;
  sortOrder: number;
  isDefault: boolean; // 是否为新用户默认添加
}

export default (sequelize: Sequelize) => {
  class miniBookkeepingSystemCategory extends Model<SystemCategoryAttributes> implements SystemCategoryAttributes {
    public id!: string;
    public name!: string;
    public type!: string;
    public icon!: string;
    public color!: string;
    public sortOrder!: number;
    public isDefault!: boolean;

    static associate(models: any) {
      // 无需关联，系统分类独立存在
    }
  }

  miniBookkeepingSystemCategory.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: '分类名称'
    },
    type: {
      type: DataTypes.ENUM('income', 'expense'),
      allowNull: false,
      comment: '收入/支出'
    },
    icon: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: '图标标识'
    },
    color: {
      type: DataTypes.STRING(20),
      defaultValue: '#409eff',
      comment: '颜色'
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'sort_order',
      comment: '排序'
    },
    isDefault: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_default',
      comment: '是否为新用户默认分类'
    },
    ...timestamps
  }, {
    sequelize,
    ...modelConfig,
    tableName: 'mini_bookkeeping_system_category',
    comment: '系统记账自带分类表'
  });

  return miniBookkeepingSystemCategory;
};