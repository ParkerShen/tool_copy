import path from "node:path"
import dayjs from "dayjs"
import { defineConfig, loadEnv } from "vite"
import Uni from "@dcloudio/vite-plugin-uni"
import UniPages from "@uni-helper/vite-plugin-uni-pages"
import UniLayouts from "@uni-helper/vite-plugin-uni-layouts"
import UniPlatform from "@uni-helper/vite-plugin-uni-platform"
import UniManifest from "@uni-helper/vite-plugin-uni-manifest"
import Components from "@uni-helper/vite-plugin-uni-components"
import UnoCSS from "unocss/vite"
import svgLoader from "vite-svg-loader"
import { createSvgIconsPlugin } from "vite-plugin-svg-icons"
import vueSetupExtend from "vite-plugin-vue-setup-extend"
import AutoImport from "unplugin-auto-import/vite"
import ViteRestart from "vite-plugin-restart"
import { visualizer } from "rollup-plugin-visualizer"
import imagemin from "./vite-plugins/imagemin"
import replace from "rollup-plugin-replace"

console.log("process.platform -> ", process.platform)

interface CommandOptions {
  command: string
  mode: string
}

export default (options: CommandOptions) => {
  const { command, mode } = options
  console.log("command, mode -> ", command, mode)

  const env = loadEnv(mode, path.resolve(process.cwd(), "env"))
  console.log("env -> ", env)
  console.log("process.env.UNI_PLATFORM: ", process.env.UNI_PLATFORM)
  console.log("isH5: ", process.env.UNI_PLATFORM === "h5")

  let baseUrl = "https://innoai-01.oss-cn-shenzhen.aliyuncs.com"

  if (process.env.UNI_PLATFORM === "h5") {
    baseUrl = mode === "development" ? env.VITE_BASE_OSS : env.VITE_BASE_OSS_API
  }

  return defineConfig({
    envDir: "./env",

    plugins: [
      UniPages({
        dts: "src/types/uni-pages.d.ts",
        exclude: ["**/components/**/**.*"],
        routeBlockLang: "json5",
        homePage: "pages/coupon/index",
        subPackages: ["src/pages-sub"],
      }),
      UniLayouts(),
      UniPlatform(),
      UniManifest(),
      Components({
        dts: "src/types/components.d.ts",
      }),
      Uni(),
      UnoCSS(),
      svgLoader({
        defaultImport: "url",
      }),
      createSvgIconsPlugin({
        iconDirs: [path.resolve(process.cwd(), "src/assets")],
        symbolId: "icon-[dir]-[name]",
      }),
      vueSetupExtend(),
      AutoImport({
        imports: ["vue", "uni-app"],
        dts: "src/types/auto-import.d.ts",
        dirs: ["src/hooks"],
        eslintrc: { enabled: false },
        vueTemplate: true,
      }),
      ViteRestart({
        restart: ["vite.config.js"],
      }),
      process.env.UNI_PLATFORM === "h5" && {
        name: "html-transform",
        transformIndexHtml(html) {
          return html.replace("%BUILD_DATE%", dayjs().format("YYYY-MM-DD HH:mm:ss"))
        },
      },
      replace({
        "https://innoai-01.oss-cn-shenzhen.aliyuncs.com": baseUrl,
        preventAssignment: true as any,
      }),
      mode === "production" &&
        visualizer({
          filename: "./node_modules/.cache/visualizer/stats.html",
          open: true,
          gzipSize: true,
          brotliSize: true,
        }),
      imagemin(mode !== "development"),
    ],

    css: {
      postcss: {
        plugins: [],
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
        "/api": {
          target: env.VITE_SERVER_BASEURL,
          changeOrigin: true,
          secure: false,
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
      watch:
        process.platform === "win32"
          ? {
              exclude: ["node_modules/**", "/__uno.css"],
            }
          : null,
    },
  })
}
