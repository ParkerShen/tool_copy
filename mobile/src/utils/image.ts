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

function chooseFilesByUni(count: number): Promise<File[]> {
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

/*
 * H5 不经过 uni.chooseImage，自己维护一个常驻的 file input。
 *
 * uni 的 H5 实现在每次选择时新建 input，而且用户点「取消」时不会触发
 * change / fail，调用方的 Promise 会一直挂着，图片按钮的防重复状态也就
 * 永远解不开——表现就是第一次能打开相册，之后怎么点都没反应。
 * iOS 还要求 input 被复用并在每次点击前清空 value，否则第二次选择同
 * 一张照片不会触发 change。
 */
let nativeImageInput: HTMLInputElement | null = null
let cancelActivePicker: (() => void) | null = null

function ensureNativeImageInput(): HTMLInputElement {
  if (nativeImageInput) return nativeImageInput

  const input = document.createElement("input")
  input.type = "file"
  input.accept = "image/*"
  input.tabIndex = -1
  input.setAttribute("aria-hidden", "true")
  // 不能用 display:none / visibility:hidden，部分 iOS 版本会因此忽略 click()
  input.style.cssText =
    "position:fixed;left:-2000px;top:0;width:1px;height:1px;opacity:0;pointer-events:none;"
  document.body.appendChild(input)
  nativeImageInput = input
  return input
}

function chooseFilesFromInput(count: number): Promise<File[]> {
  cancelActivePicker?.()

  return new Promise((resolve) => {
    const input = ensureNativeImageInput()
    let settled = false
    let focusTimer = 0
    let timeoutTimer = 0

    const cleanup = (): void => {
      input.removeEventListener("change", onChange)
      input.removeEventListener("cancel", onCancel as EventListener)
      window.removeEventListener("focus", onWindowFocus)
      window.removeEventListener("pageshow", onWindowFocus)
      document.removeEventListener("visibilitychange", onVisibilityChange)
      window.clearTimeout(focusTimer)
      window.clearTimeout(timeoutTimer)
      if (cancelActivePicker === cancel) cancelActivePicker = null
    }

    const finish = (files: File[]): void => {
      if (settled) return
      settled = true
      cleanup()
      // 必须清空，否则再次选择同一张图片不会触发 change
      input.value = ""
      resolve(files.slice(0, count))
    }

    const cancel = (): void => finish([])

    function onChange(): void {
      finish(input.files ? Array.from(input.files) : [])
    }

    function onCancel(): void {
      finish([])
    }

    function onWindowFocus(): void {
      // 从相册返回时先等 change 事件；没有 change 就当作取消，
      // 让调用方可以继续响应下一次点击。
      window.clearTimeout(focusTimer)
      focusTimer = window.setTimeout(() => {
        if (!settled) finish(input.files ? Array.from(input.files) : [])
      }, 500)
    }

    function onVisibilityChange(): void {
      if (document.visibilityState === "visible") onWindowFocus()
    }

    input.multiple = count > 1
    input.value = ""
    input.addEventListener("change", onChange)
    input.addEventListener("cancel", onCancel as EventListener)
    window.addEventListener("focus", onWindowFocus)
    window.addEventListener("pageshow", onWindowFocus)
    document.addEventListener("visibilitychange", onVisibilityChange)

    // 兜底：长时间不返回也不要卡住按钮
    timeoutTimer = window.setTimeout(() => finish([]), 180000)

    cancelActivePicker = cancel
    try {
      input.click()
    } catch {
      finish([])
    }
  })
}

function canUseNativeFilePicker(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof document !== "undefined" &&
    typeof HTMLInputElement !== "undefined" &&
    !(window as unknown as { plus?: unknown }).plus
  )
}

function chooseFiles(count: number): Promise<File[]> {
  return canUseNativeFilePicker() ? chooseFilesFromInput(count) : chooseFilesByUni(count)
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
