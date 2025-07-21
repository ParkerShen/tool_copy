import { Sequelize } from 'sequelize';
import dbConfig from '../../config/db.config';
import ClientUserModel from './clientUser';

const sequelize = new Sequelize(dbConfig.DB, dbConfig.USER, dbConfig.PASSWORD, {
  host: dbConfig.HOST,
  dialect: dbConfig.dialect,
  logging: false,
  sync: false,
  define: { underscored: true },
  pool: dbConfig.pool,
  timezone: '+08:00'
});

const User = ClientUserModel(sequelize);

const models = {
  User
};

const clientDb = {
  Sequelize,
  sequelize,
  ...models
};

export default clientDb;