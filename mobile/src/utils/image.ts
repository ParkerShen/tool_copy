/**
 * 记账图片：选图 → 压缩成 JPEG data URL。
 *
 * 图片直接存进 SQLite 的 images 字段（JSON 数组），
 * 这样导出 .sqlite / JSON 备份时会一起带走，不依赖任何外部文件。
 * iPhone 拍的原图动辄几 MB，这里统一缩到长边 1280、约 300–400 KB。
 */

const MAX_EDGE = 1280
const TARGET_BYTES = 420 * 1024
const HARD_BYTES = 900 * 1024

function estimateDataUrlBytes(dataUrl: string): number {
  const index = dataUrl.indexOf(",")
  const base64 = index >= 0 ? dataUrl.slice(index + 1) : dataUrl
  return Math.floor((base64.length * 3) / 4)
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ""))
    reader.onerror = () => reject(new Error("读取图片失败"))
    reader.readAsDataURL(file)
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error("图片无法识别"))
    image.src = src
  })
}

function renderJpeg(image: HTMLImageElement, maxEdge: number, quality: number): string {
  const scale = Math.min(1, maxEdge / Math.max(image.width || 1, image.height || 1))
  const width = Math.max(1, Math.round((image.width || 1) * scale))
  const height = Math.max(1, Math.round((image.height || 1) * scale))

  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext("2d")
  if (!context) throw new Error("当前浏览器无法处理图片")

  // 透明 PNG 转 JPEG 时先铺白底，避免变成黑底
  context.fillStyle = "#ffffff"
  context.fillRect(0, 0, width, height)
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = "high"
  context.drawImage(image, 0, 0, width, height)
  return canvas.toDataURL("image/jpeg", quality)
}

/** 压缩单张图片，返回 data:image/jpeg;base64,... */
export async function compressImage(file: File): Promise<string> {
  const source = await readFileAsDataUrl(file)
  const image = await loadImage(source)

  let maxEdge = MAX_EDGE
  let quality = 0.72
  let output = renderJpeg(image, maxEdge, quality)

  for (let i = 0; i < 8 && estimateDataUrlBytes(output) > TARGET_BYTES; i += 1) {
    if (maxEdge > 720) {
      maxEdge = Math.max(720, Math.round(maxEdge * 0.85))
    } else {
      quality = Math.max(0.42, quality - 0.08)
    }
    output = renderJpeg(image, maxEdge, quality)
  }

  if (estimateDataUrlBytes(output) > HARD_BYTES) {
    throw new Error("图片太大，请换一张或先裁剪")
  }
  return output
}

function chooseFiles(count: number): Promise<File[]> {
  return new Promise((resolve, reject) => {
    uni.chooseImage({
      count,
      sizeType: ["compressed"],
      sourceType: ["album", "camera"],
      success: async (result) => {
        const response = result as unknown as {
          tempFiles?: unknown[]
          tempFilePaths?: string[]
        }
        const maybeFiles = response.tempFiles || []
        if (
          typeof File !== "undefined" &&
          maybeFiles.length > 0 &&
          maybeFiles[0] instanceof File
        ) {
          resolve((maybeFiles as File[]).slice(0, count))
          return
        }

        // 部分环境只返回临时路径（blob:），转成 File 后再压缩
        const paths = response.tempFilePaths || []
        try {
          const files: File[] = []
          for (const path of paths.slice(0, count)) {
            const blob = await fetch(path).then((item) => item.blob())
            files.push(
              new File([blob], `image-${files.length + 1}.jpg`, {
                type: blob.type || "image/jpeg",
              }),
            )
          }
          resolve(files)
        } catch {
          reject(new Error("读取图片失败，请重试"))
        }
      },
      fail: (error) => {
        const message = String((error as { errMsg?: string })?.errMsg || "")
        if (/cancel/i.test(message)) {
          resolve([])
          return
        }
        reject(new Error(message || "选择图片失败"))
      },
    })
  })
}

/** 选择并压缩最多 count 张图片 */
export async function chooseCompressedImages(count: number): Promise<string[]> {
  if (count <= 0) return []
  const files = await chooseFiles(count)
  const images: string[] = []
  for (const file of files) {
    if (file.type && !/^image\//i.test(file.type)) continue
    images.push(await compressImage(file))
  }
  return images
}
