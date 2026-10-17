/**
 * H5 软键盘高度：iPhone Safari 弹出键盘时不会改变 100vh，
 * 固定/底部布局会被键盘遮住。这里用 visualViewport 计算键盘实际占用高度，
 * 页面据此给底部内容留出空间。
 *
 * 非 H5 或浏览器不支持 visualViewport 时返回 0，不影响原有布局。
 */
import { onBeforeUnmount, ref } from "vue"

export function useKeyboardOffset() {
  const offset = ref(0)
  let attached = false

  function sync(): void {
    if (typeof window === "undefined") return
    const viewport = window.visualViewport
    if (!viewport) {
      offset.value = 0
      return
    }
    const hidden = window.innerHeight - viewport.height - viewport.offsetTop
    offset.value = Math.max(0, Math.round(hidden))
  }

  function attach(): void {
    if (attached || typeof window === "undefined") return
    attached = true
    window.visualViewport?.addEventListener("resize", sync)
    window.visualViewport?.addEventListener("scroll", sync)
    window.addEventListener("resize", sync)
    sync()
  }

  function detach(): void {
    if (!attached || typeof window === "undefined") return
    attached = false
    window.visualViewport?.removeEventListener("resize", sync)
    window.visualViewport?.removeEventListener("scroll", sync)
    window.removeEventListener("resize", sync)
    offset.value = 0
  }

  onBeforeUnmount(detach)

  return { offset, attach, detach }
}
