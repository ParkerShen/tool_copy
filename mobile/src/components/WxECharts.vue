<!--
 * @Date: 2025-07-15 14:29:29
 * @LastEditors: parker 960822987@qq.com
 * @LastEditTime: 2025-07-15 14:29:39
 * @FilePath: \mobile\src\components\WxECharts.vue
-->
<template>
  <view>
    <ec-canvas :canvas-id="canvasId" :ec="ec" :force-use-old-canvas="true"></ec-canvas>
  </view>
</template>

<script setup>
import { ref } from "vue"
import * as echarts from "echarts"
import { ECOption } from "./echartsConfig"

const props = defineProps({
  option: Object,
  canvasId: { type: String, default: "chart" },
})

const ec = ref({
  onInit: initChart,
})

function initChart(canvas, width, height, dpr) {
  const chart = echarts.init(canvas, null, {
    width,
    height,
    devicePixelRatio: dpr,
  })
  canvas.setChart(chart)
  chart.setOption(props.option)
  return chart
}
</script>

<style scoped>
ec-canvas {
  width: 100%;
  height: 400px;
}
</style>
