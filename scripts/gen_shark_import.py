# -*- coding: utf-8 -*-
"""Generate MySQL INSERT statements for the Shark bookkeeping CSV.

Reads the export, maps Shark categories to mini_bookkeeping_system_category ids,
and writes an idempotent import script (deterministic UUIDv5 ids + INSERT IGNORE).
"""
import csv
import io
import json
import os
import sys
import uuid

# 用法: python gen_shark_import.py [csv路径] [输出sql路径]
CSV_PATH = sys.argv[1] if len(sys.argv) > 1 else r"C:\Users\96082\Desktop\鲨鱼记账明细.csv"
OUT_SQL = sys.argv[2] if len(sys.argv) > 2 else r"C:\Users\96082\Desktop\tool\serveradmin\shark_import_2026.sql"
OUT_SUMMARY = r"C:\Users\96082\Desktop\tool\tmp_import_summary.json"

USER_ID = "1"
RECORD_TIME = "12:00:00"
NOW = __import__("datetime").datetime.now().strftime("%Y-%m-%d %H:%M:%S")
ID_NAMESPACE = uuid.UUID("8f4b1d3a-2c6e-4f5a-9b7d-1e2f3a4b5c6d")

# Shark category -> mini_bookkeeping_system_category.id
CATEGORY_MAP = {
    "餐饮": "29a43e18-663b-11f0-b510-a81e84ba98a1",
    "交通": "29a43e18-663b-11f0-b310-a81e84ba98ac",
    "购物": "29a43e18-663b-11f0-b510-a81e64ba98ac",
    "娱乐": "29a43e18-663b-11f0-b510-a81e88ba98ac",
    "通讯": "29a23e18-633b-11f0-b410-b81e84ba98ac",
    "美容": "29c43e18-563b-11f0-b510-b61e84ba78ac",
    "医疗": "29a42e18-663b-11f0-b510-a81e84ba98ac",
    "工资": "29a43e18-663b-11f0-b511-a81e84ba98ac",
    "住房": "29a43e18-663b-11f0-b510-b81e84ba98ac",   # 住房 -> 居家
    "汽车": "29a43e18-663b-11f0-b310-a81e84ba98ac",   # 汽车 -> 交通
    "礼金": "29a41e18-662b-21f0-b510-a81e84ba98ac",   # 礼金 -> 其他支出
    # 以下鲨鱼分类没有对应的系统分类，统一归入其他支出
    "办公": "29a41e18-662b-21f0-b510-a81e84ba98ac",
    "日用": "29a41e18-662b-21f0-b510-a81e84ba98ac",
    "捐赠": "29a41e18-662b-21f0-b510-a81e84ba98ac",
    "社交": "29a41e18-662b-21f0-b510-a81e84ba98ac",
    "网贷": "29a41e18-662b-21f0-b510-a81e84ba98ac",
    "长辈": "29a41e18-662b-21f0-b510-a81e84ba98ac",
    "亲友": "29a41e18-662b-21f0-b510-a81e84ba98ac",
    "礼物": "29a41e18-662b-21f0-b510-a81e84ba98ac",
    "旅行": "29a41e18-662b-21f0-b510-a81e84ba98ac",
    # 其它 depends on income/expense, handled in code
}
OTHER_INCOME = "29a43e18-662b-11f0-b510-a81e84ba98ac"    # 其他收入
OTHER_EXPENSE = "29a41e18-662b-21f0-b510-a81e84ba98ac"   # 其他支出

TYPE_MAP = {"支出": "expense", "收入": "income"}


def sql_escape(s: str) -> str:
    return s.replace("\\", "\\\\").replace("'", "\\'")


def parse_date(s: str) -> str:
    # 2026年08月21日 -> 2026-08-21
    s = s.strip()
    assert s.endswith("日"), s
    y, rest = s.split("年")
    m, d = rest[:-1].split("月")
    return f"{int(y):04d}-{int(m):02d}-{int(d):02d}"


