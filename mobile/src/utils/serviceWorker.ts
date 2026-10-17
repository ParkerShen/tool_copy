/**
 * 注册 Service Worker（仅本地模式的生产构建）。
 *
 * Service Worker 只在安全上下文（HTTPS 或 localhost）可用；
 * 通过局域网 HTTP 打开时自动跳过，不影响页面使用。
 */
import { isLocalDataMode } from "@/api/bookkeeping"

export function registerServiceWorker(): void {
  if (!isLocalDataMode) return
  if (!import.meta.env.PROD) return
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return
  if (!window.isSecureContext) {
    console.info("[sw] 当前不是安全上下文，跳过 Service Worker 注册")
    return
  }

  const base = import.meta.env.BASE_URL || "/"
  const swUrl = `${base.endsWith("/") ? base : `${base}/`}sw.js`

  window.addEventListener("load", () => {
    navigator.serviceWorker.register(swUrl).catch((error) => {
      console.warn("[sw] 注册失败:", error)
    })
  })
}
