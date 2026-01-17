export {}

declare module "vue" {
  type Hooks = App.AppInstance & Page.PageInstance
  interface ComponentCustomOptions extends Hooks {
    $uv?: any
  }
}

declare global {
  interface Uni {
    $uv?: any
  }
  interface Window {
    initAliyunCaptcha: (options: any) => void
    safari: any
  }
}
