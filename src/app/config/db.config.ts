/*
 * @Author: parker 960822987@qq.com
 * @Date: 2025-06-09 14:58:18
 * @LastEditors: parker 960822987@qq.com
 * @LastEditTime: 2025-06-29 17:42:00
 * @FilePath: \serveradmin\src\app\config\db.config.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
export default {
  HOST: "localhost",
  USER: "xin",
  PASSWORD: "123456",
  DB: "xin",
  port: 3306,
  dialect: "mysql" as const,
  timezone: '+08:00',
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
};