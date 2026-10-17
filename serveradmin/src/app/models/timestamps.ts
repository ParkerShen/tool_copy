/*
 * @Date: 2025-06-29 15:59:39
 * @LastEditors: parker 960822987@qq.com
 * @LastEditTime: 2025-07-21 22:21:33
 * @FilePath: \serveradmin\src\app\models\timestamps.ts
 */
import { DataTypes } from 'sequelize';

export default {
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  deletedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
};