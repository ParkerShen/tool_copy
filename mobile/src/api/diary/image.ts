/**
 * 日记图片选择与压缩。
 * H5 下压缩成 data URL 后随日记一起保存在 IndexedDB，刷新/离线下依然可见；
 * 小程序/App 下退回 uni.chooseImage，保存本地临时路径。
 */

const MAX_IMAGE_SIZE = 1600
const IMAGE_QUALITY = 0.82
const MAX_COUNT = 9

function readFileAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ""))
    reader.onerror = () => reject(reader.error || new Error("读取图片失败"))
    reader.readAsDataURL(file)
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error("图片加载失败"))
    image.src = src
  })
}

async function compressImageFile(file: File): Promise<string> {
  const dataUrl = await readFileAsDataUrl(file)
  const image = await loadImage(dataUrl)
  const maxSide = Math.max(image.width, image.height)
  const ratio = Math.min(1, MAX_IMAGE_SIZE / maxSide)
  // 尺寸和体积都不大时直接使用原图
  if (ratio >= 1 && file.size <= 1.2 * 1024 * 1024) return dataUrl

  const canvas = document.createElement("canvas")
  canvas.width = Math.max(1, Math.round(image.width * ratio))
  canvas.height = Math.max(1, Math.round(image.height * ratio))
  const context = canvas.getContext("2d")
  if (!context) return dataUrl
  context.fillStyle = "#ffffff"
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL("image/jpeg", IMAGE_QUALITY)
}

// #ifdef H5
function pickImagesOnH5(): Promise<string[]> {
  return new Promise((resolve) => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "image/*"
    input.multiple = true
    input.style.display = "none"

    let settled = false
    const finish = (values: string[]) => {
      if (settled) return
      settled = true
      if (input.parentNode) input.parentNode.removeChild(input)
      resolve(values)
    }

    input.onchange = async () => {
      const files = Array.from(input.files || []).slice(0, MAX_COUNT)
      if (!files.length) {
        finish([])
        return
      }
      const result: string[] = []
      for (const file of files) {
        try {
          result.push(await compressImageFile(file))
        } catch (error) {
          console.warn("[diary] 图片处理失败:", error)
        }
      }
      finish(result)
    }

    document.body.appendChild(input)
    input.click()

    // 用户取消选择时 onchange 不会触发，这里兜底结束等待
    window.addEventListener(
      "focus",
      () => {
        setTimeout(() => {
          if (!input.files || input.files.length === 0) finish([])
        }, 800)
      },
      { once: true },
    )
  })
}
// #endif

export async function pickDiaryImages(): Promise<string[]> {
  // #ifdef H5
  return pickImagesOnH5()
  // #endif

  // #ifndef H5
  // eslint-disable-next-line no-unreachable
  return new Promise((resolve) => {
    uni.chooseImage({
      count: MAX_COUNT,
      sizeType: ["compressed"],
      sourceType: ["album", "camera"],
      success: (result) => {
        resolve((result.tempFilePaths || []) as string[])
      },
      fail: () => resolve([]),
    })
  })
  // #endif
}
