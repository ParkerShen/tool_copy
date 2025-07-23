import { Request, Response } from 'express';
import db from '../../models/mini';
import { Op, fn, col } from 'sequelize';
import dayjs from 'dayjs';

class BookkeepingController {
  // 1. 获取月度统计数据
  async getMonthlyStats(req:Request, res:Response) {
    try {
      const { month } = req.query; // 格式: 2025-07
      const userId = '1';
      
      // 使用 dayjs 计算准确的月份范围
      const startDate = dayjs(`${month}-01`).format('YYYY-MM-DD');
      const endDate = dayjs(`${month}-01`).endOf('month').format('YYYY-MM-DD');
      
      const stats = await db.miniBookkeepingRecord.findAll({
        where: {
          userId,
          recordDate: {
            [Op.between]: [startDate, endDate]
          }
        },
        attributes: [
          'type',
          [fn('SUM', col('amount')), 'total']
        ],
        group: ['type'],
        raw: true
      });
      
      const result = {
        income: stats.find(s => s.type === 'income')?.total || 0,
        expense: stats.find(s => s.type === 'expense')?.total || 0
      };
      
      res.json({ code: 200, data: result });
    } catch (error) {
      console.error('getMonthlyStats error:', error);
      res.status(500).json({ code: 500, message: error.message });
    }
  } 

  // 2. 获取每日记录列表（按日期分组）
  async getDailyRecords(req:Request, res:Response) {
    try {
      const { month } = req.query;
      const userId = '1';
      
      const records = await db.miniBookkeepingRecord.findAll({
        where: {
          userId,
          recordDate: {
            [Op.between]: [`${month}-01`, `${month}-31`]
          }
        },
        include: [{
          model: db.miniBookkeepingCategory,
          as: 'category',
          attributes: ['name', 'icon', 'color']
        }],
        order: [['recordDate', 'DESC'], ['createdAt', 'DESC']]
      });
      
      // 按日期分组
      const groupedRecords = records.reduce((acc, record) => {
        const date = record.recordDate;
        if (!acc[date]) {
          acc[date] = {
            date,
            records: [],
            dayIncome: 0,
            dayExpense: 0
          };
        }
        acc[date].records.push(record);
        if (record.type === 'income') {
          acc[date].dayIncome += parseFloat(record.amount);
        } else {
          acc[date].dayExpense += parseFloat(record.amount);
        }
        return acc;
      }, {});
      
      res.json({ code: 200, data: Object.values(groupedRecords) });
    } catch (error) {
      res.status(500).json({ code: 500, message: error.message });
    }
  }

  // 3. 获取月度图表数据（每日统计）
  async getMonthlyChartData(req:Request, res:Response) {
    try {
      const { month, type = 'expense' } = req.query;
      const userId = '1';
      
      const dailyStats = await db.miniBookkeepingRecord.findAll({
        where: {
          userId,
          type,
          recordDate: {
            [Op.between]: [`${month}-01`, `${month}-31`]
          }
        },
        attributes: [
          [fn('DAY', col('record_date')), 'day'],
          [fn('SUM', col('amount')), 'amount']
        ],
        group: [fn('DAY', col('record_date'))],
        order: [[fn('DAY', col('record_date')), 'ASC']],
        raw: true
      });
      
      // 生成完整月份数据（补充0值）
      const daysInMonth = dayjs(`${month}-01`).daysInMonth();
      const chartData = Array.from({ length: daysInMonth }, (_, i) => {
        const day = i + 1;
        const stat = dailyStats.find(s => s.day === day);
        return stat ? parseFloat(stat.amount) : 0;
      });
      
      res.json({ code: 200, data: chartData });
    } catch (error) {
      res.status(500).json({ code: 500, message: error.message });
    }
  }

  // 4. 创建记账记录
  async createRecord(req:Request, res:Response) {
    try {
      const { categoryId, type, amount, title, remark, recordDate, recordTime } = req.body;
      const userId = '1';
      
      const record = await db.miniBookkeepingRecord.create({
        userId,
        categoryId,
        type,
        amount,
        title,
        remark,
        recordDate,
        recordTime: recordTime || dayjs().format('HH:mm:ss')
      });
      
      res.json({ code: 200, data: record });
    } catch (error) {
      res.status(500).json({ code: 500, message: error.message });
    }
  }

  // 5. 更新记账记录
  async updateRecord(req:Request, res:Response) {
    try {
      const { id } = req.params;
      const userId = '1';
      const updateData = req.body;
      
      const [updatedRows] = await db.miniBookkeepingRecord.update(updateData, {
        where: { id, userId }
      });
      
      if (updatedRows === 0) {
        return res.status(404).json({ code: 404, message: '记录不存在' });
      }
      
      res.json({ code: 200, message: '更新成功' });
    } catch (error) {
      res.status(500).json({ code: 500, message: error.message });
    }
  }

  // 6. 删除记账记录
  async deleteRecord(req:Request, res:Response) {
    try {
      const { id } = req.params;
      const userId = '1';
      
      const deletedRows = await db.miniBookkeepingRecord.destroy({
        where: { id, userId }
      });
      
      if (deletedRows === 0) {
        return res.status(404).json({ code: 404, message: '记录不存在' });
      }
      
      res.json({ code: 200, message: '删除成功' });
    } catch (error) {
      res.status(500).json({ code: 500, message: error.message });
    }
  }

