/*
 * @Date: 2025-07-03 15:10:43
 * @LastEditors: parker 960822987@qq.com
 * @LastEditTime: 2025-07-11 16:48:20
 * @FilePath: \mobile\pages.config.ts
 */
import { defineUniPages } from "@uni-helper/vite-plugin-uni-pages"

export default defineUniPages({
  globalStyle: {
    navigationStyle: "default",
    navigationBarTitleText: "",
    navigationBarBackgroundColor: "#FFFFFF",
    navigationBarTextStyle: "black",
    backgroundColor: "#FFFFFF",
    h5: {
      navigationStyle: "custom",
    },
  },
  easycom: {
    autoscan: true,
    custom: {
      "^uni-(.*)": "@dcloudio/uni-ui/lib/uni-$1/uni-$1.vue",
      "^uv-(.*)": "@climblee/uv-ui/components/uv-$1/uv-$1.vue",
      "^wd-(.*)": "wot-design-uni/components/wd-$1/wd-$1.vue",
      "^(?!z-paging-refresh|z-paging-load-more)z-paging(.*)":
        "z-paging/components/z-paging$1/z-paging$1.vue",
    },
  },
  tabBar: {
    color: "#666666",
    selectedColor: "#E95412",
    backgroundColor: "#FFFFFF",
    borderStyle: "white",
    height: "88px",
    fontSize: "14px",
    iconWidth: "28px",
    spacing: "3px",
    list: [
      {
        iconPath: "static/tabbar/coupon.png",
        selectedIconPath: "static/tabbar/coupon_active.png",
        pagePath: "pages/index/index",
        text: "首页",
      },
      {
        iconPath: "static/tabbar/coupon.png",
        selectedIconPath: "static/tabbar/coupon_active.png",
        pagePath: "pages/BookKeeping/index",
        text: "记账",
      },
      {
        iconPath: "static/tabbar/coupon.png",
        selectedIconPath: "static/tabbar/coupon_active.png",
        pagePath: "pages/DayMaster/index",
        text: "倒数日",
      },
      {
        iconPath: "static/tabbar/coupon.png",
        selectedIconPath: "static/tabbar/coupon_active.png",
        pagePath: "pages/Diary/index",
        text: "日记",
      },
      {
        iconPath: "static/tabbar/my.png",
        selectedIconPath: "static/tabbar/my_active.png",
        pagePath: "pages/my/index",
        text: "我的",
      },
    ],
  },
})
