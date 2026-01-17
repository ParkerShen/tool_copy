/*
 * @Date: 2025-07-21 20:57:24
 * @LastEditors: parker 960822987@qq.com
 * @LastEditTime: 2025-07-23 13:57:08
 * @FilePath: \serveradmin\src\app\models\mini\index.ts
 */

import { Sequelize } from 'sequelize';
import dbConfig from '../../config/db.config';
import MiniBookkeepingCategoryModel from './miniBookkeepingCategory';
import MiniBookkeepingRecordModel from './miniBookkeepingRecord';
import MiniBookkeepingSystemCategoryModel from './miniBookkeepingSystemCategory';
import MiniBookkeepingIconModel from './miniBookkeepingIcon'

const sequelize = new Sequelize(dbConfig.DB, dbConfig.USER, dbConfig.PASSWORD, {
  host: dbConfig.HOST,
  dialect: dbConfig.dialect,
  logging: false,
  sync: false as any,
  define: {
    freezeTableName: true,
    timestamps: true,
    underscored: true,
    paranoid: true
  },
  pool: dbConfig.pool,
  timezone: '+08:00'
});

const miniBookkeepingCategory = MiniBookkeepingCategoryModel(sequelize);
const miniBookkeepingRecord = MiniBookkeepingRecordModel(sequelize);
const miniBookkeepingSystemCategory = MiniBookkeepingSystemCategoryModel(sequelize);
const miniBookkeepingIcon = MiniBookkeepingIconModel(sequelize);

const models = {
  miniBookkeepingCategory,
  miniBookkeepingRecord,
  miniBookkeepingSystemCategory,
  miniBookkeepingIcon
};

Object.values(models).forEach(model => {
  if (typeof model.associate === 'function') {
    model.associate(models);
  }
});

const db = {
  Sequelize,
  sequelize,
  ...models
};

export default db;