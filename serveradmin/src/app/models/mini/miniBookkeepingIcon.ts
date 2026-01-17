/*
 * @Date: 2025-07-23 13:43:43
 * @LastEditors: parker 960822987@qq.com
 * @LastEditTime: 2025-07-23 13:56:50
 * @FilePath: \serveradmin\src\app\models\mini\miniBookkeepingIcon.ts
 */
import { DataTypes, Model, Sequelize } from 'sequelize';
import timestamps from '../timestamps';
import modelConfig from '../modelConfig';

interface IconAttributes {
  id: number;
  name: string;
  icon: string;
  type: string;
  category: string;
}

export default (sequelize: Sequelize) => {
  class miniBookkeepingIcon extends Model<IconAttributes> implements IconAttributes {
    public id!: number;
    public name!: string;
    public icon!: string;
    public type!: string;
    public category!: string;
    static associate(models: any) {
      // 关联关系
    }
  }

  miniBookkeepingIcon.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: '图标名称'
    },
    icon: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: '图标标识'
    },
    type: {
      type: DataTypes.ENUM('income', 'expense', 'common'),
      allowNull: false,
      comment: '适用类型'
    },
    category: {
      type: DataTypes.STRING(50),
      comment: '图标分类'
    },
    ...timestamps
  }, {
    sequelize,
    ...modelConfig,
    tableName: 'mini_bookkeeping_icon',
    comment: '记账分类图标库表'
  });

  return miniBookkeepingIcon;
};