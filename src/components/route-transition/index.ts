import { nextTick } from "vue"
import "./index.css"

const routeTransition = (vue: any) => {
  // #ifdef H5
  const cache: { path: string; scrollTop?: number }[] = JSON.parse(
    localStorage.getItem("routeCache") ?? "[]",
  )
  const app = document.getElementById("app") as HTMLElement
  const back = document.createElement("div")
  back.id = "back"
  let mode: string | null = null
  document.body.appendChild(back)
  nextTick(() => {
    vue.router.beforeEach((to: any, from: any) => {
      const scrollTop =
        window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0
      // 刷新
      if (!from.href) {
        cache.length = 0
        if (!to.meta.isTabBar) cache.push({ path: to.path })
        cache.push({ path: to.path })
        mode = null
      }
      // tabBar切换
      else if (to.meta.isTabBar && from.meta.isTabBar) {
        cache.splice(-1, 1, { path: to.path })
        mode = null
      }
      // 退出
      else if (cache.at(-2)?.path === to.path) {
        cache.pop()
        mode = "back"
      }
      // 进入
      else {
        //  缓存滚动条高度
        if (cache && Array.isArray(cache) && cache.length) {
          cache[cache.length - 1].scrollTop = scrollTop
          cache.push({ path: to.path, scrollTop: 0 })
          mode = "forward"
        }
      }
      localStorage.setItem("routeCache", JSON.stringify(cache))
      if (mode) {
        // 复制内容
        back.innerHTML = app.innerHTML
        // 保持滚动高度
        const warpper = back.querySelector<HTMLElement>("uni-page-wrapper")
        if (warpper) warpper.style.marginTop = -scrollTop + "px"
        // 底层退出
        back.classList.add(mode + "-leave")
        // 隐藏内容
        app.style.display = "none"
      }
    })
    vue.router.afterEach(() => {
      if (mode) {
        // 页面进入
        app.style.display = "block"
        app.classList.add(mode + "-enter")
        nextTick(() => {
          const scrollTop = cache.at(-1)?.scrollTop ?? 0
          const warpper = app.querySelector("uni-page-wrapper") as HTMLElement
          warpper.style.marginTop = -scrollTop + "px"
          setTimeout(() => {
            warpper.style.marginTop = "0"
            uni.pageScrollTo({ scrollTop, duration: 0 })
            app.classList.remove(mode + "-enter")
            back.classList.remove(mode + "-leave")
            back.innerHTML = ""
          }, 400)
        })
      }
    })
  })
  // #endif
}

export default routeTransition
