#!/usr/bin/env node
/**
 * 上传前自检（standalone 构建）。
 *
 * 目标：在把 dist/build/h5 上传到 Cloudflare / Netlify 之前，
 * 发现会导致「个人数据泄露」「页面打不开」「更新后白屏」的问题。
 *
 * 用法：
 *   node scripts/preflight-standalone.mjs
 *   pnpm check:h5
 *
 * 退出码 0 表示通过（可能有警告），1 表示有错误、不要上传。
 */
import { readdir, readFile, stat } from "node:fs/promises"
import { extname, join, relative, resolve, sep } from "node:path"
import { dirname } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const outDir = resolve(root, "dist/build/h5")

const REQUIRED_FILES = [
  "index.html",
  "manifest.webmanifest",
  "sw.js",
  "static/sql/sql-wasm.js",
  "static/sql/sql-wasm.wasm",
  "static/tabbar/bookkeeping_active.png",
]

// 绝不允许出现在发布目录里的扩展名（.json 需要显式白名单）
const FORBIDDEN_EXTENSIONS = new Set([
  ".map",
  ".zip",
  ".sqlite",
  ".sqlite3",
  ".db",
  ".sql",
  ".env",
  ".md",
  ".csv",
  ".xlsx",
  ".xls",
  ".bak",
  ".log",
  ".tmp",
  ".pem",
  ".key",
  ".p12",
  ".pfx",
])

const ALLOWED_JSON = new Set([
  // 如果以后确实需要随包发布的 JSON，在这里写相对路径（相对 dist/build/h5）
])

// 文件名里出现这些片段，说明大概率是测试/备份/临时文件
const RISKY_NAME = /(^|[-_. ])(test|tests|tmp|temp|backup|bak|import|export|copy|demo|mock|sample)([-_. ]|$)/i
const RISKY_NAME_CN = /副本|草稿|备份|测试|临时/

const TEXT_EXTENSIONS = new Set([
  ".html",
  ".js",
  ".css",
  ".json",
  ".webmanifest",
  ".svg",
  ".txt",
  ".xml",
])

// 源码里出现这些内容视为个人数据/密钥泄露
const FORBIDDEN_TEXT = ["bookkeeping-import-from-xin", "__test-import", "BEGIN PRIVATE KEY"]

const MAX_FILE_SIZE = 25 * 1024 * 1024
const MAX_TOTAL_SIZE = 50 * 1024 * 1024
const WARN_TOTAL_SIZE = 12 * 1024 * 1024

const errors = []
const warnings = []
const notes = []

function fail(message) {
  errors.push(message)
}

function warn(message) {
  warnings.push(message)
}

function note(message) {
  notes.push(message)
}

function toPosix(path) {
  return path.split(sep).join("/")
}

async function exists(path) {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

async function walk(dir, files = []) {
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return files
  }
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

function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

async function checkRequiredFiles() {
  for (const relativePath of REQUIRED_FILES) {
    if (!(await exists(resolve(outDir, relativePath)))) {
      fail(`缺少必需文件：${relativePath}`)
    }
  }
}

async function checkFileList(files) {
  const stats = []
  let total = 0

  for (const file of files) {
    const relativePath = toPosix(relative(outDir, file))
    const info = await stat(file)
    total += info.size

    // 空的 .gitkeep / .css chunk 属于正常产物，其他空文件才值得提醒
    if (info.size === 0 && !relativePath.endsWith(".gitkeep") && !relativePath.endsWith(".css")) {
      warn(`空文件：${relativePath}`)
    }
    if (info.size > MAX_FILE_SIZE) {
      fail(`文件过大（${formatSize(info.size)}）：${relativePath}`)
    }

    const extension = extname(file).toLowerCase()
    if (FORBIDDEN_EXTENSIONS.has(extension)) {
      fail(`不允许发布该类型文件：${relativePath}`)
    }
    if (extension === ".json" && !ALLOWED_JSON.has(relativePath)) {
      fail(`发布目录里出现了 JSON 文件：${relativePath}（如确需发布，请加入脚本白名单）`)
    }
    // assets/ 是 Vite 生成的哈希产物，页面名里带 demo 之类属于正常情况，
    // 真正危险的是被手动放进根目录或 static/ 的数据文件
    const isGeneratedAsset = relativePath.startsWith("assets/")
    if (!isGeneratedAsset && (RISKY_NAME.test(relativePath) || RISKY_NAME_CN.test(relativePath))) {
      fail(`疑似测试/备份文件：${relativePath}`)
    }

    stats.push({ relativePath, size: info.size, extension })
  }

  if (total > MAX_TOTAL_SIZE) {
    fail(`产物体积 ${formatSize(total)} 超过上限 ${formatSize(MAX_TOTAL_SIZE)}`)
  } else if (total > WARN_TOTAL_SIZE) {
    warn(`产物体积 ${formatSize(total)} 偏大，上传和首次打开会变慢`)
  }

  note(`产物：${files.length} 个文件，共 ${formatSize(total)}`)
  return stats
}

async function checkTextContents(stats) {
  for (const { relativePath, extension } of stats) {
    if (!TEXT_EXTENSIONS.has(extension)) continue
    const content = await readFile(resolve(outDir, relativePath), "utf8")
    for (const needle of FORBIDDEN_TEXT) {
      if (content.includes(needle)) {
        fail(`产物 ${relativePath} 含有敏感内容「${needle}」`)
      }
    }
    if (/sourceMappingURL=/.test(content)) {
      warn(`产物包含 sourcemap 引用：${relativePath}`)
    }
  }
}

async function checkIndexHtml() {
  const indexPath = resolve(outDir, "index.html")
  if (!(await exists(indexPath))) return
  const html = await readFile(indexPath, "utf8")

  if (!html.includes('id="app"')) {
    fail("index.html 中找不到 #app 挂载点")
  }
  if (!html.includes("manifest.webmanifest")) {
    fail("index.html 没有引用 manifest.webmanifest，主屏幕图标/全屏会失效")
  }

  // 校验本地资源引用是否存在
  const references = new Set()
  const attributePattern = /(?:src|href)="([^"]+)"/g
  let match
  while ((match = attributePattern.exec(html))) {
    const value = match[1]
    if (!value || value.startsWith("http://") || value.startsWith("https://")) continue
    if (value.startsWith("data:") || value.startsWith("#")) continue
    references.add(value.split("?")[0])
  }

  for (const reference of references) {
    if (!reference.startsWith("/")) continue
    if (!(await exists(resolve(outDir, `.${reference}`)))) {
      fail(`index.html 引用的资源不存在：${reference}`)
    }
  }

  // 外部脚本在离线/国内网络下会拖慢甚至阻塞首屏
  const externalScript = /<script[^>]+src="https?:\/\/[^"]+"/i.exec(html)
  if (externalScript) {
    warn(`index.html 引用了外部脚本：${externalScript[0]}`)
  }
}