raw = open(CSV_PATH, "rb").read().decode("utf-16")
reader = csv.reader(io.StringIO(raw), delimiter="\t")
header = next(reader)
rows = [r for r in reader if any(c.strip() for c in r)]

assert header == ["日期", "收支类型", "类别", "账户", "金额", "备注"], header

inserts = []
summary = {
    "total": 0,
    "income_total": 0.0,
    "expense_total": 0.0,
    "by_type": {},
    "by_category": {},
    "date_min": None,
    "date_max": None,
    "unmapped": [],
}

for idx, row in enumerate(rows, start=1):
    date_raw, type_raw, cat, _account, amount_raw, remark = [c.strip() for c in row]
    record_date = parse_date(date_raw)
    rtype = TYPE_MAP[type_raw]
    amount = round(float(amount_raw), 2)

    if cat == "其它":
        category_id = OTHER_INCOME if rtype == "income" else OTHER_EXPENSE
    else:
        category_id = CATEGORY_MAP.get(cat)
    if not category_id:
        summary["unmapped"].append(cat)
        continue

    # Deterministic id: stable across re-runs, distinct per source row.
    rid = str(uuid.uuid5(ID_NAMESPACE, f"shark|{idx}|{date_raw}|{type_raw}|{cat}|{amount_raw}|{remark}"))

    inserts.append(
        "INSERT IGNORE INTO `mini_bookkeeping_record` "
        "(`id`, `user_id`, `category_id`, `type`, `amount`, `title`, `remark`, "
        "`record_date`, `record_time`, `created_at`, `updated_at`, `deleted_at`) VALUES "
        f"('{rid}', '{USER_ID}', '{category_id}', '{rtype}', {amount:.2f}, "
        f"'{sql_escape(cat)}', '{sql_escape(remark)}', '{record_date}', "
        f"'{RECORD_TIME}', '{NOW}', '{NOW}', NULL);"
    )

    summary["total"] += 1
    summary["by_type"][rtype] = summary["by_type"].get(rtype, 0) + 1
    summary["by_category"][cat] = summary["by_category"].get(cat, 0) + 1
    if rtype == "income":
        summary["income_total"] = round(summary["income_total"] + amount, 2)
    else:
        summary["expense_total"] = round(summary["expense_total"] + amount, 2)
    summary["date_min"] = record_date if not summary["date_min"] else min(summary["date_min"], record_date)
    summary["date_max"] = record_date if not summary["date_max"] else max(summary["date_max"], record_date)

assert not summary["unmapped"], summary["unmapped"]

header_sql = f"""-- ============================================================
-- 鲨鱼记账明细导入脚本（自动生成）
-- 来源：{os.path.basename(CSV_PATH)}
-- 目标表：mini_bookkeeping_record（用户 user_id='{USER_ID}'）
-- 区间：{summary['date_min']} ~ {summary['date_max']}，共 {summary['total']} 条
-- 说明：使用确定性 UUID + INSERT IGNORE，可安全重复执行，不会产生重复数据
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS=0;

START TRANSACTION;

"""

footer_sql = f"""
COMMIT;

-- 导入结果校验
SELECT COUNT(*) AS imported_rows
FROM `mini_bookkeeping_record`
WHERE `user_id` = '{USER_ID}'
  AND `created_at` = '{NOW}';

SELECT `type`, COUNT(*) AS cnt, SUM(`amount`) AS total
FROM `mini_bookkeeping_record`
WHERE `user_id` = '{USER_ID}'
  AND `created_at` = '{NOW}'
GROUP BY `type`;
"""

open(OUT_SQL, "w", encoding="utf-8", newline="\n").write(
    header_sql + "\n".join(inserts) + footer_sql
)
open(OUT_SUMMARY, "w", encoding="utf-8").write(
    json.dumps(summary, ensure_ascii=False, indent=1)
)
print("generated", summary["total"], "rows ->", OUT_SQL)