  // 7. 获取用户所有分类（系统分类 + 自定义分类）
  async getCategories(req: Request, res: Response) {
    try {
      const { type } = req.query;
      const userId = '1';
      
      // 获取系统分类
      const systemWhere: any = {};
      if (type) systemWhere.type = type;
      
      const systemCategories = await db.miniBookkeepingSystemCategory.findAll({
        where: systemWhere,
        order: [['sortOrder', 'ASC']]
      });
      
      // 获取用户自定义分类
      const userWhere: any = { userId, isSystem: false };
      if (type) userWhere.type = type;
      
      const userCategories = await db.miniBookkeepingCategory.findAll({
        where: userWhere,
        order: [['sortOrder', 'ASC']]
      });
      
      // 合并数据，标记来源
      const allCategories = [
        ...systemCategories.map(item => ({
          ...item.toJSON(),
          isSystem: true,
          source: 'system'
        })),
        ...userCategories.map(item => ({
          ...item.toJSON(),
          source: 'custom'
        }))
      ];
      
      res.json({ code: 200, data: allCategories });
    } catch (error) {
      res.status(500).json({ code: 500, message: error.message });
    }
  }

  // 8. 获取可用图标列表
  async getAvailableIcons(req: Request, res: Response) {
    try {
      const { type } = req.query;
      
      const where: any = {};
      if (type) {
        where.type = { [Op.in]: [type, 'common'] };
      }
      
      const icons = await db.miniBookkeepingIcon.findAll({
        where,
        order: [['category', 'ASC'], ['sortOrder', 'ASC']]
      });
      
      // 按分类分组
      const groupedIcons = icons.reduce((acc, icon) => {
        if (!acc[icon.category]) {
          acc[icon.category] = [];
        }
        acc[icon.category].push(icon);
        return acc;
      }, {});
      
      res.json({ code: 200, data: groupedIcons });
    } catch (error) {
      res.status(500).json({ code: 500, message: error.message });
    }
  }

  // 9. 创建自定义分类
  async createCategory(req: Request, res: Response) {
    try {
      const { name, type, icon, color } = req.body;
      const userId = '1';
      
      // 验证图标是否存在
      const iconExists = await db.miniBookkeepingIcon.findOne({
        where: { icon, type: { [Op.in]: [type, 'common'] } }
      });
      
      if (!iconExists) {
        return res.status(400).json({ code: 400, message: '图标不存在' });
      }
      
      const category = await db.miniBookkeepingCategory.create({
        name,
        type,
        icon,
        color: color || '#409eff',
        userId,
        isSystem: false,
        sortOrder: 999 // 自定义分类排在后面
      });
      
      res.json({ code: 200, data: category });
    } catch (error) {
      res.status(500).json({ code: 500, message: error.message });
    }
  }

  // 10. 更新自定义分类
  async updateCategory(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, icon, color, sortOrder } = req.body;
      const userId = '1';
      
      // 只能更新自己的自定义分类
      const [updatedRows] = await db.miniBookkeepingCategory.update({
        name,
        icon,
        color,
        sortOrder
      }, {
        where: { id, userId, isSystem: false }
      });
      
      if (updatedRows === 0) {
        return res.status(404).json({ code: 404, message: '分类不存在或无权限' });
      }
      
      res.json({ code: 200, message: '更新成功' });
    } catch (error) {
      res.status(500).json({ code: 500, message: error.message });
    }
  }

  // 11. 删除自定义分类
  async deleteCategory(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = '1';
      
      // 检查是否有记录使用此分类
      const recordCount = await db.miniBookkeepingRecord.count({
        where: { categoryId: id }
      });
      
      if (recordCount > 0) {
        return res.status(400).json({ code: 400, message: '该分类下有记录，无法删除' });
      }
      
      const deletedRows = await db.miniBookkeepingCategory.destroy({
        where: { id, userId, isSystem: false }
      });
      
      if (deletedRows === 0) {
        return res.status(404).json({ code: 404, message: '分类不存在或无权限' });
      }
      
      res.json({ code: 200, message: '删除成功' });
    } catch (error) {
      res.status(500).json({ code: 500, message: error.message });
    }
  }

  // 12. 初始化新用户默认分类（注册时调用）
  async initUserDefaultCategories(req: Request, res: Response) {
    try {
      const userId = '1';
      
      // 获取默认系统分类，为用户创建对应的自定义分类
      const defaultCategories = await db.miniBookkeepingSystemCategory.findAll({
        where: { isDefault: true }
      });
      
      const userCategories = defaultCategories.map(category => ({
        name: category.name,
        type: category.type,
        icon: category.icon,
        color: category.color,
        sortOrder: category.sortOrder,
        userId,
        isSystem: false // 用户表中都是自定义分类
      }));
      
      await db.miniBookkeepingCategory.bulkCreate(userCategories);
      
      res.json({ code: 200, message: '初始化成功' });
    } catch (error) {
      res.status(500).json({ code: 500, message: error.message });
    }
  }
}

module.exports = new BookkeepingController();
