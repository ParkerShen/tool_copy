/**
 * 收纳二维码标签：生成物品深链、合成可保存的标签图。
 *
 * 应用是 H5 hash 路由（/#/pages/...），把链接直接编码进二维码，
 * iPhone 相机扫码后能打开 Safari 并落到物品详情页。
 * 二维码库按需动态导入，避免进入首屏包体。
 */

export interface QrLabelOptions {
  url: string
  name: string
  code: string
  location?: string
}

const LABEL_WIDTH = 600
const LABEL_HEIGHT = 840
const FONT_FAMILY =
  '-apple-system, BlinkMacSystemFont, "PingFang SC", "Helvetica Neue", Arial, sans-serif'

function appBase(): string {
  const { origin, pathname } = window.location
  const folder = pathname.endsWith("/") ? pathname : pathname.replace(/[^/]*$/, "")
  return `${origin}${folder}`
}

/** 物品二维码链接，形如 https://host/#/pages/Storage/item?id=xxx&code=000-001 */
export function buildItemUrl(id: string, code: string): string {
  return `${appBase()}#/pages/Storage/item?id=${encodeURIComponent(id)}&code=${encodeURIComponent(
    code,
  )}`
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error("二维码图片生成失败"))
    image.src = src
  })
}

function fitText(context: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (context.measureText(text).width <= maxWidth) return text
  let output = text
  while (output.length > 1 && context.measureText(`${output}…`).width > maxWidth) {
    output = output.slice(0, -1)
  }
  return `${output}…`
}

function drawCentered(
  context: CanvasRenderingContext2D,
  text: string,
  y: number,
  font: string,
  color: string,
): void {
  context.font = font
  context.fillStyle = color
  context.textAlign = "center"
  context.textBaseline = "middle"
  context.fillText(text, LABEL_WIDTH / 2, y)
}

/** 生成 600 × 840 的标签 PNG（data URL） */
export async function generateQrLabel(options: QrLabelOptions): Promise<string> {
  const QRCode = (await import("qrcode")).default
  const qrDataUrl = await QRCode.toDataURL(options.url, {
    width: 440,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#1f2329", light: "#ffffff" },
  })
  const qrImage = await loadImageElement(qrDataUrl)

  const canvas = document.createElement("canvas")
  canvas.width = LABEL_WIDTH
  canvas.height = LABEL_HEIGHT
  const context = canvas.getContext("2d")
  if (!context) throw new Error("当前浏览器无法生成标签")

  context.fillStyle = "#ffffff"
  context.fillRect(0, 0, LABEL_WIDTH, LABEL_HEIGHT)

  // 顶部品牌色条
  context.fillStyle = "#2ba471"
  context.fillRect(0, 0, LABEL_WIDTH, 14)

  // 二维码
  context.drawImage(qrImage, 80, 70, 440, 440)

  // 分隔线
  context.strokeStyle = "#eef0f2"
  context.lineWidth = 2
  context.beginPath()
  context.moveTo(60, 548)
  context.lineTo(LABEL_WIDTH - 60, 548)
  context.stroke()

  context.font = `600 36px ${FONT_FAMILY}`
  const name = fitText(context, options.name || "未命名物品", 500)
  drawCentered(context, name, 610, `600 36px ${FONT_FAMILY}`, "#1f2329")
  drawCentered(context, options.code, 668, `700 28px "SFMono-Regular", Menlo, monospace`, "#1f8f5f")

  if (options.location) {
    context.font = `400 24px ${FONT_FAMILY}`
    const location = fitText(context, options.location, 500)
    drawCentered(context, location, 718, `400 24px ${FONT_FAMILY}`, "#8f959e")
  }

  drawCentered(context, "扫码查看物品详情", 790, `400 20px ${FONT_FAMILY}`, "#b4b9c1")

  return canvas.toDataURL("image/png")
}

function dataUrlToFile(dataUrl: string, filename: string): File {
  const [header, base64] = dataUrl.split(",")
  const mime = /data:([^;]+)/.exec(header || "")?.[1] || "image/png"
  const binary = atob(base64 || "")
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return new File([bytes], filename, { type: mime })
}

/**
 * 优先调用系统分享（iPhone 可直接存到相册），
 * 不支持时退化为浏览器下载。用户取消分享时不下载。
 */
export async function shareOrSaveImage(
  dataUrl: string,
  filename: string,
): Promise<"shared" | "saved" | "cancelled"> {
  const file = dataUrlToFile(dataUrl, filename)
  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean
  }

  if (typeof nav.share === "function" && typeof nav.canShare === "function") {
    if (nav.canShare({ files: [file] })) {
      try {
        await nav.share({ files: [file], title: filename })
        return "shared"
      } catch (error) {
        if ((error as { name?: string } | null)?.name === "AbortError") return "cancelled"
      }
    }
  }

  const link = document.createElement("a")
  link.href = dataUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  return "saved"
}

/** 复制文本；非安全上下文下退回 textarea + execCommand */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // fall through
  }

  try {
    const area = document.createElement("textarea")
    area.value = text
    area.style.cssText = "position:fixed;left:-2000px;top:0;opacity:0;"
    document.body.appendChild(area)
    area.select()
    const ok = document.execCommand("copy")
    area.remove()
    return ok
  } catch {
    return false
  }
}
