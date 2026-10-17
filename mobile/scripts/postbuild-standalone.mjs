#!/usr/bin/env node
/**
 * standalone（本地全栈）构建后处理：
 * 1. 校验输出目录；
 * 2. 删除只有小程序用的 echarts 静态文件；
 * 3. 生成 manifest.webmanifest；
 * 4. 根据产物内容生成 Service Worker（含预缓存列表与版本号）；
 * 5. 检查是否残留远程接口地址。
 *
 * 用法：node scripts/postbuild-standalone.mjs
 */
import { createHash } from "node:crypto"
import { readdir, readFile, rm, stat, writeFile } from "node:fs/promises"
import { dirname, extname, join, relative, resolve, sep } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const outDir = resolve(root, "dist/build/h5")
const indexPath = resolve(outDir, "index.html")

const TEXT_EXTENSIONS = new Set([".html", ".js", ".css", ".json", ".webmanifest", ".svg", ".txt"])

async function exists(path) {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

async function walk(dir, files = []) {
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      await walk(fullPath, files)
    } else if (entry.isFile()) {
      files.push(fullPath)
    }
  }
  return files
}

function toUrlPath(file) {
  return `/${relative(outDir, file).split(sep).join("/")}`
}

async function main() {
  if (!(await exists(indexPath))) {
    throw new Error(`未找到 ${indexPath}，请先执行 uni build --mode standalone`)
  }

  // 1. 清理小程序专用资源
  const echartsFile = resolve(outDir, "static/echarts.min.js")
  if (await exists(echartsFile)) {
    await rm(echartsFile)
    console.log("[postbuild] 已删除 static/echarts.min.js")
  }

  // 2. PWA manifest
  const manifest = {
    name: "本地记账",
    short_name: "本地记账",
    description: "接口、页面与 SQLite 数据库全部运行在手机上的本地记账应用",
    start_url: "./",
    scope: "./",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#ffc000",
    lang: "zh-Hans",
    icons: [
      {
        src: "static/tabbar/bookkeeping_active.png",
        sizes: "200x200",
        type: "image/png",
        purpose: "any",
      },
    ],
  }
  await writeFile(
    resolve(outDir, "manifest.webmanifest"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  )
  console.log("[postbuild] 已生成 manifest.webmanifest")

  // 3. 生成预缓存列表与内容哈希
  const files = await walk(outDir)
  const precache = files
    .filter((file) => !file.endsWith(`${sep}sw.js`))
    .map(toUrlPath)
    .sort()
  precache.push("/index.html")

  const hash = createHash("sha256")
  for (const file of files.sort()) {
    hash.update(relative(outDir, file))
    hash.update(await readFile(file))
  }
  const version = hash.digest("hex").slice(0, 12)

  const template = await readFile(resolve(root, "scripts/sw-template.js"), "utf8")
  const uniquePrecache = Array.from(new Set(precache))
  const sw = template
    .replace(
      'const CACHE_NAME = CACHE_PREFIX + "__VERSION__"',
      `const CACHE_NAME = CACHE_PREFIX + ${JSON.stringify(version)}`,
    )
    .replace("const PRECACHE = __PRECACHE__", `const PRECACHE = ${JSON.stringify(uniquePrecache, null, 2)}`)
  if (sw.includes("__VERSION__") || sw.includes("__PRECACHE__")) {
    throw new Error("sw.js 模板占位符没有被完全替换")
  }
  await writeFile(resolve(outDir, "sw.js"), sw, "utf8")
  console.log(`[postbuild] 已生成 sw.js（版本 ${version}，预缓存 ${uniquePrecache.length} 个文件）`)

  // 4. 检查是否残留远程接口地址
  const forbidden = ["api.guardforceai.cn", "/api/miniapp/bookkeepings"]
  const hits = []
  for (const file of files) {
    if (!TEXT_EXTENSIONS.has(extname(file).toLowerCase())) continue
    if (file.endsWith(`${sep}sw.js`)) continue
    const content = await readFile(file, "utf8")
    for (const needle of forbidden) {
      if (content.includes(needle)) {
        hits.push(`${relative(outDir, file)} -> ${needle}`)
      }
    }
  }

  if (hits.length > 0) {
    console.warn("[postbuild] 警告：产物中仍残留远程接口引用：")
    for (const hit of new Set(hits)) {
      console.warn(`  - ${hit}`)
    }
  } else {
    console.log("[postbuild] 未发现远程接口引用")
  }

  console.log("[postbuild] 完成，输出目录：dist/build/h5")
}

main().catch((error) => {
  console.error("[postbuild] 失败:", error)
  process.exit(1)
})
