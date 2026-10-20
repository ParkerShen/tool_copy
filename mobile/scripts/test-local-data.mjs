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

async function bundleModule(entry, outfile) {
  await mkdir(cacheDir, { recursive: true })
  await build({
    entryPoints: [resolve(root, entry)],
    outfile,
    bundle: true,
    format: "esm",
    platform: "node",
    target: "node18",
    logLevel: "silent",
  })
  return import(`${pathToFileURL(outfile).href}?t=${Date.now()}`)
}

async function loadCountdownModules() {
  const datePath = resolve(cacheDir, "countdown-date.mjs")
  const sqlPath = resolve(cacheDir, "countdown-sql.mjs")
  const [date, countdownSql] = await Promise.all([
    bundleModule("src/api/countdown/date.ts", datePath),
    bundleModule("src/api/countdown/sql.ts", sqlPath),
  ])
  return { date, sql: countdownSql }
}

async function loadInventoryModule() {
  return bundleModule("src/api/inventory/sql.ts", resolve(cacheDir, "inventory-sql.mjs"))
}

async function loadDiaryModule() {
  return bundleModule("src/api/diary/index.ts", resolve(cacheDir, "diary-index.mjs"))
}

function dateOffset(days) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  const pad = (value) => String(value).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function countdownEvent(overrides = {}) {
  return {
    id: "countdown-test",
    title: "测试倒数日",
    anchorDate: "2026-10-18",
    anchorTime: null,
    anchorEndDate: null,
    anchorEndTime: null,
    countupIncludeStart: false,
    mode: "countdown",
    category: "custom",
    repeatRule: "none",
    emoji: "⭐",
    color: "#8f959e",
    note: "",
    remindDaysBefore: -1,
    pinned: false,
    archived: false,
    createdAt: "2026-10-18 10:00:00",
    updatedAt: "2026-10-18 10:00:00",
    ...overrides,
  }
}

