#!/usr/bin/env node
/**
 * 在 Node 中直接测试 src/api/bookkeeping/sql.ts 的 SQLite 逻辑。
 * 使用 esbuild 把纯 TS 层打包成临时 ESM，再用真实的 sql.js 运行。
 *
 * 用法：node scripts/test-local-data.mjs
 */
import { mkdir, writeFile } from "node:fs/promises"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { build } from "esbuild"
import initSqlJs from "sql.js"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const cacheDir = resolve(root, "node_modules/.cache/local-data-test")
const bundlePath = resolve(cacheDir, "sql.mjs")

let passed = 0
let failed = 0
const failures = []

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}：期望 ${JSON.stringify(expected)}，实际 ${JSON.stringify(actual)}`)
  }
}

function assertThrows(fn, expectedText, message) {
  try {
    fn()
  } catch (error) {
    const text = error instanceof Error ? error.message : String(error)
    if (expectedText) {
      assert(
        text.includes(expectedText),
        `${message}：错误信息应包含 "${expectedText}"，实际 "${text}"`,
      )
    }
    return
  }
  throw new Error(`${message}：期望抛出错误，但没有`)
}

async function test(name, fn) {
  try {
    await fn()
    passed += 1
    console.log(`  ✓ ${name}`)
  } catch (error) {
    failed += 1
    failures.push({ name, error })
    console.error(`  ✗ ${name}`)
    console.error(`    ${error instanceof Error ? error.message : error}`)
  }
}

async function loadSqlModule() {
  await mkdir(cacheDir, { recursive: true })
  await build({
    entryPoints: [resolve(root, "src/api/bookkeeping/sql.ts")],
    outfile: bundlePath,
    bundle: true,
    format: "esm",
    platform: "node",
    target: "node18",
    logLevel: "silent",
  })
  return import(`${pathToFileURL(bundlePath).href}?t=${Date.now()}`)
}

function countRecords(db) {
  const result = db.exec("SELECT COUNT(*) AS total FROM mini_bookkeeping_record")
  return Number(result[0].values[0][0])
}

async function main() {
  console.log("准备 SQLite 测试环境...")
  const SQL = await initSqlJs({
    locateFile: (file) => join(root, "node_modules/sql.js/dist", file),
  })
  const sql = await loadSqlModule()

  const newDb = () => {
    const db = new SQL.Database()
    sql.initSchema(db)
    sql.seedDefaults(db)
    return db
  }

  const db = newDb()

  await test("建表与默认分类", () => {
    const categories = sql.listCategories(db)
    assertEqual(categories.length, 9, "默认分类总数")
    assertEqual(categories.filter((c) => c.type === "expense").length, 6, "支出分类数")
    assertEqual(categories.filter((c) => c.type === "income").length, 3, "收入分类数")
    assert(
      categories.every((c) => c.isSystem && c.source === "system"),
      "默认分类应标记为系统分类",
    )
    assert(
      categories.every((c) => c.icon && c.color),
      "默认分类应包含图标和颜色",
    )
  })

  await test("重复播种不会产生重复分类", () => {
    sql.seedDefaults(db)
    assertEqual(sql.listCategories(db).length, 9, "重复播种后的分类数")
  })

  const food = sql.listCategories(db, "expense").find((c) => c.name === "餐饮")
  const salary = sql.listCategories(db, "income").find((c) => c.name === "工资")
  assert(food && salary, "缺少默认分类")

  let lunch
  let snack
  let wage

  await test("创建记录并返回分类信息", () => {
    lunch = sql.createRecord(db, {
      categoryId: food.id,
      type: "expense",
      amount: 12.34,
      recordDate: "2026-10-05",
      recordTime: "12:30:00",
      remark: "午饭",
    })
    snack = sql.createRecord(db, {
      categoryId: food.id,
      type: "expense",
      amount: 0.3,
      recordDate: "2026-10-17",
    })
    wage = sql.createRecord(db, {
      categoryId: salary.id,
      type: "income",
      amount: 100,
      recordDate: "2026-10-17",
    })

    assertEqual(lunch.amount, "12.34", "金额应格式化为两位小数")
    assertEqual(lunch.category.name, "餐饮", "记录应带分类名称")
    assertEqual(lunch.systemCategory.icon, food.icon, "systemCategory 应与 category 一致")
    assertEqual(snack.title, "餐饮", "未传 title 时应使用分类名")
  })

  await test("月度统计", () => {
    const stats = sql.getMonthlyStats(db, "2026-10")
    assertEqual(stats.expense, 12.64, "月度支出")
    assertEqual(stats.income, 100, "月度收入")
    assertEqual(sql.getMonthlyStats(db, "2026-09").expense, 0, "其他月份支出")
  })

  await test("每日分组与当日汇总", () => {
    const groups = sql.getDailyRecords(db, "2026-10")
    assertEqual(groups.length, 2, "日期分组数")
    assertEqual(groups[0].date, "2026-10-17", "应按日期倒序")
    assertEqual(groups[0].records.length, 2, "17 日记录数")
    assertEqual(groups[0].dayIncome, 100, "17 日收入")
    assertEqual(groups[0].dayExpense, 0.3, "17 日支出（浮点精度）")
    assertEqual(groups[1].dayExpense, 12.34, "5 日支出")
  })

  await test("月度图表数组", () => {
    const expense = sql.getMonthlyChartData(db, "2026-10", "expense")
    assertEqual(expense.length, 31, "10 月天数")
    assertEqual(expense[4], 12.34, "5 号支出")
    assertEqual(expense[16], 0.3, "17 号支出")
    assertEqual(expense[0], 0, "无记录日期为 0")

    const income = sql.getMonthlyChartData(db, "2026-10", "income")
    assertEqual(income[16], 100, "17 号收入")
  })

  await test("更新记录", () => {
    const updated = sql.updateRecord(db, snack.id, {
      amount: 2.5,
      remark: "改了备注",
      categoryId: salary.id,
    })
    assertEqual(updated.amount, "2.50", "更新后金额")
    assertEqual(updated.remark, "改了备注", "更新后备注")
    assertEqual(updated.category.name, "工资", "更换分类")
    assertEqual(updated.title, "工资", "更换分类后标题同步")
    assertEqual(updated.type, "income", "更换分类后收支类型跟随分类")

    const stats = sql.getMonthlyStats(db, "2026-10")
    assertEqual(stats.expense, 12.34, "更新后的月度支出")
    assertEqual(stats.income, 102.5, "更新后的月度收入")
  })

  await test("删除记录", () => {
    sql.deleteRecord(db, wage.id)
    assertEqual(sql.getMonthlyStats(db, "2026-10").income, 2.5, "删除后的收入")
    assertThrows(() => sql.deleteRecord(db, wage.id), "记录不存在", "重复删除")
  })

  let custom
  await test("新增 / 删除自定义分类", () => {
    custom = sql.createCategory(db, {
      name: "宠物",
      type: "expense",
      icon: "heart",
      color: "#123456",
    })
    assertEqual(custom.isSystem, false, "自定义分类标记")
    assertEqual(sql.listCategories(db, "expense").length, 7, "自定义分类数量")

    assertThrows(
      () => sql.createCategory(db, { name: "宠物", type: "expense" }),
      "已存在",
      "重复分类",
    )

    const petRecord = sql.createRecord(db, {
      categoryId: custom.id,
      type: "expense",
      amount: 5,
      recordDate: "2026-10-06",
    })
    assertEqual(petRecord.category.name, "宠物", "自定义分类记录")

    assertThrows(() => sql.deleteCategory(db, custom.id), "有记录", "分类被引用时删除")

    sql.deleteRecord(db, petRecord.id)
    sql.deleteCategory(db, custom.id)
    assertEqual(sql.listCategories(db, "expense").length, 6, "删除后的分类数量")
  })

  await test("系统分类不可删除", () => {
    assertThrows(() => sql.deleteCategory(db, food.id), "系统分类", "删除系统分类")
  })

  await test("JSON 备份 / 清空 / 恢复", () => {
    const before = sql.getStats(db)
    const backup = sql.exportJson(db)
    assertEqual(backup.app, "local-bookkeeping", "备份标识")
    assertEqual(backup.records.length, before.recordCount, "备份记录数")

    sql.clearAll(db)
    assertEqual(sql.getStats(db).recordCount, 0, "清空后的记录数")
    assertEqual(sql.listCategories(db).length, 9, "清空后保留默认分类")

    sql.importJson(db, backup)
    const after = sql.getStats(db)
    assertEqual(after.recordCount, before.recordCount, "恢复后的记录数")
    assertEqual(after.totalExpense, before.totalExpense, "恢复后的累计支出")
  })

  await test("非法 JSON 导入会回滚", () => {
    const before = sql.getStats(db)
    const invalid = {
      app: "local-bookkeeping",
      schemaVersion: 1,
      categories: [{ id: "c1", name: "临时", type: "expense" }],
      records: [
        { id: "r1", categoryId: "missing", type: "expense", amount: 1, recordDate: "2026-10-01" },
      ],
    }
    assertThrows(() => sql.importJson(db, invalid), "不存在的分类", "引用不存在分类")
    assertEqual(sql.getStats(db).recordCount, before.recordCount, "失败后记录数不变")
    assertEqual(sql.getStats(db).categoryCount, before.categoryCount, "失败后分类数不变")
  })

  await test("清空后可以继续记账", () => {
    sql.clearAll(db)
    const record = sql.createRecord(db, {
      categoryId: food.id,
      type: "expense",
      amount: 1,
      recordDate: "2026-10-17",
    })
    assertEqual(countRecords(db), 1, "重新记账后的记录数")
    sql.deleteRecord(db, record.id)
  })

  await test("金额精度 / 表达式 / 格式化", () => {
    assertEqual(sql.decimalToCents("12.34"), 1234, "字符串金额转分")
    assertEqual(sql.decimalToCents(-5.01), -501, "负数额度转分")
    assertEqual(sql.evaluateAmountExpression("0.1+0.2"), 30, "0.1 + 0.2")
    assertEqual(sql.evaluateAmountExpression("5-3"), 200, "减法")
    assertEqual(sql.evaluateAmountExpression("-5+3"), -200, "负数开头")
    assertEqual(sql.parseUserAmountToCents("12.30"), 1230, "用户输入金额")
    assertThrows(() => sql.parseUserAmountToCents("1.005"), "两位小数", "超过两位小数")
    assertThrows(() => sql.parseUserAmountToCents("0"), "大于 0", "金额为 0")
    assertThrows(() => sql.evaluateAmountExpression("1/0"), "算式", "不支持的运算")
    assertThrows(() => sql.evaluateAmountExpression("1++2"), "算式", "连续运算符")
    assertEqual(sql.formatCents(1234567), "12,345.67", "千分位格式")
    assertEqual(sql.formatRecordAmount(1234, "expense"), "-12.34", "支出显示负号")
    assertEqual(sql.formatRecordAmount(1000, "income"), "+10.00", "收入显示正号")
    assertEqual(sql.formatRecordAmount(-501, "expense"), "+5.01", "历史负支出显示为正")
  })

  let bank
  let bankIncome

  await test("账户与余额", () => {
    const defaultBalance = sql.getAccountBalances(db)[0]
    assertEqual(defaultBalance.id, sql.DEFAULT_ACCOUNT_ID, "默认账户")
    assertEqual(defaultBalance.name, "现金", "默认账户名称")
    assertEqual(defaultBalance.balanceCents, 0, "默认账户余额")

    bank = sql.createAccount(db, {
      name: "招商银行",
      type: "debit",
      icon: "wallet",
      color: "#4ECDC4",
      initialBalanceCents: 100000,
    })
    assertEqual(bank.initialBalanceCents, 100000, "期初余额")

    bankIncome = sql.createRecord(db, {
      categoryId: salary.id,
      type: "income",
      amount: 50,
      accountId: bank.id,
      recordDate: "2026-10-20",
    })
    const bankExpense = sql.createRecord(db, {
      categoryId: food.id,
      type: "expense",
      amount: 12.34,
      accountId: bank.id,
      recordDate: "2026-10-21",
    })

    assertEqual(bankIncome.accountId, bank.id, "记录关联账户")
    assertEqual(bankIncome.amountCents, 5000, "记录金额分")
    assertEqual(bankIncome.account.name, "招商银行", "记录返回账户名称")

    const balances = sql.getAccountBalances(db)
    const bankBalance = balances.find((item) => item.id === bank.id)
    assertEqual(bankBalance.balanceCents, 103766, "账户余额 = 期初 + 收入 − 支出")
    assertEqual(bankBalance.recordCount, 2, "账户记录数")

    const stats = sql.getAccountStats(db, bank.id, {
      start: "2026-10-01",
      end: "2026-10-31",
    })
    assertEqual(stats.incomeCents, 5000, "账户区间收入")
    assertEqual(stats.expenseCents, 1234, "账户区间支出")
    assertEqual(stats.balanceCents, 103766, "账户当前余额")

    // 归档后不出现在选择器，但历史记录仍可查询
    sql.archiveAccount(db, bank.id)
    assertEqual(
      sql.listAccounts(db, false).some((item) => item.id === bank.id),
      false,
      "归档账户隐藏",
    )
    assertEqual(
      sql.listAccounts(db, true).some((item) => item.id === bank.id),
      true,
      "可查询归档账户",
    )
    assertThrows(
      () =>
        sql.createRecord(db, {
          categoryId: food.id,
          amount: 1,
          accountId: bank.id,
          recordDate: "2026-10-22",
        }),
      "已归档",
      "归档账户不能新增记录",
    )
    sql.archiveAccount(db, bank.id, false)

    // 编辑金额与账户后余额随之变化
    sql.updateRecord(db, bankExpense.id, { amount: "20.00" })
    assertEqual(
      sql.getAccountBalances(db).find((item) => item.id === bank.id).balanceCents,
      103000,
      "编辑金额后余额",
    )
    sql.updateRecord(db, bankExpense.id, { accountId: sql.DEFAULT_ACCOUNT_ID })
    assertEqual(
      sql.getAccountBalances(db).find((item) => item.id === bank.id).balanceCents,
      105000,
      "换账户后原账户余额",
    )
    assertEqual(
      sql.getAccountBalances(db).find((item) => item.id === sql.DEFAULT_ACCOUNT_ID).balanceCents,
      -2000,
      "换账户后目标账户余额",
    )

    // 删除保护
    assertThrows(() => sql.deleteAccount(db, sql.DEFAULT_ACCOUNT_ID), "默认账户", "默认账户不可删")
    assertThrows(() => sql.deleteAccount(db, bank.id), "有记录", "有记录的账户不可删")
  })

  await test("区间 / 分类 / 按日统计", () => {
    const range = { start: "2026-10-20", end: "2026-10-21" }
    const stats = sql.getRangeStats(db, range)
    assertEqual(stats.incomeCents, 5000, "区间收入")
    assertEqual(stats.expenseCents, 2000, "区间支出")
    assertEqual(stats.netCents, 3000, "区间结余")
    assertEqual(stats.recordCount, 2, "区间记录数")

    const onlySecondDay = sql.getRangeStats(db, { start: "2026-10-21", end: "2026-10-21" })
    assertEqual(onlySecondDay.incomeCents, 0, "范围首尾均包含（无收入）")
    assertEqual(onlySecondDay.expenseCents, 2000, "范围首尾均包含（支出）")

    const expenseCategories = sql.getCategoryStats(db, "expense", {
      start: "2026-10-01",
      end: "2026-10-31",
    })
    assertEqual(expenseCategories.length, 1, "支出分类数")
    assertEqual(expenseCategories[0].categoryId, food.id, "支出分类")
    assertEqual(expenseCategories[0].totalCents, 2000, "分类金额")
    assertEqual(expenseCategories[0].count, 1, "分类笔数")
    assertEqual(expenseCategories[0].percent, 100, "分类占比")

    const incomeCategories = sql.getCategoryStats(db, "income", {
      start: "2026-10-01",
      end: "2026-10-31",
    })
    assertEqual(incomeCategories[0].categoryId, salary.id, "收入分类")
    assertEqual(incomeCategories[0].totalCents, 5000, "收入分类金额")

    const daily = sql.getDailyStats(db, {
      start: "2026-10-01",
      end: "2026-10-31",
      type: "expense",
    })
    assertEqual(daily.length, 1, "有数据的天数")
    assertEqual(daily[0].date, "2026-10-21", "按日日期")
    assertEqual(daily[0].amountCents, 2000, "按日金额")

    assertThrows(
      () => sql.getRangeStats(db, { start: "2026-10-31", end: "2026-10-01" }),
      "开始日期",
      "非法日期范围",
    )
  })

  await test("记录筛选", () => {
    const all = sql.listRecordGroups(db, { start: "2026-10-01", end: "2026-10-31" })
    assertEqual(all.length, 2, "全部记录按日分组")

    const bankOnly = sql.listRecordGroups(db, {
      start: "2026-10-01",
      end: "2026-10-31",
      accountId: bank.id,
    })
    assertEqual(bankOnly.length, 1, "按账户筛选分组")
    assertEqual(bankOnly[0].records.length, 1, "按账户筛选记录数")
    assertEqual(bankOnly[0].dayIncomeCents, 5000, "分组收入分")

    const expenses = sql.listRecordGroups(db, {
      start: "2026-10-01",
      end: "2026-10-31",
      type: "expense",
    })
    assertEqual(expenses[0].dayExpenseCents, 2000, "按类型筛选")

    const byCategory = sql.listRecordGroups(db, {
      start: "2026-10-01",
      end: "2026-10-31",
      categoryId: salary.id,
    })
    assertEqual(byCategory.length, 1, "按分类筛选")
  })

  await test("分类编辑与使用次数", () => {
    const pet = sql.createCategory(db, { name: "宠物", type: "expense" })
    const petRecord = sql.createRecord(db, {
      categoryId: pet.id,
      amount: "5.00",
      recordDate: "2026-10-22",
    })
    const usage = sql.getCategoryUsage(db, "expense")
    assertEqual(usage[pet.id], 1, "分类使用次数")

    const renamed = sql.updateCategory(db, pet.id, {
      name: "毛孩子",
      icon: "heart",
      color: "#123456",
    })
    assertEqual(renamed.name, "毛孩子", "重命名分类")
    assertEqual(renamed.icon, "heart", "更新图标")
    assertEqual(sql.getRecord(db, petRecord.id).title, "毛孩子", "默认标题跟随分类名")

    assertThrows(() => sql.updateCategory(db, pet.id, { name: "餐饮" }), "已存在", "分类重名")
    assertThrows(
      () => sql.updateCategory(db, pet.id, { name: "超过四个字" }),
      "不超过 4 个字",
      "分类名超长",
    )

    sql.deleteRecord(db, petRecord.id)
    sql.deleteCategory(db, pet.id)
  })

  await test("JSON 备份包含账户、金额分、图片与标签", () => {
    const backup = sql.exportJson(db)
    assertEqual(backup.schemaVersion, 3, "备份版本")
    assert(Array.isArray(backup.accounts), "备份应包含 accounts")
    assert(
      backup.accounts.some((account) => account.id === bank.id),
      "备份应包含自定义账户",
    )
    const bankRecord = backup.records.find((record) => record.accountId === bank.id)
    assertEqual(bankRecord.amountCents, 5000, "备份记录包含金额分")

    sql.clearAll(db)
    assertEqual(sql.getAccountBalances(db, true).length, 1, "清空后只保留默认账户")
    sql.importJson(db, backup)

    const restoredBank = sql.getAccountBalances(db, true).find((item) => item.id === bank.id)
    assertEqual(restoredBank.balanceCents, 105000, "恢复后的账户余额")
    assertEqual(countRecords(db), 2, "恢复后的记录数")
    assertEqual(sql.getAccountBalances(db, true).length, 2, "恢复后的账户数")
  })

  await test("图片与标签保存 / 查询 / 备份恢复", () => {
    const tagDb = newDb()
    const tagFood = sql.listCategories(tagDb, "expense")[0]
    const imageA = "data:image/jpeg;base64,AAAA"
    const imageB = "data:image/jpeg;base64,BBBB"

    const record = sql.createRecord(tagDb, {
      categoryId: tagFood.id,
      amount: 8.88,
      recordDate: "2026-10-23",
      images: [imageA, imageB],
      tags: ["周末", "#聚餐", "周末"],
    })
    assertEqual(record.images.length, 2, "保存的图片数量")
    assertEqual(record.images[1], imageB, "图片内容")
    assertEqual(record.tags.length, 2, "标签去重")
    assertEqual(record.tags[0], "周末", "标签名称")
    assertEqual(record.tags[1], "聚餐", "标签去掉 # 前缀")

    const usages = sql.listTags(tagDb)
    assertEqual(usages.length, 2, "标签种类数")
    assertEqual(usages.find((item) => item.name === "周末")?.count, 1, "标签使用次数")
    assertEqual(usages.find((item) => item.name === "聚餐")?.count, 1, "标签使用次数（去 #）")

    assertThrows(
      () =>
        sql.createRecord(tagDb, {
          categoryId: tagFood.id,
          amount: 1,
          recordDate: "2026-10-23",
          images: ["not-an-image"],
        }),
      "图片格式",
      "非法图片",
    )
    assertThrows(
      () =>
        sql.createRecord(tagDb, {
          categoryId: tagFood.id,
          amount: 1,
          recordDate: "2026-10-23",
          tags: ["1", "2", "3", "4", "5", "6"],
        }),
      "最多 5",
      "标签数量超限",
    )

    const updated = sql.updateRecord(tagDb, record.id, {
      images: [imageA],
      tags: ["新标签"],
    })
    assertEqual(updated.images.length, 1, "更新后的图片数量")
    assertEqual(updated.tags.join(","), "新标签", "更新后的标签")

    const backup = sql.exportJson(tagDb)
    const backedRecord = backup.records.find((item) => item.id === record.id)
    assertEqual(backedRecord.images.length, 1, "备份中的图片")
    assertEqual(backedRecord.tags[0], "新标签", "备份中的标签")

    sql.clearAll(tagDb)
    assertEqual(sql.listTags(tagDb).length, 0, "清空后的标签数")
    sql.importJson(tagDb, backup)

    const restored = sql.getRecord(tagDb, record.id)
    assertEqual(restored.images.length, 1, "恢复后的图片数量")
    assertEqual(restored.images[0], imageA, "恢复后的图片内容")
    assertEqual(restored.tags.join(","), "新标签", "恢复后的标签")
    assertEqual(sql.listTags(tagDb)[0].name, "新标签", "恢复后的标签统计")
    tagDb.close()
  })

  await test("v1 旧数据库迁移", () => {
    const oldDb = new SQL.Database()
    oldDb.run(`
      CREATE TABLE mini_bookkeeping_category (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('income','expense')),
        icon TEXT,
        color TEXT DEFAULT '#409eff',
        sort_order INTEGER DEFAULT 0,
        is_system INTEGER DEFAULT 0,
        user_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE mini_bookkeeping_record (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL DEFAULT '1',
        category_id TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('income','expense')),
        amount REAL NOT NULL,
        title TEXT,
        remark TEXT,
        record_date TEXT NOT NULL,
        record_time TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      PRAGMA user_version = 1;
    `)
    oldDb.run(
      `INSERT INTO mini_bookkeeping_category
        (id, name, type, icon, color, sort_order, is_system, user_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, NULL, ?, ?)`,
      [
        food.id,
        food.name,
        food.type,
        food.icon,
        food.color,
        food.sortOrder,
        "2025-01-01 00:00:00",
        "2025-01-01 00:00:00",
      ],
    )
    const insertRecord = oldDb.prepare(
      `INSERT INTO mini_bookkeeping_record
        (id, user_id, category_id, type, amount, title, remark, record_date, record_time, created_at, updated_at)
       VALUES (?, '1', ?, 'expense', ?, ?, '', ?, '10:00:00', ?, ?)`,
    )
    const stamp = "2025-01-05 10:00:00"
    insertRecord.run(["old-1", food.id, 12.34, "餐饮", "2026-01-05", stamp, stamp])
    insertRecord.run(["old-2", food.id, -5.01, "退款", "2026-01-06", stamp, stamp])
    insertRecord.free()

    const beforeColumns = sql.__internal.tableColumns(oldDb, "mini_bookkeeping_record")
    assertEqual(beforeColumns.has("amount_cents"), false, "旧库没有 amount_cents")

    sql.initSchema(oldDb)
    sql.seedDefaults(oldDb)

    const afterColumns = sql.__internal.tableColumns(oldDb, "mini_bookkeeping_record")
    assert(afterColumns.has("amount_cents"), "迁移后新增 amount_cents")
    assert(afterColumns.has("account_id"), "迁移后新增 account_id")
    assert(afterColumns.has("images"), "迁移后新增 images")
    assert(afterColumns.has("tags"), "迁移后新增 tags")
    assertEqual(sql.__internal.getUserVersion(oldDb), 3, "迁移后的 schema 版本")

    const oldRecord = sql.getRecord(oldDb, "old-1")
    assertEqual(oldRecord.amountCents, 1234, "旧记录金额回填为分")
    assertEqual(oldRecord.accountId, sql.DEFAULT_ACCOUNT_ID, "旧记录关联默认账户")
    assertEqual(oldRecord.images.length, 0, "旧记录图片为空数组")
    assertEqual(oldRecord.tags.length, 0, "旧记录标签为空数组")
    assertEqual(sql.getRecord(oldDb, "old-2").amountCents, -501, "历史负金额保留")
    assertEqual(sql.getRecord(oldDb, "old-2").amount, "-5.01", "历史负金额显示")

    assertEqual(sql.listAccounts(oldDb, true).length, 1, "迁移后默认账户")
    assertEqual(
      sql.getRangeStats(oldDb, { start: "2026-01-01", end: "2026-12-31" }).expenseCents,
      733,
      "迁移后统计（含负数冲减）",
    )
    assertEqual(sql.getMonthlyStats(oldDb, "2026-01").expense, 7.33, "迁移后月度统计")

    // 幂等：再次初始化不应改变数据
    sql.initSchema(oldDb)
    sql.seedDefaults(oldDb)
    assertEqual(sql.getRecord(oldDb, "old-1").amountCents, 1234, "重复迁移金额不变")
    assertEqual(countRecords(oldDb), 2, "重复迁移记录数不变")
    oldDb.close()
  })

  await test("v1 JSON 导入兼容", () => {
    const legacyDb = newDb()
    sql.importJson(legacyDb, {
      app: "local-bookkeeping",
      schemaVersion: 1,
      categories: [{ id: "legacy-category", name: "旧分类", type: "expense" }],
      records: [
        {
          id: "legacy-record",
          categoryId: "legacy-category",
          type: "expense",
          amount: -5.01,
          recordDate: "2025-12-31",
        },
      ],
    })

    const legacyRecord = sql.getRecord(legacyDb, "legacy-record")
    assertEqual(legacyRecord.amountCents, -501, "v1 JSON 金额推导为分")
    assertEqual(legacyRecord.amount, "-5.01", "v1 JSON 金额保留")
    assertEqual(legacyRecord.accountId, sql.DEFAULT_ACCOUNT_ID, "v1 JSON 补默认账户")
    assertEqual(sql.getAccountBalances(legacyDb, true).length, 1, "v1 JSON 导入后账户数")
    legacyDb.close()
  })

  // 清理账户相关记录，验证删除保护
  sql.deleteRecord(db, bankIncome.id)
  const remaining = sql.listRecordGroups(db, { start: "2026-10-01", end: "2026-10-31" })
  for (const group of remaining) {
    for (const record of group.records) {
      sql.deleteRecord(db, record.id)
    }
  }
  sql.deleteAccount(db, bank.id)
  assertEqual(sql.listAccounts(db, true).length, 1, "删除账户后的账户数")

  db.close()

  console.log("")
  console.log(`测试完成：通过 ${passed} 项，失败 ${failed} 项`)
  if (failed > 0) {
    for (const failure of failures) {
      console.error(`- ${failure.name}: ${failure.error?.message || failure.error}`)
    }
    process.exit(1)
  }
}

main().catch((error) => {
  console.error("测试脚本执行失败:", error)
  process.exit(1)
})
