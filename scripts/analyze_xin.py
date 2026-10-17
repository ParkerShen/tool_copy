# -*- coding: utf-8 -*-
"""Analyze xin.sql record/category consistency. Read-only."""
import re
import json
import collections
import sys

SQL_PATH = r"C:\Users\96082\Desktop\tool\serveradmin\xin.sql"
OUT_PATH = r"C:\Users\96082\Desktop\tool\tmp_xin_analysis.json"


def parse_inserts(text, table):
    """Yield list of column value strings for INSERTs into table."""
    pat = re.compile(
        r"INSERT INTO `" + table + r"` VALUES \((.*?)\);", re.S)
    for m in pat.finditer(text):
        body = m.group(1)
        parts = []
        cur = []
        in_str = False
        esc = False
        for ch in body:
            if in_str:
                if esc:
                    cur.append(ch)
                    esc = False
                elif ch == "\\":
                    cur.append(ch)
                    esc = True
                elif ch == "'":
                    cur.append(ch)
                    in_str = False
                else:
                    cur.append(ch)
            else:
                if ch == "'":
                    cur.append(ch)
                    in_str = True
                elif ch == ",":
                    parts.append("".join(cur).strip())
                    cur = []
                else:
                    cur.append(ch)
        parts.append("".join(cur).strip())
        yield parts


def unq(v):
    if v == "NULL":
        return None
    if v.startswith("'") and v.endswith("'"):
        return v[1:-1].replace("\\'", "'").replace("\\\\", "\\")
    return v


text = open(SQL_PATH, encoding="utf-8", errors="replace").read()

categories = {}
for p in parse_inserts(text, "mini_bookkeeping_category"):
    # id,name,type,icon,color,sort_order,is_system,user_id,created_at,updated_at,deleted_at
    categories[unq(p[0])] = {
        "name": unq(p[1]), "type": unq(p[2]), "is_system": unq(p[6]),
        "user_id": unq(p[7]), "deleted_at": unq(p[10]),
    }

system_cats = {}
for p in parse_inserts(text, "mini_bookkeeping_system_category"):
    system_cats[unq(p[0])] = {
        "name": unq(p[1]), "type": unq(p[2]), "is_default": unq(p[6]),
    }

rec_count = 0
cat_usage = collections.Counter()
missing = collections.Counter()
types = collections.Counter()
dates = []
user_ids = collections.Counter()
for p in parse_inserts(text, "mini_bookkeeping_record"):
    rec_count += 1
    # id,user_id,category_id,type,amount,title,remark,record_date,...
    user_ids[unq(p[1])] += 1
    cid = unq(p[2])
    cat_usage[cid] += 1
    types[unq(p[3])] += 1
    dates.append(unq(p[7]))
    if cid not in categories:
        missing[cid] += 1

cat_rows = []
for cid, n in cat_usage.most_common():
    c = categories.get(cid)
    s = system_cats.get(cid)
    cat_rows.append({
        "id": cid,
        "usage": n,
        "in_category_table": bool(c),
        "in_system_category": bool(s),
        "category_name": c["name"] if c else None,
        "system_name": s["name"] if s else None,
        "deleted": c["deleted_at"] if c else None,
    })

result = {
    "record_count": rec_count,
    "type_counts": dict(types),
    "date_min": min(dates),
    "date_max": max(dates),
    "user_ids": dict(user_ids),
    "distinct_category_ids_used": len(cat_usage),
    "records_with_category_not_in_category_table": sum(missing.values()),
    "category_usage": cat_rows,
    "category_table_count": len(categories),
    "system_category_count": len(system_cats),
    "category_table": [
        {"id": k, "name": v["name"], "type": v["type"], "is_system": v["is_system"],
         "user_id": v["user_id"], "deleted_at": v["deleted_at"]}
        for k, v in categories.items()
    ],
    "system_category": [
        {"id": k, "name": v["name"], "type": v["type"]} for k, v in system_cats.items()
    ],
}

open(OUT_PATH, "w", encoding="utf-8").write(
    json.dumps(result, ensure_ascii=False, indent=1))
print("ok", rec_count)
