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
      assert(text.includes(expectedText), `${message}：错误信息应包含 "${expectedText}"，实际 "${text}"`)
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
    assert(categories.every((c) => c.isSystem && c.source === "system"), "默认分类应标记为系统分类")
    assert(categories.every((c) => c.icon && c.color), "默认分类应包含图标和颜色")
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
    assertEqual(updated.type, "expense", "未传 type 时保持原类型")

    const stats = sql.getMonthlyStats(db, "2026-10")
    assertEqual(stats.expense, 14.84, "更新后的月度支出")
  })

  await test("删除记录", () => {
    sql.deleteRecord(db, wage.id)
    assertEqual(sql.getMonthlyStats(db, "2026-10").income, 0, "删除后的收入")
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
