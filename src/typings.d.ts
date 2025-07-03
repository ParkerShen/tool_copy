/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */
// 全局要用的类型放到这里

type IResData<T> = {
  code: number
  msg: string
  desc: string
  data: T
}

// uni.uploadFile文件上传参数
type IUniUploadFileOptions = {
  file?: File
  files?: UniApp.UploadFileOptionFiles[]
  filePath?: string
  name?: string
  formData?: any
}

type IUserInfo = {
  nickname?: string
  avatar?: string
  /** 微信的 openid，非微信没有这个字段 */
  openid?: string
  token?: string
}

enum TestEnum {
  A = "a",
  B = "b",
}

/**
 * 分页查询参数
 */
interface PageQuery {
  limit?: number
  page?: number
  [property: string]: any
}

/**
 * 分页响应对象
 */
interface PageResult<T> {
  /** 数据列表 */
  list: T
  /** 总数 */
  total: number
  /** 默认语言 */
  app_language_default?: string
  /** 即将到期的数量 */
  expiring_number?: number
}

declare type Recordable<T = any> = Record<string, T>
