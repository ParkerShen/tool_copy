import { http } from "@/utils/http"
import {
  AgreementData,
  CountrysResult,
  LoginData,
  LoginResult,
  RegCaptchaData,
  RegCaptchaResult,
  SigninData,
  SigninResult,
  UserData,
  UpdatePhoneData,
  UpdateEmailData,
  WxLoginData,
  WxLoginResult,
  WxLoginOrRegData,
  WxLoginOrRegResult,
  AgreementVersionData,
} from "./types"

/**
 * 登录
 *
 * @param data {LoginData}
 * @returns
 */
export function loginApi(data: LoginData) {
  return http<LoginResult>({
    url: "/user/home/session/login",
    method: "PUT",
    data,
  })
}

/**
 * 微信小程序授权过手机号的登录
 *
 * @param data {WxLoginData}
 * @returns
 */
export function loginWxApi(data: WxLoginData) {
  return http<WxLoginResult>({
    url: "/user/home/session/wx_mini_code",
    method: "GET",
    data,
  })
}

/**
 * 微信小程序未授权过手机号的登录
 *
 * @param data {WxLoginData}
 * @returns
 */
export function loginWxOrRegApi(data: WxLoginOrRegData) {
  return http<WxLoginOrRegResult>({
    url: "/user/home/session/wx_mini_login_or_reg",
    method: "POST",
    data,
  })
}

/**
 * 注册
 *
 * @param data {SiginResult}
 * @returns
 */
export function signinApi(data: SigninData) {
  return http<SigninResult>({
    url: "/user/home/session/reg",
    method: "POST",
    data,
  })
}

/**
 * 注销API
 */
export function logoutApi() {
  return http({
    url: "/passport/admin/session/logout",
    method: "PUT",
  })
}

/**
 * 注册验证码
 */
export function getRegCaptcha(data: RegCaptchaData) {
  return http<RegCaptchaResult>({
    url: "/user/home/captcha/reg",
    method: "POST",
    data,
  })
}

/**
 * 忘记密码验证码
 */
export function getForgotCaptcha(data: RegCaptchaData) {
  return http<RegCaptchaResult>({
    url: "/user/home/captcha/forget",
    method: "POST",
    data,
  })
}

/**
 * 校验忘记密码验证码
 */
export function checkForgotCaptcha(data: SigninData) {
  return http<SigninResult>({
    url: "/user/home/captcha/check_forget_captcha",
    method: "POST",
    data,
  })
}

/**
 * 获取验证码配置
 */
export function getCaptchaConfig() {
  return http<{ interval: number }>({
    url: `/user/home/session/get_catpcha_config`,
    method: "GET",
  })
}

/**
 * 重置密码
 */
export function resetPassword(password: string) {
  return http({
    url: "/user/home/user/reset_password",
    method: "PUT",
    data: {
      password,
    },
  })
}

/**
 * 获取国家或地区列表
 */
export function getCountrys(lang: string) {
  // return http<CountrysResult[]>({
  //   url: `/download/language_doc/country-code-${lang}.json`,
  //   method: "GET",
  // })
  return new Promise((resolve) => {
    wx.request({
      url: `https://innoai-01.oss-cn-shenzhen.aliyuncs.com/language_doc/country-code-${lang}.json?t=20240808`,
      data: {},
      header: {
        "content-type": "application/json",
      },
      success(res) {
        resolve(res.data)
      },
    })
  })
}

/**
 * 获取用户信息
 */
export function getUserInfo() {
  return http<UserData>({
    url: "/user/home/user/info",
    method: "GET",
  })
}

/**
 * 修改用户信息
 */
export function putUserInfo(data: { [key: string]: any }) {
  return http({
    url: "/user/home/user",
    method: "PUT",
    data,
  })
}

/**
 * 修改手机
 */
export function putUserPhone(data: UpdatePhoneData) {
  return http({
    url: "/user/home/user/update_phone",
    method: "PUT",
    data,
  })
}

/**
 * 修改邮箱
 */
export function putUserEmail(data: UpdateEmailData) {
  return http({
    url: "/user/home/user/update_email",
    method: "PUT",
    data,
  })
}

/**
 * 修改手机验证码
 */
export function getUpdatePhoneCaptcha(data: RegCaptchaData) {
  return http<RegCaptchaResult>({
    url: "/user/home/captcha/update_phone",
    method: "POST",
    data,
  })
}

/**
 * 修改邮箱验证码
 */
export function getUpdateEmailCaptcha(data: RegCaptchaData) {
  return http<RegCaptchaResult>({
    url: "/user/home/captcha/update_email",
    method: "POST",
    data,
  })
}

/**
 * 获取用户协议、隐私
 */
export function getAgreementData(url: string) {
  return new Promise((resolve, reject) => {
    wx.request({
      url,
      data: {},
      header: {
        "content-type": "text/plain",
      },
      success(res) {
        resolve(res.data)
      },
    })
  })
}

/**
 * 获取用户注册协议版本
 */
export function getAgreementVersion() {
  return http<AgreementVersionData>({
    url: "/a-mobile/home/agreement/regist_agreement_version",
    method: "GET",
  })
}