function localDate(year, month, day, hour = 12, minute = 0) {
  return new Date(year, month - 1, day, hour, minute, 0, 0)
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
  const countdown = await loadCountdownModules()
  const inventory = await loadInventoryModule()
  const diary = await loadDiaryModule()

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

    const dateRange = sql.getRecordDateRange(db)
    assertEqual(dateRange.firstRecordDate, "2026-10-20", "最早记录日期")
    assertEqual(dateRange.lastRecordDate, "2026-10-21", "最晚记录日期")

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
    assertEqual(backup.schemaVersion, sql.SCHEMA_VERSION, "备份版本")
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
    insertRecord.run(["old-2", food.id, -5.01, "旧数据负数", "2026-01-06", stamp, stamp])
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
    assertEqual(sql.__internal.getUserVersion(oldDb), 5, "迁移后的 schema 版本")

    const oldRecord = sql.getRecord(oldDb, "old-1")
    assertEqual(oldRecord.amountCents, 1234, "旧记录金额回填为分")
    assertEqual(oldRecord.accountId, sql.DEFAULT_ACCOUNT_ID, "旧记录关联默认账户")
    assertEqual(oldRecord.images.length, 0, "旧记录图片为空数组")
    assertEqual(oldRecord.tags.length, 0, "旧记录标签为空数组")
    assertEqual(sql.getRecord(oldDb, "old-2").amountCents, 501, "负支出迁移为绝对值")
    assertEqual(sql.getRecord(oldDb, "old-2").amount, "5.01", "负支出金额取正")

    assertEqual(sql.listAccounts(oldDb, true).length, 1, "迁移后默认账户")
    assertEqual(
      sql.getRangeStats(oldDb, { start: "2026-01-01", end: "2026-12-31" }).expenseCents,
      1735,
      "迁移后统计不再正负抵消",
    )
    assertEqual(sql.getMonthlyStats(oldDb, "2026-01").expense, 17.35, "迁移后月度统计")

    // 幂等：再次初始化不应改变数据
    sql.initSchema(oldDb)
    sql.seedDefaults(oldDb)
    assertEqual(sql.getRecord(oldDb, "old-1").amountCents, 1234, "重复迁移金额不变")
    assertEqual(sql.getRecord(oldDb, "old-2").amountCents, 501, "重复迁移不重复取绝对值")
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
    assertEqual(legacyRecord.amountCents, 501, "v1 JSON 负支出导入取正")
    assertEqual(legacyRecord.amount, "5.01", "v1 JSON 金额取正")
    assertEqual(legacyRecord.accountId, sql.DEFAULT_ACCOUNT_ID, "v1 JSON 补默认账户")
    assertEqual(sql.getAccountBalances(legacyDb, true).length, 1, "v1 JSON 导入后账户数")
    legacyDb.close()
  })

  // ---------------- 倒数日 ----------------
  const cdate = countdown.date
  const csql = countdown.sql

  await test("倒数日：日期差按日历日计算", () => {
    assertEqual(cdate.daysBetweenKeys("2026-10-18", "2026-10-19"), 1, "相邻日期")
    assertEqual(cdate.daysBetweenKeys("2026-12-31", "2027-01-01"), 1, "跨年")
    assertEqual(cdate.daysBetweenKeys("2024-02-28", "2024-03-01"), 2, "闰年 2 月")
    assertEqual(cdate.daysBetweenKeys("2026-10-18", "2026-10-18"), 0, "同一天")
  })

  await test("倒数日：当天/未来/过去文案", () => {
    const now = localDate(2026, 10, 18, 12, 0)
    const today = cdate.getEventView(countdownEvent({ anchorDate: "2026-10-18" }), now)
    assertEqual(today.statusLabel, "就是今天", "当天文案")
    assertEqual(today.status, "today", "当天状态")

    const future = cdate.getEventView(countdownEvent({ anchorDate: "2026-10-20" }), now)
    assertEqual(future.statusLabel, "还有 2 天", "未来文案")
    assertEqual(future.numberLabel, "2", "未来数字")

    const past = cdate.getEventView(countdownEvent({ anchorDate: "2026-10-16" }), now)
    assertEqual(past.statusLabel, "已过 2 天", "过去文案")
    assertEqual(past.status, "past", "过去状态")
  })

  await test("倒数日：带时间事件", () => {
    const now = localDate(2026, 10, 18, 12, 0)
    const upcoming = cdate.getEventView(
      countdownEvent({ anchorDate: "2026-10-18", anchorTime: "18:00" }),
      now,
    )
    assertEqual(upcoming.statusLabel, "今天 18:00", "今天未到时间")

    const passed = cdate.getEventView(
      countdownEvent({ anchorDate: "2026-10-18", anchorTime: "09:00" }),
      now,
    )
    assertEqual(passed.status, "past", "今天已过时间状态")
    assert(passed.statusLabel.includes("今天 · 已过 09:00"), "今天已过时间文案")
  })

  await test("倒数日：时间段事件", () => {
    const now = localDate(2026, 10, 18, 12, 0)
    const upcoming = cdate.getEventView(
      countdownEvent({
        anchorDate: "2026-10-18",
        anchorTime: "14:00",
        anchorEndTime: "16:00",
      }),
      now,
    )
    assertEqual(upcoming.status, "today", "时间段未开始状态")
    assertEqual(upcoming.statusLabel, "今天 14:00–16:00", "时间段未开始文案")
    assertEqual(upcoming.timeLabel, "14:00–16:00", "时间段展示")

    const ongoing = cdate.getEventView(
      countdownEvent({
        anchorDate: "2026-10-18",
        anchorTime: "10:00",
        anchorEndTime: "14:00",
      }),
      now,
    )
    assertEqual(ongoing.status, "today", "时间段进行中状态")
    assertEqual(ongoing.statusLabel, "进行中 · 14:00 结束", "时间段进行中文案")

    const ended = cdate.getEventView(
      countdownEvent({
        anchorDate: "2026-10-18",
        anchorTime: "08:00",
        anchorEndTime: "10:00",
      }),
      now,
    )
    assertEqual(ended.status, "past", "时间段已结束状态")
    assertEqual(ended.statusLabel, "今天 · 已结束 10:00", "时间段已结束文案")

    const weeklyOngoing = cdate.getEventView(
      countdownEvent({
        anchorDate: "2026-10-11",
        anchorTime: "10:00",
        anchorEndTime: "14:00",
        repeatRule: "weekly",
      }),
      now,
    )
    assertEqual(weeklyOngoing.occurrenceDate, "2026-10-18", "时间段进行中不滚到下周")
    assertEqual(weeklyOngoing.statusLabel, "进行中 · 14:00 结束", "每周时间段进行中")

    const weeklyEnded = cdate.getEventView(
      countdownEvent({
        anchorDate: "2026-10-11",
        anchorTime: "08:00",
        anchorEndTime: "10:00",
        repeatRule: "weekly",
      }),
      now,
    )
    assertEqual(weeklyEnded.occurrenceDate, "2026-10-25", "时间段结束后滚到下周")
  })

  await test("倒数日：跨天结束日期", () => {
    const now = localDate(2026, 10, 18, 12, 0)

    const future = cdate.getEventView(
      countdownEvent({ anchorDate: "2026-10-20", anchorEndDate: "2026-10-23" }),
      now,
    )
    assertEqual(future.statusLabel, "还有 2 天", "未开始的跨天事件")
    assertEqual(future.isRange, true, "跨天标记")
    assertEqual(future.shortDateRangeLabel, "10月20日–10月23日", "跨天短日期")
    assert(String(future.endDateLabel).includes("2026年10月23日"), "结束日期标签")

    const active = cdate.getEventView(
      countdownEvent({ anchorDate: "2026-10-16", anchorEndDate: "2026-10-20" }),
      now,
    )
    assertEqual(active.status, "ongoing", "进行中状态")
    assertEqual(active.statusLabel, "进行中 · 还有 2 天结束", "进行中文案")
    assertEqual(active.numberLabel, "2", "进行中显示剩余结束天数")
    assertEqual(active.isRangeActive, true, "进行中标记")
    assertEqual(active.daysUntil, -2, "已开始 2 天")

    const endingToday = cdate.getEventView(
      countdownEvent({ anchorDate: "2026-10-16", anchorEndDate: "2026-10-18" }),
      now,
    )
    assertEqual(endingToday.statusLabel, "今天结束", "最后一天文案")
    assertEqual(endingToday.isEndingToday, true, "最后一天标记")
    assertEqual(endingToday.numberLabel, "0", "最后一天数字")

    const ended = cdate.getEventView(
      countdownEvent({ anchorDate: "2026-10-10", anchorEndDate: "2026-10-15" }),
      now,
    )
    assertEqual(ended.status, "past", "跨天已结束状态")
    assertEqual(ended.statusLabel, "已结束 3 天", "跨天已结束文案")
    assertEqual(ended.numberLabel, "3", "跨天已结束数字")

    const sameDay = cdate.getEventView(
      countdownEvent({ anchorDate: "2026-10-18", anchorEndDate: "2026-10-18" }),
      now,
    )
    assertEqual(sameDay.isRange, false, "结束日等于目标日不算跨天")
    assertEqual(sameDay.statusLabel, "就是今天", "同一天结束仍显示今天")

    const startsToday = cdate.getEventView(
      countdownEvent({
        anchorDate: "2026-10-18",
        anchorTime: "14:00",
        anchorEndDate: "2026-10-20",
      }),
      now,
    )
    assertEqual(startsToday.statusLabel, "今天 14:00 开始", "今天尚未开始")
    assertEqual(startsToday.isRange, true, "今天开始仍是跨天")

    const weekly = countdownEvent({
      anchorDate: "2026-10-04",
      anchorEndDate: "2026-10-05",
      repeatRule: "weekly",
    })
    const weeklyActive = cdate.getEventView(weekly, now)
    assertEqual(weeklyActive.occurrenceDate, "2026-10-18", "每周区间进行中不滚动")
    assertEqual(weeklyActive.occurrenceEndDate, "2026-10-19", "重复区间按跨度顺延")
    assertEqual(weeklyActive.statusLabel, "进行中 · 还有 1 天结束", "每周区间进行中文案")

    const weeklyEnded = cdate.getEventView(weekly, localDate(2026, 10, 20, 12, 0))
    assertEqual(weeklyEnded.occurrenceDate, "2026-10-25", "每周区间结束后滚到下周")

    const october = cdate.occurrencesInMonth(
      countdownEvent({ anchorDate: "2026-10-18", anchorEndDate: "2026-10-20" }),
      2026,
      10,
      now,
    )
    assertEqual(october[0].endDate, "2026-10-20", "月历保留结束日期")
    assertEqual(october[0].daysUntilEnd, 2, "月历结束倒计时")
  })

  await test("倒数日：每年重复与闰日", () => {
    const leap = countdownEvent({ anchorDate: "2024-02-29", repeatRule: "yearly" })
    assertEqual(
      cdate.getEventView(leap, localDate(2026, 10, 18)).occurrenceDate,
      "2027-02-28",
      "平年 2/29 clamp 到 2/28",
    )
    assertEqual(
      cdate.getEventView(leap, localDate(2028, 1, 1)).occurrenceDate,
      "2028-02-29",
      "闰年恢复 2/29",
    )

    const birthday = countdownEvent({ anchorDate: "2024-11-11", repeatRule: "yearly" })
    const view = cdate.getEventView(birthday, localDate(2026, 10, 18))
    assertEqual(view.occurrenceDate, "2026-11-11", "今年还没到")
    assertEqual(view.daysSinceAnchor, 706, "周年已过天数")
  })

  await test("倒数日：每月重复与短月", () => {
    const monthly = countdownEvent({ anchorDate: "2026-01-31", repeatRule: "monthly" })
    assertEqual(
      cdate.getEventView(monthly, localDate(2026, 2, 10)).occurrenceDate,
      "2026-02-28",
      "2 月短月",
    )
    assertEqual(
      cdate.getEventView(monthly, localDate(2026, 3, 1)).occurrenceDate,
      "2026-03-31",
      "3 月恢复 31 日",
    )
    assertEqual(
      cdate.getEventView(monthly, localDate(2026, 4, 30)).occurrenceDate,
      "2026-04-30",
      "4 月 30 日",
    )
  })

  await test("倒数日：每周重复", () => {
    const weekly = countdownEvent({ anchorDate: "2026-10-04", repeatRule: "weekly" })
    assertEqual(
      cdate.getEventView(weekly, localDate(2026, 10, 18, 12, 0)).occurrenceDate,
      "2026-10-18",
      "今天正好是发生日",
    )

    const weeklyTimed = countdownEvent({
      anchorDate: "2026-10-11",
      anchorTime: "09:00",
      repeatRule: "weekly",
    })
    assertEqual(
      cdate.getEventView(weeklyTimed, localDate(2026, 10, 18, 12, 0)).occurrenceDate,
      "2026-10-25",
      "今天时间已过则滚到下周",
    )

    const futureAnchor = countdownEvent({ anchorDate: "2026-10-25", repeatRule: "weekly" })
    assertEqual(
      cdate.getEventView(futureAnchor, localDate(2026, 10, 18)).occurrenceDate,
      "2026-10-25",
      "未来锚点直接使用锚点",
    )
  })

  await test("倒数日：正数日", () => {
    const now = localDate(2026, 10, 18, 12, 0)
    const ongoing = cdate.getEventView(
      countdownEvent({ mode: "countup", anchorDate: "2026-10-01" }),
      now,
    )
    assertEqual(ongoing.statusLabel, "已经 17 天", "正数日文案")
    assertEqual(ongoing.numberLabel, "17", "正数日数字")
    assertEqual(ongoing.status, "ongoing", "正数日状态")

    const future = cdate.getEventView(
      countdownEvent({ mode: "countup", anchorDate: "2026-10-20" }),
      now,
    )
    assertEqual(future.statusLabel, "还有 2 天", "正数日尚未开始")

    const inclusive = cdate.getEventView(
      countdownEvent({
        mode: "countup",
        anchorDate: "2026-10-01",
        countupIncludeStart: true,
      }),
      now,
    )
    assertEqual(inclusive.statusLabel, "已经 18 天", "包含起始日 +1 天")
    assertEqual(inclusive.numberLabel, "18", "包含起始日数字")

    const inclusiveToday = cdate.getEventView(
      countdownEvent({
        mode: "countup",
        anchorDate: "2026-10-18",
        countupIncludeStart: true,
      }),
      now,
    )
    assertEqual(inclusiveToday.statusLabel, "已经 1 天", "起始日当天算第 1 天")
  })

  await test("倒数日：月历发生日", () => {
    const weekly = countdownEvent({ anchorDate: "2026-10-04", repeatRule: "weekly" })
    const weeklyItems = cdate.occurrencesInMonth(weekly, 2026, 10, localDate(2026, 10, 18))
    assertEqual(weeklyItems.length, 4, "每周重复一个月出现 4 次")
    assertEqual(weeklyItems[0].dateKey, "2026-10-04", "第一次发生日")

    const leap = countdownEvent({ anchorDate: "2024-02-29", repeatRule: "yearly" })
    const leapItems = cdate.occurrencesInMonth(leap, 2028, 2, localDate(2028, 1, 1))
    assertEqual(leapItems.length, 1, "每年重复只出现一次")
    assertEqual(leapItems[0].dateKey, "2028-02-29", "闰年 2/29")

    const monthly = countdownEvent({ anchorDate: "2026-01-31", repeatRule: "monthly" })
    const febItems = cdate.occurrencesInMonth(monthly, 2026, 2, localDate(2026, 1, 1))
    assertEqual(febItems[0].dateKey, "2026-02-28", "月历短月 clamp")

    const future = countdownEvent({ anchorDate: "2026-12-01", repeatRule: "monthly" })
    assertEqual(
      cdate.occurrencesInMonth(future, 2026, 10, localDate(2026, 10, 18)).length,
      0,
      "锚点之前不产生发生日",
    )
  })

  await test("倒数日：排序", () => {
    const now = localDate(2026, 10, 18, 12, 0)
    const list = [
      cdate.getEventView(countdownEvent({ id: "future2", anchorDate: "2026-10-20" }), now),
      cdate.getEventView(countdownEvent({ id: "future1", anchorDate: "2026-10-19" }), now),
      cdate.getEventView(countdownEvent({ id: "past", anchorDate: "2026-10-16" }), now),
      cdate.getEventView(
        countdownEvent({ id: "pinned", anchorDate: "2026-10-25", pinned: true }),
        now,
      ),
    ]
    const sorted = cdate.sortEventViews(list)
    assertEqual(sorted[0].event.id, "pinned", "置顶优先")
    assertEqual(sorted[1].event.id, "future1", "未来升序")
    assertEqual(sorted[2].event.id, "future2", "未来升序 2")
    assertEqual(sorted[3].event.id, "past", "过去在后")
  })

  const cdDb = newDb()
  let cdCreated

  await test("倒数日：SQLite CRUD", () => {
    cdCreated = csql.createEvent(cdDb, {
      title: "妈妈生日",
      anchorDate: "2026-12-01",
      category: "birthday",
      repeatRule: "yearly",
      remindDaysBefore: 3,
    })
    assertEqual(csql.listEvents(cdDb).length, 1, "创建后数量")
    assertEqual(cdCreated.emoji, "🎂", "分类默认 emoji")
    assertEqual(cdCreated.color, "#ff9f43", "分类默认颜色")

    const updated = csql.updateEvent(cdDb, cdCreated.id, {
      title: "妈妈生日 🎂",
      pinned: true,
    })
    assertEqual(updated.title, "妈妈生日 🎂", "更新标题")
    assertEqual(updated.createdAt, cdCreated.createdAt, "更新保留创建时间")
    assertEqual(updated.pinned, true, "更新置顶")

    const timed = csql.updateEvent(cdDb, cdCreated.id, {
      anchorTime: "09:00",
      anchorEndDate: "2026-12-03",
    })
    assertEqual(timed.anchorTime, "09:00", "开始时间")
    assertEqual(timed.anchorEndDate, "2026-12-03", "结束日期")

    const legacyTimed = csql.createEvent(cdDb, {
      title: "旧版时间段",
      anchorDate: "2026-12-05",
      anchorTime: "09:00",
      anchorEndTime: "11:30",
    })
    assertEqual(legacyTimed.anchorEndTime, "11:30", "旧版结束时间可读写")
    csql.deleteEvent(cdDb, legacyTimed.id)

    const countup = csql.createEvent(cdDb, {
      title: "正数测试",
      anchorDate: "2026-01-01",
      mode: "countup",
      countupIncludeStart: true,
    })
    assertEqual(countup.countupIncludeStart, true, "正数包含起始日")
    csql.deleteEvent(cdDb, countup.id)
    assertEqual(csql.listEvents(cdDb).length, 1, "删除正数测试后数量")

    csql.setArchived(cdDb, cdCreated.id, true)
    assertEqual(csql.listEvents(cdDb).length, 0, "默认不返回归档")
    assertEqual(csql.listEvents(cdDb, true).length, 1, "包含归档")
    csql.setArchived(cdDb, cdCreated.id, false)
  })

  await test("倒数日：旧表补结束日期列", () => {
    const legacyDb = new SQL.Database()
    legacyDb.run(`
      CREATE TABLE mini_countdown_event (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        anchor_date TEXT NOT NULL,
        anchor_time TEXT,
        mode TEXT NOT NULL DEFAULT 'countdown',
        category TEXT NOT NULL DEFAULT 'custom',
        repeat_rule TEXT NOT NULL DEFAULT 'none',
        emoji TEXT NOT NULL DEFAULT '⭐',
        color TEXT NOT NULL DEFAULT '#8f959e',
        note TEXT NOT NULL DEFAULT '',
        remind_days_before INTEGER NOT NULL DEFAULT -1,
        pinned INTEGER NOT NULL DEFAULT 0,
        archived INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `)
    const legacyColumns = sql.__internal.tableColumns(legacyDb, "mini_countdown_event")
    assertEqual(legacyColumns.has("anchor_end_time"), false, "旧表没有时间段列")
    assertEqual(legacyColumns.has("anchor_end_date"), false, "旧表没有结束日期列")
    sql.initSchema(legacyDb)
    const migratedColumns = sql.__internal.tableColumns(legacyDb, "mini_countdown_event")
    assert(migratedColumns.has("anchor_end_time"), "迁移后补上时间段列")
    assert(migratedColumns.has("anchor_end_date"), "迁移后补上结束日期列")
    assert(migratedColumns.has("countup_include_start"), "迁移后补上包含起始日列")
    // 幂等：再次初始化不报错
    sql.initSchema(legacyDb)
    legacyDb.close()
  })

  await test("倒数日：输入校验", () => {
    assertThrows(
      () => csql.createEvent(cdDb, { title: "", anchorDate: "2026-01-01" }),
      "请填写标题",
      "空标题",
    )
    assertThrows(
      () => csql.createEvent(cdDb, { title: "x", anchorDate: "2026-02-30" }),
      "日期",
      "非法日期",
    )
    assertThrows(
      () =>
        csql.createEvent(cdDb, {
          title: "x",
          anchorDate: "2026-01-01",
          anchorTime: "25:00",
        }),
      "时间",
      "非法时间",
    )
    assertThrows(
      () =>
        csql.createEvent(cdDb, {
          title: "x",
          anchorDate: "2026-01-01",
          anchorEndTime: "10:00",
        }),
      "开始时间",
      "只有结束时间",
    )
    assertThrows(
      () =>
        csql.createEvent(cdDb, {
          title: "x",
          anchorDate: "2026-01-01",
          anchorTime: "10:00",
          anchorEndTime: "09:00",
        }),
      "不能早于",
      "结束早于开始",
    )
    assertThrows(
      () =>
        csql.createEvent(cdDb, {
          title: "x",
          anchorDate: "2026-01-10",
          anchorEndDate: "2026-01-09",
        }),
      "结束日期",
      "结束日期早于目标日",
    )
    assertThrows(
      () =>
        csql.createEvent(cdDb, {
          title: "x",
          anchorDate: "2026-01-10",
          anchorEndDate: "2026-02-30",
        }),
      "结束日期",
      "非法结束日期",
    )
    assertThrows(
      () =>
        csql.createEvent(cdDb, {
          title: "x",
          anchorDate: "2026-01-01",
          anchorEndDate: "2026-01-08",
          repeatRule: "weekly",
        }),
      "重复周期",
      "重复区间不能超过一个周期",
    )
    assertThrows(
      () =>
        csql.createEvent(cdDb, {
          title: "x",
          anchorDate: "2026-01-01",
          mode: "countup",
          repeatRule: "yearly",
        }),
      "正数日",
      "正数日不能重复",
    )
    assertThrows(
      () =>
        csql.createEvent(cdDb, {
          title: "x",
          anchorDate: "2026-01-01",
          color: "red",
        }),
      "颜色",
      "非法颜色",
    )

    const sameDay = csql.createEvent(cdDb, {
      title: "同天结束",
      anchorDate: "2026-01-01",
      anchorEndDate: "2026-01-01",
    })
    assertEqual(sameDay.anchorEndDate, null, "结束日等于目标日会归一化为 null")
    csql.deleteEvent(cdDb, sameDay.id)

    const countupRange = csql.createEvent(cdDb, {
      title: "正数区间",
      anchorDate: "2026-01-01",
      anchorEndDate: "2026-01-03",
      mode: "countup",
    })
    assertEqual(countupRange.anchorEndDate, null, "正数日清空结束日期")
    csql.deleteEvent(cdDb, countupRange.id)
  })

  await test("倒数日：JSON 与 SQLite 备份", () => {
    const payload = sql.exportJson(cdDb)
    assertEqual(payload.countdownEvents.length, 1, "JSON 导出包含倒数日")
    assertEqual(payload.countdownEvents[0].title, "妈妈生日 🎂", "导出标题")
    assertEqual(sql.getStats(cdDb).countdownCount, 1, "统计倒数日数量")

    const bytes = cdDb.export()
    const reopened = new SQL.Database(bytes)
    const reopenedEvents = csql.listEvents(reopened, true)
    assertEqual(reopenedEvents.length, 1, "SQLite 文件包含倒数日")
    assertEqual(reopenedEvents[0].anchorDate, "2026-12-01", "SQLite 文件字段")
    assertEqual(reopenedEvents[0].anchorEndDate, "2026-12-03", "SQLite 文件结束日期")
    assertEqual(reopenedEvents[0].anchorTime, "09:00", "SQLite 文件开始时间")
    assertEqual(payload.countdownEvents[0].anchorEndDate, "2026-12-03", "JSON 导出结束日期")
    reopened.close()
  })

  await test("倒数日：JSON 导入替换与旧备份兼容", () => {
    const payload = sql.exportJson(cdDb)
    payload.countdownEvents = [
      countdownEvent({
        id: "imported-1",
        title: "导入的纪念日",
        anchorDate: "2026-11-11",
        anchorEndDate: "2026-11-13",
        repeatRule: "yearly",
      }),
    ]
    sql.importJson(cdDb, payload)
    const imported = csql.listEvents(cdDb, true)
    assertEqual(imported.length, 1, "导入后数量")
    assertEqual(imported[0].title, "导入的纪念日", "导入后标题")
    assertEqual(imported[0].anchorEndDate, "2026-11-13", "导入后结束日期")

    const oldPayload = sql.exportJson(cdDb)
    delete oldPayload.countdownEvents
    sql.importJson(cdDb, oldPayload)
    assertEqual(csql.listEvents(cdDb, true).length, 1, "旧备份保留现有倒数日")

    const badPayload = sql.exportJson(cdDb)
    badPayload.countdownEvents = [{ ...countdownEvent(), title: "" }]
    assertThrows(() => sql.importJson(cdDb, badPayload), "请填写标题", "非法倒数日回滚")
    assertEqual(csql.listEvents(cdDb, true).length, 1, "回滚后数据不变")
  })

  cdDb.close()

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

  await test("收纳：位置树 / 路径 / 防环 / 深度", () => {
    const invDb = newDb()
    const room = inventory.createLocation(invDb, { name: "客厅" })
    const cabinet = inventory.createLocation(invDb, { name: "电视柜", parentId: room.id })
    const drawer = inventory.createLocation(invDb, { name: "抽屉", parentId: cabinet.id })

    assertEqual(
      inventory
        .getLocationPath(invDb, drawer.id)
        .map((part) => part.name)
        .join("/"),
      "客厅/电视柜/抽屉",
      "位置路径",
    )
    assertThrows(() => inventory.createLocation(invDb, { name: "客厅" }), "同名", "同层不允许重名")
    assertThrows(
      () => inventory.moveLocation(invDb, room.id, drawer.id),
      "子位置",
      "禁止移动到自己的后代",
    )

    const tree = inventory.buildLocationTree(invDb)
    assertEqual(tree.length, 1, "树根数量")
    assertEqual(tree[0].children[0].children[0].name, "抽屉", "树层级")

    let parentId = drawer.id
    for (let level = 4; level <= 6; level += 1) {
      parentId = inventory.createLocation(invDb, { name: `第${level}层`, parentId }).id
    }
    assertThrows(
      () => inventory.createLocation(invDb, { name: "第7层", parentId }),
      "6 层",
      "位置深度上限",
    )

    const item = inventory.createItem(invDb, { name: "遥控器", locationId: drawer.id })
    inventory.deleteLocation(invDb, cabinet.id)
    assertEqual(inventory.getLocation(invDb, drawer.id).parentId, null, "删除位置后子位置移到顶层")
    inventory.deleteLocation(invDb, drawer.id)
    assertEqual(inventory.getItem(invDb, item.id).locationId, null, "删除位置后物品变为未指定")
    invDb.close()
  })

  await test("收纳：物品编号 / 档案 / 归档 / 删除清理", () => {
    const invDb = newDb()
    const room = inventory.createLocation(invDb, { name: "书房" })
    const tag = inventory.createTag(invDb, { name: "工具", color: "#123456" })
    const photo = {
      dataUrl: "data:image/jpeg;base64,AAAA",
      thumbUrl: "data:image/jpeg;base64,AA",
    }
    const item = inventory.createItem(invDb, {
      name: "电钻",
      description: "18V 无刷",
      quantity: 1,
      unit: "台",
      locationId: room.id,
      serialNumber: "SN-001",
      modelNumber: "XPH12",
      manufacturer: "Makita",
      purchasePriceCents: 29900,
      purchaseDate: "2026-01-10",
      purchaseFrom: "京东",
      warrantyExpiresOn: dateOffset(10),
      warrantyNote: "一年保修",
      photos: [photo],
      tagIds: [tag.id],
      fields: [{ name: "电压", value: "18V" }],
    })
    assertEqual(item.assetCode, "000-001", "首个物品编号")

    const detail = inventory.getItemDetail(invDb, item.id)
    assertEqual(detail.photos.length, 1, "照片数量")
    assertEqual(detail.tags[0].name, "工具", "标签")
    assertEqual(detail.fields[0].value, "18V", "自定义属性")
    assertEqual(detail.locationText, "书房", "位置文本")
    assertEqual(detail.purchasePriceCents, 29900, "购买价格（分）")

    const second = inventory.createItem(invDb, { name: "螺丝刀" })
    assertEqual(second.assetCode, "000-002", "编号自增")
    assertEqual(inventory.findByAssetNo(invDb, "000-001").id, item.id, "按编号查找")
    assertEqual(inventory.findByAssetNo(invDb, "1").id, item.id, "按纯数字编号查找")
    assertEqual(inventory.findItemByIdOrCode(invDb, item.id).name, "电钻", "按 id 查找")

    assertEqual(inventory.adjustQuantity(invDb, item.id, 2.5).quantity, 2.5, "数量调整")
    assertThrows(() => inventory.adjustQuantity(invDb, item.id, -1), "负数", "数量不能为负")

    inventory.setItemArchived(invDb, item.id, true)
    assertEqual(inventory.listItems(invDb).total, 1, "归档后默认列表数量")
    assertEqual(inventory.listItems(invDb, { includeArchived: true }).total, 2, "包含归档数量")
    inventory.setItemArchived(invDb, item.id, false)

    inventory.deleteItem(invDb, item.id)
    assertEqual(inventory.getItem(invDb, item.id), null, "删除物品")
    const photoCount = invDb.exec(
      "SELECT COUNT(*) FROM mini_inventory_photo WHERE item_id = '" + item.id + "'",
    )[0].values[0][0]
    assertEqual(Number(photoCount), 0, "删除物品时清理照片")
    assertEqual(inventory.listTags(invDb)[0].name, "工具", "删除物品不影响标签")
    invDb.close()
  })

  await test("收纳：关键词 / 位置 / 标签 / 筛选 / 分页", () => {
    const invDb = newDb()
    const room = inventory.createLocation(invDb, { name: "客厅" })
    const cabinet = inventory.createLocation(invDb, { name: "电视柜", parentId: room.id })
    const drawer = inventory.createLocation(invDb, { name: "抽屉", parentId: cabinet.id })
    const tool = inventory.createTag(invDb, { name: "工具" })
    const photo = {
      dataUrl: "data:image/jpeg;base64,AAAA",
      thumbUrl: "data:image/jpeg;base64,AA",
    }

    const drill = inventory.createItem(invDb, {
      name: "电钻",
      locationId: drawer.id,
      serialNumber: "SN-ABC",
      photos: [photo],
      tagIds: [tool.id],
      fields: [{ name: "电压", value: "18V" }],
    })
    const cable = inventory.createItem(invDb, { name: "数据线", locationId: room.id })
    const camera = inventory.createItem(invDb, { name: "旧相机", locationId: drawer.id })
    inventory.setItemArchived(invDb, camera.id, true)
    const towel = inventory.createItem(invDb, { name: "100%纯棉毛巾" })

    assertEqual(inventory.listItems(invDb, { keyword: "电钻" }).total, 1, "名称搜索")
    assertEqual(inventory.listItems(invDb, { keyword: "sn-abc" }).total, 1, "序列号搜索")
    assertEqual(inventory.listItems(invDb, { keyword: "工具" }).total, 1, "标签名搜索")
    assertEqual(inventory.listItems(invDb, { keyword: "18v" }).total, 1, "自定义属性搜索")
    assertEqual(inventory.listItems(invDb, { keyword: "客厅" }).total, 1, "位置名搜索")
    assertEqual(inventory.listItems(invDb, { keyword: "电钻 工具" }).total, 1, "多关键词 AND")
    assertEqual(inventory.listItems(invDb, { keyword: "%" }).total, 1, "LIKE 通配符转义")
    assertEqual(inventory.listItems(invDb, { keyword: "不存在的物品" }).total, 0, "无结果")

    assertEqual(inventory.listItems(invDb, { locationId: room.id }).total, 2, "位置筛选包含后代")
    assertEqual(
      inventory.listItems(invDb, { locationId: room.id, includeArchived: true }).total,
      3,
      "位置筛选包含归档",
    )
    assertEqual(inventory.listItems(invDb, { tagIds: [tool.id] }).total, 1, "标签筛选")
    assertEqual(inventory.listItems(invDb, { hasPhoto: true }).total, 1, "有照片筛选")
    assertEqual(inventory.listItems(invDb, { onlyUnassigned: true }).total, 1, "未指定位置筛选")

    const page = inventory.listItems(invDb, { pageSize: 2, sort: "assetNo" })
    assertEqual(page.total, 3, "分页 total 不受 limit 影响")
    assertEqual(page.items.length, 2, "分页数量")
    assertEqual(page.items[0].id, drill.id, "按编号排序")
    assertEqual(page.items[0].locationPath, "客厅 / 电视柜 / 抽屉", "列表位置路径")
    assertEqual(page.items[0].tags[0].name, "工具", "列表标签")
    assertEqual(page.items[0].thumbUrl, photo.thumbUrl, "列表缩略图")
    assertEqual(inventory.listItems(invDb).totalValueCents, 0, "总价值（未填价格）")
    invDb.close()
  })

  await test("收纳：维护记录与首页摘要", () => {
    const invDb = newDb()
    const room = inventory.createLocation(invDb, { name: "厨房" })
    const item = inventory.createItem(invDb, {
      name: "净水器",
      locationId: room.id,
      purchasePriceCents: 159900,
      warrantyExpiresOn: dateOffset(10),
    })
    const maintenance = inventory.createMaintenance(invDb, item.id, {
      name: "更换滤芯",
      scheduledOn: dateOffset(5),
      costCents: 5000,
      description: "半年一次",
    })
    assertEqual(maintenance.name, "更换滤芯", "维护记录名称")
    assertThrows(
      () => inventory.createMaintenance(invDb, item.id, { name: "只有名称" }),
      "至少填一个",
      "维护日期校验",
    )

    const summary = inventory.getInventorySummary(invDb)
    assertEqual(summary.itemCount, 1, "摘要物品数")
    assertEqual(summary.locationCount, 1, "摘要位置数")
    assertEqual(summary.totalValueCents, 159900, "摘要总价值")
    assertEqual(summary.warrantyExpiringCount, 1, "保修将到期数")
    assertEqual(summary.maintenanceDueCount, 1, "待维护数")

    inventory.updateMaintenance(invDb, maintenance.id, {
      name: "更换滤芯",
      completedOn: dateOffset(0),
    })
    assertEqual(inventory.listMaintenance(invDb, item.id)[0].completedOn, dateOffset(0), "更新维护")
    inventory.deleteMaintenance(invDb, maintenance.id)
    assertEqual(inventory.listMaintenance(invDb, item.id).length, 0, "删除维护记录")
    invDb.close()
  })

  await test("收纳：JSON / SQLite 备份与旧备份兼容", () => {
    const invDb = newDb()
    const room = inventory.createLocation(invDb, { name: "储物间" })
    const tag = inventory.createTag(invDb, { name: "季节性" })
    const item = inventory.createItem(invDb, {
      name: "取暖器",
      locationId: room.id,
      tagIds: [tag.id],
      purchasePriceCents: 49900,
      photos: [{ dataUrl: "data:image/jpeg;base64,AAAA", thumbUrl: "data:image/jpeg;base64,AA" }],
      fields: [{ name: "功率", value: "2000W" }],
    })
    inventory.createMaintenance(invDb, item.id, { name: "清灰", completedOn: "2026-01-01" })

    const payload = sql.exportJson(invDb)
    assertEqual(payload.schemaVersion, sql.SCHEMA_VERSION, "备份版本与当前 schema 一致")
    assertEqual(payload.inventory.items.length, 1, "JSON 包含物品")
    assertEqual(payload.inventory.items[0].photos.length, 1, "JSON 包含照片")
    assertEqual(payload.inventory.items[0].fields[0].value, "2000W", "JSON 包含自定义属性")
    assertEqual(payload.inventory.items[0].maintenance.length, 1, "JSON 包含维护记录")

    const bytes = invDb.export()
    const reopened = new SQL.Database(bytes)
    assertEqual(inventory.listItems(reopened).total, 1, "SQLite 文件包含收纳数据")
    assertEqual(inventory.listLocations(reopened).length, 1, "SQLite 文件包含位置")
    reopened.close()

    const target = newDb()
    sql.importJson(target, payload)
    assertEqual(inventory.listItems(target).total, 1, "JSON 导入物品")
    assertEqual(inventory.listItems(target).items[0].name, "取暖器", "JSON 导入名称")
    assertEqual(inventory.listLocations(target)[0].name, "储物间", "JSON 导入位置")
    assertEqual(inventory.listTags(target)[0].name, "季节性", "JSON 导入标签")

    const oldPayload = sql.exportJson(target)
    delete oldPayload.inventory
    sql.importJson(target, oldPayload)
    assertEqual(inventory.listItems(target).total, 1, "旧备份保留现有收纳数据")

    const badPayload = sql.exportJson(target)
    badPayload.inventory.items[0].locationId = "missing-location"
    assertThrows(() => sql.importJson(target, badPayload), "不存在的位置", "非法收纳引用应拒绝")
    assertEqual(inventory.listItems(target).total, 1, "失败后收纳数据不变")

    inventory.clearInventoryAll(target)
    assertEqual(inventory.listItems(target).total, 0, "清空收纳物品")
    assertEqual(inventory.listLocations(target).length, 0, "清空收纳位置")
    assertEqual(sql.listCategories(target).length, 9, "清空收纳不影响记账分类")
    target.close()
    invDb.close()
  })

  await test("日记：统一备份校验与规范化", () => {
    const normalized = diary.normalizeDiaryBackupEntries({
      entries: [
        {
          id: "diary-1",
          content: "今天很好",
          date: "2026-10-20",
          mood: "happy",
          weather: "sunny",
          tags: ["生活", "生活", " "],
          images: ["data:image/png;base64,AA"],
        },
        { id: "diary-2", content: "坏日期", date: "not-a-date" },
        { id: "diary-3", content: "回收站", date: "2026-10-19", deletedAt: 123 },
      ],
    })
    assertEqual(normalized.length, 2, "过滤无效日期")
    assertEqual(normalized[0].tags.length, 1, "标签去重并去掉空值")
    assertEqual(normalized[0].mood, "happy", "保留合法心情")
    assertEqual(normalized[0].images.length, 1, "保留图片 data URL")
    assertEqual(normalized[1].deletedAt, 123, "保留回收站标记")

    const arrayForm = diary.normalizeDiaryBackupEntries([
      { id: "diary-4", content: "纯数组格式", date: "2026-10-18" },
    ])
    assertEqual(arrayForm.length, 1, "兼容纯数组旧格式")
    assertEqual(arrayForm[0].mood, "neutral", "非法心情回退为 neutral")

    assertEqual(diary.normalizeDiaryBackupEntries({ entries: [] }).length, 0, "空备份合法")
    assertThrows(
      () => diary.normalizeDiaryBackupEntries({ entries: "bad" }),
      "格式不正确",
      "非数组应拒绝",
    )
    assertThrows(
      () => diary.normalizeDiaryBackupEntries([{ id: "bad", content: "x", date: "not-a-date" }]),
      "没有可导入",
      "全部无效应拒绝",
    )
  })

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
