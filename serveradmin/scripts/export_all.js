/**
 * 导出 xin 库全部 11 张表（含字段注释）为 JSON，供 build_all_excel.py 生成 Excel。
 * 用法: node scripts/export_all.js <输出json路径>
 */
const fs = require('fs');
const mysql = require('mysql2/promise');

const OUT = process.argv[2] || 'tmp_all.json';
const DB = 'xin';

const TABLES = {
  mini_bookkeeping_category: {
    sheet: '记账分类',
    desc: '用户自定义记账分类',
    order: '`type`, `sort_order`, `name`',
  },
  mini_bookkeeping_icon: {
    sheet: '图标库',
    desc: '记账图标库',
    order: '`type`, `sort_order`, `id`',
  },
  mini_bookkeeping_record: {
    sheet: '记账明细',
    desc: '记账记录主表',
    order: '`record_date`, `record_time`, `created_at`',
  },
  mini_bookkeeping_system_category: {
    sheet: '系统分类',
    desc: '系统内置记账分类',
    order: '`type`, `sort_order`',
  },
  platform_black_token: {
    sheet: 'Token黑名单',
    desc: '失效 Token 黑名单',
    order: '`id`',
  },
  platform_permission: {
    sheet: '权限',
    desc: '后台菜单/按钮权限',
    order: '`order_num`, `permission_id`',
  },
  platform_role: {
    sheet: '角色',
    desc: '后台角色',
    order: '`order`, `role_id`',
  },
  platform_role_permission: {
    sheet: '角色权限',
    desc: '角色与权限关联',
    order: '`id`',
  },
  platform_user: {
    sheet: '后台用户',
    desc: '后台账号',
    order: '`user_id`',
  },
  platform_user_contact_info: {
    sheet: '用户联系信息',
    desc: '用户社交账号信息',
    order: '`id`',
  },
  platform_user_role: {
    sheet: '用户角色',
    desc: '用户与角色关联',
    order: '`id`',
  },
};

(async () => {
  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3307,
    user: 'xin',
    password: '123456',
    database: DB,
    dateStrings: true,
    supportBigNumbers: true,
  });

  const [colRows] = await conn.query(
    `SELECT TABLE_NAME tn, COLUMN_NAME cn, COLUMN_COMMENT cc, DATA_TYPE dt
       FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ?
      ORDER BY TABLE_NAME, ORDINAL_POSITION`,
    [DB],
  );

  const meta = {};
  for (const c of colRows) {
    if (!meta[c.tn]) meta[c.tn] = [];
    meta[c.tn].push({ name: c.cn, comment: c.cc || '', type: c.dt });
  }

  const out = { generatedAt: new Date().toISOString(), database: DB, tables: [] };
  for (const [name, cfg] of Object.entries(TABLES)) {
    const columns = meta[name] || [];
    if (!columns.length) {
      console.warn('skip missing table', name);
      continue;
    }
    const select = columns.map((c) => '`' + c.name + '`').join(', ');
    const [rows] = await conn.query(`SELECT ${select} FROM \`${name}\` ORDER BY ${cfg.order}`);
    out.tables.push({
      name,
      sheet: cfg.sheet,
      desc: cfg.desc,
      columns,
      rows: rows.map((r) => columns.map((c) => r[c.name] ?? null)),
    });
    console.log(`${name}: ${rows.length} rows`);
  }

  fs.writeFileSync(OUT, JSON.stringify(out), 'utf8');
  console.log(`saved -> ${OUT}`);
  await conn.end();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
