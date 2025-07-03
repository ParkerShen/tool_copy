import { http } from "@/utils/http"
import {
  CouponPageResult,
  CouponQrcodeVo,
  CouponRecordPageResult,
  CouponRecordVo,
  CouponVo,
  StoreCategoryVo,
} from "./types"

/**
 * 获取券包分页数据
 */
export function getCouponRecordList(queryParams?: PageQuery) {
  return http<CouponRecordPageResult>({
    url: "/a-mobile/home/coupon_record",
    method: "GET",
    query: queryParams,
  })
}

/**
 * 获取券包详情
 */
export function getCouponRecordDetail(id?: string) {
  return http<CouponRecordVo>({
    url: "/a-mobile/home/coupon_record/" + id,
    method: "GET",
  })
}

/**
 * 获取二维码
 */
export function getQrcodeBlob(id?: string) {
  return http<CouponRecordVo>({
    url: "/qr_code/home/qr_code/download/" + id,
    method: "GET",
    responseType: "text",
  })
}

/**
 * 解析二维码
 */
export function analyzeQrcode(id?: string) {
  return http<{ navigate?: string }>({
    url: "/qr_code/public/qr_code/parse/inside/" + id,
    method: "GET",
  })
}

/**
 * 获取店铺一级分类
 */
export function getStoreCategoryList() {
  return http<StoreCategoryVo[]>({
    url: "/a-mobile/home/coupon/query_store_category",
    method: "GET",
  })
}

/**
 * 获取优惠券列表
 */
export function getCouponList(queryParams?: PageQuery) {
  return http<CouponPageResult>({
    url: "/a-mobile/home/coupon/query_coupons",
    method: "GET",
    query: queryParams,
  })
}

/**
 * 获取优惠券详情
 */
export function getCouponDetail(id?: string) {
  return http<CouponVo>({
    url: "/a-mobile/home/coupon/" + id,
    method: "GET",
  })
}

/**
 * 领取优惠券
 */
export function receiveCoupon(data: { coupon_id: string; device_name?: string }) {
  return http<CouponVo>({
    url: "/a-mobile/home/coupon/receive",
    method: "POST",
    data,
  })
}

/**
 * 二维码解析
 */

export function parseQrcode(id: string) {
  return http<CouponQrcodeVo>({
    url: "/a-mobile/home/qr_code/parse_promotion/" + id,
    method: "GET",
  })
}
