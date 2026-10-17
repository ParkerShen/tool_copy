import { createSSRApp } from "vue"
import App from "./App.vue"
import store from "./store"
import { routeInterceptor, requestInterceptor } from "./interceptors"
import i18n from "./locale/index"
import "virtual:svg-icons-register"
import "virtual:uno.css"
import "@/style/index.scss"
// import VConsole from "vconsole"
import routeTransition from "./components/route-transition/index"

// production mock server
// 线上报错，TODO: fix me
// if (import.meta.env.PROD) {
//   import('../mock/_mockProdServer').then(({ setupProdMockServer }) => {
//     console.log('mockProdServer...')
//     setupProdMockServer()
//   })
// }

// if (process.env.NODE_ENV === "development") {
//   const vconsole = new VConsole()
// }
export function createApp() {
  const app = createSSRApp(App)
  // #ifdef H5
  app.use(routeTransition)
  // #endif
  app.use(store)
  app.use(i18n)
  app.use(routeInterceptor)
  app.use(requestInterceptor)
  return {
    app,
  }
}
