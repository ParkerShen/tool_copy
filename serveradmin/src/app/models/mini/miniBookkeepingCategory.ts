/*
 * @Author: parker 960822987@qq.com
 * @Date: 2025-06-09 14:58:18
 * @LastEditors: parker 960822987@qq.com
 * @LastEditTime: 2025-07-21 21:26:01
 * @FilePath: \serveradmin\src\app\models\mini\miniBookkeepingCategory.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { DataTypes, Model, Sequelize } from 'sequelize';
import timestamps from '../timestamps';
import modelConfig from '../modelConfig';

interface BookkeepingCategoryAttributes {
    id:number;
    name:string;
    type:string;
    icon:string;
    color:string;
    sortOrder:number;
    isSystem:boolean;
    userId:number;
}

export default (sequelize: Sequelize) => {
  class miniBookkeepingCategory extends Model<BookkeepingCategoryAttributes> implements BookkeepingCategoryAttributes {
  
    public id!: number;
    public name!: string;
    public type!: string;
    public icon!: string;
    public color!: string;
    public sortOrder!: number;
    public isSystem!: boolean;
    public userId!: number;

    static associate(models: any) {
        
    }
  }

  miniBookkeepingCategory.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
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
        comment: '图标'
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
      isSystem: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'is_system',
        comment: '是否系统分类'
      },
      userId: {
        type: DataTypes.UUID,
        field: 'user_id',
        comment: '用户ID'
      },
    ...timestamps
  }, {
    sequelize,
    ...modelConfig,
    tableName: 'mini_bookkeeping_category',
    comment: '微信记账分类表'
  });

  return miniBookkeepingCategory;
};