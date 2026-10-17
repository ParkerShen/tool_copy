<!--
 * @Date: 2025-07-14 20:50:23
 * @LastEditors: parker 960822987@qq.com
 * @LastEditTime: 2025-07-15 18:06:48
 * @FilePath: \mobile\src\components\BaseChart.vue
-->
<template>
  <div ref="chartDom" :style="{ width: width, height: height }"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from "vue"
import * as echarts from "echarts"

const props = defineProps({
  option: Object,
  width: { type: String, default: "100%" },
  height: { type: String, default: "400px" },
})

const chartDom = ref(null)
let chartInstance: any = null

// 初始化图表
const initChart = () => {
  if (chartDom.value) {
    // 添加类型断言
    chartInstance = (echarts as any).init(chartDom.value)
    chartInstance.setOption(props.option)
  }
}

// 响应式更新
watch(
  () => props.option,
  (newVal) => {
    if (chartInstance) {
      chartInstance.setOption(newVal)
    }
  },
  { deep: true },
)

// 窗口大小变化时重绘
const handleResize = () => {
  if (chartInstance) {
    chartInstance.resize()
  }
}

onMounted(() => {
  initChart()
  window.addEventListener("resize", handleResize)
})

onBeforeUnmount(() => {
  if (chartInstance) {
    window.removeEventListener("resize", handleResize)
    chartInstance.dispose()
  }
})
</script>
