import { http, uniFileUpload } from "@/utils/http"
import { FileInfo } from "./types"

/**
 * 头像上传接口
 *
 * @param data {file}
 * @returns
 */
export function uploadPortrait(data: any) {
  return uniFileUpload<FileInfo>({
    url: "/resource/home/upload/portrait_upload",
    method: "POST",
    name: "file",
    filePath: data.file.tempFilePath,
  })
}
