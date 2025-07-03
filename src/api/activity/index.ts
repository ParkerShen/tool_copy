import { http } from "@/utils/http"
import { ActivityPageResult, ActivityVo } from "./types"

/**
 * 获取活动分页数据
 */
export function getActivityList(queryParams?: any) {
  return http<ActivityPageResult>({
    url: "/activity/home/coupon_activity",
    method: "GET",
    query: queryParams,
  })
}

/**
 * 获取活动详情
 */
export function getActivityDetail(id?: string) {
  return http<ActivityVo>({
    url: "/activity/home/coupon_activity/" + id,
    method: "GET",
  })
}

/**
 * 参与活动
 */
export function joinActivity(id?: string) {
  return http<ActivityVo>({
    url: "/activity/home/coupon_activity/join/" + id,
    method: "POST",
  })
}
