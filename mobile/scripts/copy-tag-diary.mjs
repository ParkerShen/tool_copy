import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
const source = resolve(here, "../../daylife/tag-diary")
const target = resolve(here, "../src/static/tag-diary")

const FILES = [
  "index.html",
  "style.css",
  "app.js",
  "manifest.webmanifest",
  "icon-180.png",
  "icon-192.png",
  "icon-512.png",
]

if (!existsSync(resolve(source, "index.html"))) {
  if (existsSync(resolve(target, "index.html"))) {
    console.warn(`[tag-diary] 源目录不存在，沿用已有副本: ${target}`)
    process.exit(0)
  }
  console.error(`[tag-diary] 找不到源目录: ${source}`)
  process.exit(1)
}

rmSync(target, { recursive: true, force: true })
mkdirSync(target, { recursive: true })

for (const file of FILES) {
  const from = resolve(source, file)
  if (!existsSync(from)) {
    console.warn(`[tag-diary] 跳过缺失文件: ${file}`)
    continue
  }
  cpSync(from, resolve(target, file))
}

console.log(`[tag-diary] 已同步 ${FILES.length} 个文件到 src/static/tag-diary`)
