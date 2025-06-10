export default {
  HOST: "localhost",
  USER: "xin",
  PASSWORD: "123456",
  DB: "xin",
  port: 3306,
  dialect: "mysql" as const,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
};