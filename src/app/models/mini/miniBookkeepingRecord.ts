/*
 * @Author: parker 960822987@qq.com
 * @Date: 2025-06-09 14:58:18
 * @LastEditors: parker 960822987@qq.com
 * @LastEditTime: 2025-07-24 20:21:56
 * @FilePath: \serveradmin\src\app\models\mini\miniBookkeepingRecord.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { DataTypes, Model, Sequelize } from 'sequelize';
import timestamps from '../timestamps';
import modelConfig from '../modelConfig';

interface BookkeepingCategoryAttributes {
  id?: number;
  userId: number;
  categoryId: number;
  type: string;
  amount: number;
  title: string;
  remark: string;
  recordDate: Date;
  recordTime: Date;
}

export default (sequelize: Sequelize) => {
  class miniBookkeepingRecord extends Model<BookkeepingCategoryAttributes> implements BookkeepingCategoryAttributes {

    public id!: number;
    public userId!: number;
    public categoryId!: number;
    public type!: string;
    public amount!: number;
    public title!: string;
    public remark!: string;
    public recordDate!: Date;
    public recordTime!: Date;


    static associate(models: any) {
      // 关联关系
      miniBookkeepingRecord.belongsTo(models.miniBookkeepingCategory, {
        foreignKey: 'categoryId',
        as: 'category'
      });

      // 添加与系统分类表的关联
      miniBookkeepingRecord.belongsTo(models.miniBookkeepingSystemCategory, {
        foreignKey: 'categoryId',
        as: 'systemCategory'
      });
    }
  }

  miniBookkeepingRecord.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
      comment: '用户ID'
    },
    categoryId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'category_id',
      comment: '分类ID'
    },
    type: {
      type: DataTypes.ENUM('income', 'expense'),
      allowNull: false,
      comment: '收入/支出'
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: '金额'
    },
    title: {
      type: DataTypes.STRING(100),
      comment: '标题'
    },
    remark: {
      type: DataTypes.TEXT,
      comment: '备注'
    },
    recordDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'record_date',
      comment: '记录日期'
    },
    recordTime: {
      type: DataTypes.TIME,
      field: 'record_time',
      comment: '记录时间'
    },
    ...timestamps
  }, {
    sequelize,
    ...modelConfig,
    tableName: 'mini_bookkeeping_record',
    comment: '微信记账记录表'
  });



  return miniBookkeepingRecord;
};
