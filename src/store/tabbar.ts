/*
 * @Date: 2025-07-23 14:57:04
 * @LastEditors: parker 960822987@qq.com
 * @LastEditTime: 2025-07-23 14:57:11
 * @FilePath: \mobile\src\store\tabbar.js
 */
import { defineStore } from "pinia"

export const useTabbarStore = defineStore("tabbar", {
  state: () => ({
    activeIndex: 0,
    tabList: [
      {
        iconPath: "/static/tabbar/home.png",
        selectedIconPath: "/static/tabbar/home_active.png",
        pagePath: "pages/index/index",
        text: "首页",
      },
      {
        iconPath: "/static/tabbar/bookkeeping.png",
        selectedIconPath: "/static/tabbar/bookkeeping_active.png",
        pagePath: "pages/BookKeeping/index",
        text: "记账",
      },
      {
        iconPath: "/static/tabbar/calendar.png",
        selectedIconPath: "/static/tabbar/calendar_active.png",
        pagePath: "pages/DayMaster/index",
        text: "倒数日",
      },
      {
        iconPath: "/static/tabbar/write.png",
        selectedIconPath: "/static/tabbar/write_active.png",
        pagePath: "pages/Diary/index",
        text: "日记",
      },
      {
        iconPath: "/static/tabbar/user.png",
        selectedIconPath: "/static/tabbar/user_active.png",
        pagePath: "pages/my/index",
        text: "我的",
      },
    ],
  }),

  actions: {
    setActiveIndex(index) {
      this.activeIndex = index
    },

    // 根据页面路径设置当前激活的tab
    setActiveByPath(path) {
      const index = this.tabList.findIndex(
        (tab) => path.includes(tab.pagePath) || `/${tab.pagePath}` === path,
      )
      if (index !== -1) {
        this.activeIndex = index
      }
    },
  },
})
