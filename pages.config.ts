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
        pagePath: "pages/coupon/index",
        text: "优惠券领取专区",
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
