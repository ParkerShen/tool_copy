/**
 * 日记邮件通知。
 *
 * 浏览器不能直接连接 smtp.163.com，因此通过 EmailJS 代发：
 * 163 邮箱的 SMTP 授权码配置在 EmailJS 后台，前端只保存可公开的
 * Service ID / Template ID / Public Key。
 *
 * 发送失败不会影响日记保存：邮件会先进入本地队列，
 * 下次打开日记页或下次保存时自动重试。
 */
import { getMoodOption, getWeatherOption, type DiaryEntry } from "./types"

const EMAILJS_SEND_URL = "https://api.emailjs.com/api/v1.0/email/send"
const QUEUE_KEY = "local-diary:mail-queue"
const QUEUE_LIMIT = 100
const SEND_TIMEOUT = 15000

export interface DiaryMailParams {
  to_email: string
  subject: string
  date: string
  title: string
  mood: string
  weather: string
  tags: string
  content: string
  content_html: string
  images_count: number
  entry_id: string
}

interface DiaryMailQueueItem {
  entryId: string
  params: DiaryMailParams
  queuedAt: number
}

interface MailConfig {
  serviceId: string
  templateId: string
  publicKey: string
  toEmail: string
}

class EmailjsError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

function getMailConfig(): MailConfig {
  const env = import.meta.env
  return {
    serviceId: String(env.VITE_DIARY_MAIL_SERVICE_ID || "").trim(),
    templateId: String(env.VITE_DIARY_MAIL_TEMPLATE_ID || "").trim(),
    publicKey: String(env.VITE_DIARY_MAIL_PUBLIC_KEY || "").trim(),
    toEmail: String(env.VITE_DIARY_MAIL_TO || "shenjunxidiary@qq.com").trim(),
  }
}

/** 三个配置项都填了才会发邮件，否则整个功能静默跳过 */
export function isDiaryMailConfigured(): boolean {
  const { serviceId, templateId, publicKey } = getMailConfig()
  return !!serviceId && !!templateId && !!publicKey
}

function isOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false
}

/** 小程序/App 环境没有浏览器 fetch，直接跳过邮件功能 */
function isFetchAvailable(): boolean {
  return typeof fetch === "function"
}

function readQueue(): DiaryMailQueueItem[] {
  try {
    const raw = uni.getStorageSync(QUEUE_KEY)
    return Array.isArray(raw) ? (raw as DiaryMailQueueItem[]) : []
  } catch (error) {
    console.warn("[diary] 读取邮件队列失败:", error)
    return []
  }
}

function writeQueue(queue: DiaryMailQueueItem[]): void {
  try {
    uni.setStorageSync(QUEUE_KEY, queue)
  } catch (error) {
    console.warn("[diary] 写入邮件队列失败:", error)
  }
}

function entryTitle(entry: DiaryEntry): string {
  if (entry.title.trim()) return entry.title.trim()
  const firstLine = entry.content.trim().split("\n")[0] || ""
  return firstLine.slice(0, 20) || "无标题"
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export function buildDiaryMailParams(entry: DiaryEntry): DiaryMailParams {
  const mood = getMoodOption(entry.mood)
  const weather = getWeatherOption(entry.weather)
  return {
    to_email: getMailConfig().toEmail,
    subject: `【日记】${entry.date} · ${entryTitle(entry)}`,
    date: entry.date,
    title: entryTitle(entry),
    mood: mood ? `${mood.emoji} ${mood.label}` : "未记录",
    weather: weather ? `${weather.emoji} ${weather.label}` : "未记录",
    tags: entry.tags.length ? entry.tags.map((tag) => `#${tag}`).join(" ") : "无",
    content: entry.content.trim() || "（无正文）",
    content_html: escapeHtml(entry.content.trim() || "（无正文）").replace(/\n/g, "<br />"),
    images_count: entry.images.length,
    entry_id: entry.id,
  }
}

async function postToEmailjs(params: DiaryMailParams): Promise<void> {
  const { serviceId, templateId, publicKey } = getMailConfig()
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null
  const timer = controller ? setTimeout(() => controller.abort(), SEND_TIMEOUT) : null

  try {
    const response = await fetch(EMAILJS_SEND_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: serviceId,
        template_id: templateId,
        user_id: publicKey,
        template_params: params,
      }),
      signal: controller?.signal,
    })
    if (!response.ok) {
      const detail = await response.text().catch(() => "")
      throw new EmailjsError(`EmailJS ${response.status}: ${detail}`, response.status)
    }
  } finally {
    if (timer) clearTimeout(timer)
  }
}

let flushing: Promise<number> | null = null

async function doFlush(): Promise<number> {
  const queue = readQueue()
  let sent = 0

  while (queue.length) {
    const item = queue[0]
    try {
      await postToEmailjs(item.params)
    } catch (error) {
      const status = error instanceof EmailjsError ? error.status : 0
      // 4xx（429 除外）通常是模板/参数配置错误，重试也不会成功，丢弃避免堵住队列
      const permanent = status >= 400 && status < 500 && status !== 429
      console.warn("[diary] 邮件发送失败:", error)
      if (!permanent) break
    }
    queue.shift()
    writeQueue(queue)
    sent += 1
  }

  return sent
}

/** 重试邮件队列；并发调用会复用同一个发送过程 */
export function flushDiaryMailQueue(): Promise<number> {
  if (!isDiaryMailConfigured() || !isFetchAvailable() || isOffline()) return Promise.resolve(0)
  if (flushing) return flushing
  flushing = doFlush().finally(() => {
    flushing = null
  })
  return flushing
}

/**
 * 新建日记后调用：把邮件加入本地队列并尝试立即发送。
 * 即使发送失败也不影响日记本身已保存。
 */
export function queueDiaryMail(entry: DiaryEntry): void {
  if (!isDiaryMailConfigured() || !isFetchAvailable()) return

  const queue = readQueue()
  if (queue.some((item) => item.entryId === entry.id)) return

  queue.push({
    entryId: entry.id,
    params: buildDiaryMailParams(entry),
    queuedAt: Date.now(),
  })
  writeQueue(queue.slice(-QUEUE_LIMIT))
  flushDiaryMailQueue()
}
