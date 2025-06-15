import { DataTypes, Model, Sequelize } from 'sequelize';
import timestamps from './timestamps';
import modelConfig from './modelConfig';

interface BlackTokenAttributes {
  token: string;
}

export default (sequelize: Sequelize) => {
  class BlackToken extends Model<BlackTokenAttributes> implements BlackTokenAttributes {
    public token!: string;
    
    static associate(models: any) {
      // 关联关系定义
    }
  }

  BlackToken.init({
    token: { type: DataTypes.TEXT, allowNull: false, unique: true },
    ...timestamps
  }, {
    sequelize,
    ...modelConfig,
    tableName: 'platform_black_token',
    comment: '黑名单令牌'
  });

  return BlackToken;
};