/*
 * @Author: parker 960822987@qq.com
 * @Date: 2025-06-09 14:58:18
 * @LastEditors: parker 960822987@qq.com
 * @LastEditTime: 2025-06-29 17:42:00
 * @FilePath: \serveradmin\src\app\config\db.config.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
const port = Number.parseInt(process.env.DB_PORT || "3306", 10);

if (Number.isNaN(port)) {
  throw new Error(`DB_PORT must be a number, received: ${process.env.DB_PORT}`);
}

export default {
  HOST: process.env.DB_HOST || "127.0.0.1",
  USER: process.env.DB_USER || "xin",
  PASSWORD: process.env.DB_PASSWORD || "123456",
  DB: process.env.DB_NAME || "xin",
  port,
  dialect: "mysql" as const,
  timezone: '+08:00',
  pool: {
    max: process.env.NODE_ENV === 'production' ? 10 : 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
};
