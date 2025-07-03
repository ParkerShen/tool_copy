import path from "node:path"
import dayjs from "dayjs"
import { defineConfig, loadEnv } from "vite"
import Uni from "@dcloudio/vite-plugin-uni"
// @see https://uni-helper.js.org/vite-plugin-uni-pages
import UniPages from "@uni-helper/vite-plugin-uni-pages"
// @see https://uni-helper.js.org/vite-plugin-uni-layouts
import UniLayouts from "@uni-helper/vite-plugin-uni-layouts"
// @see https://github.com/uni-helper/vite-plugin-uni-platform
// 需要与 @uni-helper/vite-plugin-uni-pages 插件一起使用
import UniPlatform from "@uni-helper/vite-plugin-uni-platform"
// @see https://github.com/uni-helper/vite-plugin-uni-manifest
import UniManifest from "@uni-helper/vite-plugin-uni-manifest"
// @see https://github.com/uni-helper/vite-plugin-uni-components
import Components from "@uni-helper/vite-plugin-uni-components"
// @see https://unocss.dev/
import UnoCSS from "unocss/vite"
// import autoprefixer from 'autoprefixer'
// @see https://github.com/jpkleemans/vite-svg-loader
import svgLoader from "vite-svg-loader"
// @see https://github.com/vbenjs/vite-plugin-svg-icons
import { createSvgIconsPlugin } from "vite-plugin-svg-icons"
// @see https://github.com/vbenjs/vite-plugin-vue-setup-extend
import vueSetupExtend from "vite-plugin-vue-setup-extend"
import AutoImport from "unplugin-auto-import/vite"
// import viteCompression from 'vite-plugin-compression'
import ViteRestart from "vite-plugin-restart"
import { visualizer } from "rollup-plugin-visualizer"
import imagemin from "./vite-plugins/imagemin"
import replace from "rollup-plugin-replace"

console.log("process.platform -> ", process.platform)

interface CommandOptions {
  command: string
  mode: string
}