async function checkManifest() {
  const manifestPath = resolve(outDir, "manifest.webmanifest")
  if (!(await exists(manifestPath))) return
  try {
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"))
    if (!manifest.name || !manifest.start_url) {
      fail("manifest.webmanifest 缺少 name 或 start_url")
    }
    for (const icon of manifest.icons || []) {
      if (icon.src && !(await exists(resolve(outDir, icon.src.replace(/^\//, ""))))) {
        fail(`manifest 图标不存在：${icon.src}`)
      }
    }
  } catch (error) {
    fail(`manifest.webmanifest 不是合法 JSON：${error.message}`)
  }
}

async function checkServiceWorker() {
  const swPath = resolve(outDir, "sw.js")
  if (!(await exists(swPath))) return
  const sw = await readFile(swPath, "utf8")

  if (sw.includes("__VERSION__") || sw.includes("__PRECACHE__")) {
    fail("sw.js 里仍有未替换的占位符，postbuild 可能没有执行")
  }
  if (!sw.includes("skipWaiting")) {
    warn("sw.js 没有 skipWaiting()，更新后需要手动关闭页面才能生效")
  }
  if (!sw.includes("clients.claim")) {
    warn("sw.js 没有 clients.claim()")
  }

  const match = /const PRECACHE = (\[[\s\S]*?\])\r?\n/.exec(sw)
  if (!match) {
    fail("无法解析 sw.js 的预缓存列表")
    return
  }

  let precache
  try {
    precache = JSON.parse(match[1])
  } catch {
    fail("sw.js 的预缓存列表不是合法 JSON 数组")
    return
  }

  const missing = []
  for (const url of precache) {
    if (typeof url !== "string" || !url.startsWith("/")) continue
    const filePath = resolve(outDir, `.${url}`)
    if (!(await exists(filePath))) missing.push(url)
  }
  if (missing.length > 0) {
    fail(`sw.js 预缓存了 ${missing.length} 个不存在的文件：${missing.slice(0, 5).join(", ")}`)
  }

  for (const required of ["/static/sql/sql-wasm.js", "/static/sql/sql-wasm.wasm"]) {
    if (!precache.includes(required)) {
      fail(`sw.js 预缓存列表缺少 ${required}，离线时无法启动数据库`)
    }
  }

  note(`Service Worker 预缓存 ${precache.length} 项，全部存在`)
}

async function checkSqliteAssets() {
  const jsPath = resolve(outDir, "static/sql/sql-wasm.js")
  const wasmPath = resolve(outDir, "static/sql/sql-wasm.wasm")
  if (!(await exists(jsPath)) || !(await exists(wasmPath))) return

  const jsSize = (await stat(jsPath)).size
  const wasmSize = (await stat(wasmPath)).size
  if (jsSize < 10 * 1024) fail(`sql-wasm.js 只有 ${formatSize(jsSize)}，可能复制不完整`)
  if (wasmSize < 100 * 1024) fail(`sql-wasm.wasm 只有 ${formatSize(wasmSize)}，可能复制不完整`)
}

async function main() {
  console.log("[preflight] 开始检查 dist/build/h5")

  if (!(await exists(outDir))) {
    console.error("[preflight] 失败：找不到 dist/build/h5，请先执行 pnpm build:h5:standalone")
    process.exit(1)
  }

  const files = await walk(outDir)
  const stats = await checkFileList(files)

  await checkRequiredFiles()
  await checkTextContents(stats)
  await checkIndexHtml()
  await checkManifest()
  await checkServiceWorker()
  await checkSqliteAssets()

  for (const message of notes) console.log(`[preflight] ✓ ${message}`)

  if (warnings.length > 0) {
    console.warn(`[preflight] 警告 ${warnings.length} 项：`)
    for (const message of warnings) console.warn(`  - ${message}`)
  }

  if (errors.length > 0) {
    console.error(`[preflight] 发现 ${errors.length} 个错误，请不要上传：`)
    for (const message of errors) console.error(`  ✗ ${message}`)
    process.exit(1)
  }

  console.log("[preflight] 通过：可以上传 dist/build/h5")
}

main().catch((error) => {
  console.error("[preflight] 检查脚本自身出错:", error)
  process.exit(1)
})
