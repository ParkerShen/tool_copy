import { DataTypes, Model, Sequelize } from 'sequelize';
import timestamps from './timestamps';
import modelConfig from './modelConfig';

interface UsercontactinfoAttributes {
  id: number;
  uid: number;
  ins?: string;
  fb?: string;
  weibo?: string;
  zhihu?: string;
}

export default (sequelize: Sequelize) => {
  class Usercontactinfo extends Model<UsercontactinfoAttributes> implements UsercontactinfoAttributes {
    public id!: number;
    public uid!: number;
    
    static associate(models: any) {
      Usercontactinfo.belongsTo(models.User, { foreignKey: 'uid' });
    }
  }

  Usercontactinfo.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    uid: { type: DataTypes.INTEGER },
    ins: { type: DataTypes.STRING, allowNull: true },
    fb: { type: DataTypes.STRING, allowNull: true },
    weibo: { type: DataTypes.STRING, allowNull: true },
    zhihu: { type: DataTypes.STRING, allowNull: true },
    ...timestamps
  }, {
    sequelize,
    ...modelConfig,
    tableName: 'platform_user_contact_info',
    comment: '用户联系详细信息表'
  });

  return Usercontactinfo;
};