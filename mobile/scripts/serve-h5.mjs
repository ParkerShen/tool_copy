#!/usr/bin/env node
/**
 * 零依赖静态服务器，用于在局域网内用 iPhone 打开 H5 构建产物。
 *
 * 用法：
 *   node scripts/serve-h5.mjs [--port 8080] [--dir dist/build/h5]
 */
import { createReadStream } from "node:fs"
import { stat } from "node:fs/promises"
import { createServer } from "node:http"
import { networkInterfaces } from "node:os"
import { extname, join, normalize, resolve, sep } from "node:path"

const args = process.argv.slice(2)
function readArg(name, fallback) {
  const index = args.indexOf(`--${name}`)
  if (index >= 0 && args[index + 1]) return args[index + 1]
  return fallback
}

const port = Number(readArg("port", process.env.PORT || 8080))
const root = resolve(process.cwd(), readArg("dir", "dist/build/h5"))

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".wasm": "application/wasm",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".txt": "text/plain; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".sqlite": "application/x-sqlite3",
}

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0].split("#")[0])
  const normalized = normalize(decoded).replace(/^(\.\.[/\\])+/, "")
  const full = join(root, normalized)
  if (full !== root && !full.startsWith(root + sep)) {
    return null
  }
  return full
}

async function fileAt(path) {
  try {
    const info = await stat(path)
    if (info.isDirectory()) {
      const indexPath = join(path, "index.html")
      const indexInfo = await stat(indexPath).catch(() => null)
      return indexInfo?.isFile() ? { path: indexPath, size: indexInfo.size } : null
    }
    if (info.isFile()) return { path, size: info.size }
  } catch {
    return null
  }
  return null
}

function sendFile(req, res, file, statusCode = 200) {
  const ext = extname(file.path).toLowerCase()
  const name = file.path.split(sep).pop() || ""
  const headers = {
    "Content-Type": MIME[ext] || "application/octet-stream",
    "Content-Length": file.size,
    "X-Content-Type-Options": "nosniff",
  }

  if (name === "sw.js" || name === "index.html" || name === "manifest.webmanifest") {
    headers["Cache-Control"] = "no-store"
  } else if (file.path.includes(`${sep}assets${sep}`)) {
    headers["Cache-Control"] = "public, max-age=31536000, immutable"
  } else {
    headers["Cache-Control"] = "public, max-age=300"
  }

  res.writeHead(statusCode, headers)
  if (req.method === "HEAD") {
    res.end()
    return
  }
  createReadStream(file.path).pipe(res)
}

const server = createServer(async (req, res) => {
  if (!req.url) {
    res.writeHead(400).end("Bad Request")
    return
  }

  const filePath = safePath(req.url)
  if (!filePath) {
    res.writeHead(403).end("Forbidden")
    return
  }

  let file = await fileAt(filePath)

  // SPA 回退：无扩展名或未命中的路径返回 index.html
  if (!file) {
    const hasExtension = extname(filePath) !== ""
    if (!hasExtension) {
      file = await fileAt(join(root, "index.html"))
    }
  }

  if (!file) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not Found")
    return
  }

  sendFile(req, res, file)
})

server.listen(port, "0.0.0.0", () => {
  console.log("")
  console.log("本地记账 H5 已启动：")
  console.log(`  目录: ${root}`)
  console.log(`  本机: http://localhost:${port}`)

  const nets = networkInterfaces()
  const addresses = []
  for (const list of Object.values(nets)) {
    for (const net of list || []) {
      if (net.family === "IPv4" && !net.internal) {
        addresses.push(net.address)
      }
    }
  }

  if (addresses.length > 0) {
    console.log("  局域网（iPhone 与电脑需在同一 Wi-Fi）：")
    for (const address of addresses) {
      console.log(`    http://${address}:${port}`)
    }
  } else {
    console.log("  未找到局域网 IPv4 地址，请检查网络连接")
  }
  console.log("")
  console.log("提示：HTTP 下 Service Worker 不生效；离线能力需要 HTTPS 托管。")
  console.log("按 Ctrl+C 停止服务。")
})
