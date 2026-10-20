/**
 * H5 / iOS 回弹锁。
 *
 * 只靠 CSS 的 overscroll-behavior 在旧版 iOS Safari 上不生效，
 * 这里再补一层触摸事件兜底：
 * - 页面已经到顶/到底时，阻止继续拖动，避免露出白边；
 * - 优先处理局部滚动容器（scroll-view / 弹层），到边界后不再把滚动链传给页面。
 *
 * 该文件只在 H5 启动时调用；原生 App / 小程序不会执行。
 */

const INTERACTIVE_SELECTOR =
  "input, textarea, select, [contenteditable='true'], " +
  "uni-picker, .uni-picker, .uni-picker-view, .wd-picker, .wd-slider, " +
  "[data-overscroll-lock='ignore']"

function isScrollableContainer(el: HTMLElement): boolean {
  if (el.scrollHeight <= el.clientHeight + 1) return false
  const { overflowY } = window.getComputedStyle(el)
  return overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay"
}

/** 从触摸目标向上找最近的可滚动区域 */
function findScrollableAncestor(target: EventTarget | null): HTMLElement | null {
  let node = target instanceof HTMLElement ? target : null
  while (node && node !== document.body && node !== document.documentElement) {
    if (isScrollableContainer(node)) return node
    node = node.parentElement
  }
  return null
}

function pageScrollTop(): number {
  return Math.max(
    window.scrollY || 0,
    document.documentElement.scrollTop || 0,
    document.body.scrollTop || 0,
  )
}

function pageMaxScrollTop(): number {
  const scroller = document.scrollingElement || document.documentElement
  return Math.max(0, scroller.scrollHeight - window.innerHeight)
}

function shouldBlockAtEdge(scrollTop: number, maxScrollTop: number, deltaY: number): boolean {
  if (deltaY > 0) return scrollTop <= 0
  if (deltaY < 0) return scrollTop >= maxScrollTop - 1
  return false
}

export function installOverscrollLock(): void {
  if (typeof document === "undefined") return

  let startX = 0
  let startY = 0

  document.addEventListener(
    "touchstart",
    (event) => {
      if (event.touches.length !== 1) return
      startX = event.touches[0].clientX
      startY = event.touches[0].clientY
    },
    { passive: true, capture: true },
  )

  document.addEventListener(
    "touchmove",
    (event) => {
      if (event.touches.length !== 1 || !event.cancelable) return
      // 组件自己已经处理过（例如日期滚轮、滑块）就不再插手
      if (event.defaultPrevented) return

      const target = event.target
      if (target instanceof Element && target.closest(INTERACTIVE_SELECTOR)) return

      const deltaX = event.touches[0].clientX - startX
      const deltaY = event.touches[0].clientY - startY
      // 只处理明确的纵向手势，避免影响横向滚动/滑动
      if (Math.abs(deltaY) <= Math.abs(deltaX) || Math.abs(deltaY) < 6) return

      const inner = findScrollableAncestor(target)
      if (inner) {
        const maxScrollTop = inner.scrollHeight - inner.clientHeight
        if (shouldBlockAtEdge(inner.scrollTop, maxScrollTop, deltaY)) {
          event.preventDefault()
        }
        return
      }

      if (shouldBlockAtEdge(pageScrollTop(), pageMaxScrollTop(), deltaY)) {
        event.preventDefault()
      }
    },
    { passive: false },
  )
}