// https://vitejs.dev/config/
export default (options: CommandOptions) => {
  // console.log(mode === process.env.NODE_ENV) // true
  const { command, mode } = options
  // mode: 区分生产环境还是开发环境
  console.log("command, mode -> ", command, mode)
  // pnpm dev:h5 时得到 => serve development
  // pnpm build:h5 时得到 => build production
  // pnpm dev:mp-weixin 时得到 => build development (注意区别，command为build)
  // pnpm build:mp-weixin 时得到 => build production

  // process.cwd(): 获取当前文件的目录跟地址
  // loadEnv(): 返回当前环境env文件中额外定义的变量
  const env = loadEnv(mode, path.resolve(process.cwd(), "env"))
  console.log("env -> ", env)
  console.log("process.env.UNI_PLATFORM: ", process.env.UNI_PLATFORM) // 得到 mp-weixin, h5, app 等
  console.log("isH5: ", process.env.UNI_PLATFORM === "h5") // 得到 mp-weixin, h5, app 等

  let baseUrl = "https://innoai-01.oss-cn-shenzhen.aliyuncs.com"

  if (process.env.UNI_PLATFORM === "h5") {
    baseUrl = mode === "development" ? env.VITE_BASE_OSS : env.VITE_BASE_OSS_API
  }

  return defineConfig({
    envDir: "./env", // 自定义env目录

    plugins: [
      UniPages({
        dts: "src/types/uni-pages.d.ts",
        exclude: ["**/components/**/**.*"],
        routeBlockLang: "json5", // 虽然设了默认值，但是vue文件还是要加上 lang="json5", 这样才能很好地格式化
        homePage: "pages/coupon/index",
        subPackages: ["src/pages-sub"], // 分包数组，可以配置多个
      }),
      UniLayouts(),
      UniPlatform(),
      UniManifest(),
      // 自动安装 src/components 里面的组件为全局组件，非全局组件不要放到 src/components
      Components({
        dts: "src/types/components.d.ts",
      }),
      // UniXXX 需要在 Uni 之前引入
      Uni(),
      UnoCSS(),
      // svg 可以当做组件来使用(Vite plugin to load SVG files as Vue components, using SVGO for optimization.)
      svgLoader({
        defaultImport: "url", // or 'raw'
      }),
      createSvgIconsPlugin({
        // 指定要缓存的文件夹
        iconDirs: [path.resolve(process.cwd(), "src/assets")],
        // 指定symbolId格式
        symbolId: "icon-[dir]-[name]",
      }),
      vueSetupExtend(),
      AutoImport({
        imports: ["vue", "uni-app"],
        dts: "src/types/auto-import.d.ts",
        dirs: ["src/hooks"], // 自动导入 hooks
        eslintrc: { enabled: false },
        vueTemplate: true, // default false
      }),

      // viteCompression(),
      ViteRestart({
        // 通过这个插件，在修改vite.config.js文件则不需要重新运行也生效配置
        restart: ["vite.config.js"],
      }),
      // h5环境增加编译时间
      process.env.UNI_PLATFORM === "h5" && {
        name: "html-transform",
        transformIndexHtml(html) {
          return html.replace("%BUILD_DATE%", dayjs().format("YYYY-MM-DD HH:mm:ss"))
        },
      },
      replace({
        "https://innoai-01.oss-cn-shenzhen.aliyuncs.com": baseUrl,
        preventAssignment: true as any, // 防止不必要的替换
      }),
      // 打包分析插件
      mode === "production" &&
        visualizer({
          filename: "./node_modules/.cache/visualizer/stats.html",
          open: true,
          gzipSize: true,
          brotliSize: true,
        }),
      // 这个图片压缩插件比较耗时，希望仅在生产环境使用
      // TODO: 缓存每次压缩过的图片，已经压缩过的不再压缩
      imagemin(mode !== "development"),
    ],

    css: {
      postcss: {
        plugins: [
          // autoprefixer({
          //   // 指定目标浏览器
          //   overrideBrowserslist: ['> 1%', 'last 2 versions'],
          // }),
        ],
      },
    },

    resolve: {
      alias: {
        "@": path.join(process.cwd(), "./src"),
        "@img": path.join(process.cwd(), "./src/static/images"),
      },
    },
    server: {
      host: "0.0.0.0",
      hmr: true,
      port: Number.parseInt(env.VITE_APP_PORT, 10),

      proxy: {
        /** 代理前缀为 /passport 的请求  */
        [env.VITE_APP_BASE_API_LOGIN]: {
          // 允许跨域
          changeOrigin: true,
          // 接口地址
          target: env.VITE_APP_API_URL_LOGIN,
          rewrite: (path) => path.replace(new RegExp("^" + env.VITE_APP_BASE_API_LOGIN), ""),
        },
        /** 代理前缀为 /language 的请求  */
        [env.VITE_APP_BASE_API_LANGUAGE]: {
          changeOrigin: true,
          target: env.VITE_APP_API_URL_LANGUAGE,
          rewrite: (path) => path.replace(new RegExp("^" + env.VITE_APP_BASE_API_LANGUAGE), ""),
        },
        /** 代理前缀为 /log 的请求  */
        [env.VITE_APP_BASE_API_LOG]: {
          changeOrigin: true,
          target: env.VITE_APP_API_URL_LOG,
          rewrite: (path) => path.replace(new RegExp("^" + env.VITE_APP_BASE_API_LOG), ""),
        },
        /** 代理前缀为 /resource 的请求  */
        [env.VITE_APP_BASE_API_RESOURCE]: {
          changeOrigin: true,
          target: env.VITE_APP_API_URL_RESOURCE,
          rewrite: (path) => path.replace(new RegExp("^" + env.VITE_APP_BASE_API_RESOURCE), ""),
        },
        /** 代理前缀为 /download 的请求  */
        [env.VITE_APP_BASE_API_DOWNLOAD]: {
          changeOrigin: true,
          target: env.VITE_APP_API_URL_DOWNLOAD,
          rewrite: (path) => path.replace(new RegExp("^" + env.VITE_APP_BASE_API_DOWNLOAD), ""),
        },
        /** 代理前缀为 /push 的请求  */
        [env.VITE_APP_BASE_API_PUSH]: {
          changeOrigin: true,
          target: env.VITE_APP_API_URL_PUSH,
          rewrite: (path) => path.replace(new RegExp("^" + env.VITE_APP_BASE_API_PUSH), ""),
        },
        /** 代理前缀为 /user 的请求  */
        [env.VITE_APP_BASE_API_USER]: {
          changeOrigin: true,
          target: env.VITE_APP_API_URL_USER,
          rewrite: (path) => path.replace(new RegExp("^" + env.VITE_APP_BASE_API_USER), ""),
        },
        /** 代理前缀为 /coupon 的请求  */
        [env.VITE_APP_BASE_API_COUPON]: {
          changeOrigin: true,
          target: env.VITE_APP_API_URL_COUPON,
          rewrite: (path) => path.replace(new RegExp("^" + env.VITE_APP_BASE_API_COUPON), ""),
        },
        /** 代理前缀为 /config 的请求  */
        [env.VITE_APP_BASE_API_CONFIG]: {
          changeOrigin: true,
          target: env.VITE_APP_API_URL_CONFIG,
          rewrite: (path) => path.replace(new RegExp("^" + env.VITE_APP_BASE_API_CONFIG), ""),
        },
        /** 代理前缀为 /activity 的请求  */
        [env.VITE_APP_BASE_API_ACTIVITY]: {
          changeOrigin: true,
          target: env.VITE_APP_API_URL_ACTIVITY,
          rewrite: (path) => path.replace(new RegExp("^" + env.VITE_APP_BASE_API_ACTIVITY), ""),
        },
        /** 代理前缀为 /qrcode 的请求  */
        [env.VITE_APP_BASE_API_QRCODE]: {
          changeOrigin: true,
          target: env.VITE_APP_API_URL_QRCODE,
          rewrite: (path) => path.replace(new RegExp("^" + env.VITE_APP_BASE_API_QRCODE), ""),
        },
        /** 代理前缀为 /app_mobile 的请求  */
        [env.VITE_APP_BASE_API_APPMOBILE]: {
          changeOrigin: true,
          target: env.VITE_APP_API_URL_APPMOBILE,
          rewrite: (path) => path.replace(new RegExp("^" + env.VITE_APP_BASE_API_APPMOBILE), ""),
        },
      },
    },
    build: {
      target: "es2015",
      minify: "terser",
      terserOptions: {
        compress: {
          drop_console: env.VITE_DELETE_CONSOLE === "true",
          drop_debugger: env.VITE_DELETE_CONSOLE === "true",
        },
      },
      // 解决windows系统对微信小程序自动关闭服务的问题
      watch:
        process.platform === "win32" // 检测是否为 windows 系统
          ? {
              exclude: ["node_modules/**", "/__uno.css"],
            }
          : null,
    },
  })
}
