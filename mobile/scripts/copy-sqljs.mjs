#!/usr/bin/env node
/**
 * 把 sql.js 的浏览器运行时复制到 src/static/sql/。
 *
 * 通过 <script> 标签加载，避免 Vite 打包 sql.js UMD 里的 Node 分支（require("fs")），
 * 同时让 .wasm 作为静态资源被 Service Worker 预缓存。
 *
 * 用法：node scripts/copy-sqljs.mjs
 */
import { copyFile, mkdir, stat } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const dist = resolve(root, "node_modules/sql.js/dist")
const target = resolve(root, "src/static/sql")

const files = ["sql-wasm.js", "sql-wasm.wasm"]

async function main() {
  await mkdir(target, { recursive: true })
  for (const file of files) {
    const src = resolve(dist, file)
    const dest = resolve(target, file)
    const [srcStat, destStat] = await Promise.all([
      stat(src).catch(() => null),
      stat(dest).catch(() => null),
    ])
    if (!srcStat) {
      throw new Error(`未找到 ${src}，请先执行 pnpm install`)
    }
    // 只复制缺失或大小不一致的文件，避免每次构建都改动静态资源
    if (!destStat || destStat.size !== srcStat.size) {
      await copyFile(src, dest)
      console.log(`[sql.js] 已复制 ${file} -> src/static/sql/`)
    } else {
      console.log(`[sql.js] 已是最新 ${file}`)
    }
  }
}

main().catch((error) => {
  console.error("[sql.js] 复制失败:", error)
  process.exit(1)
})
