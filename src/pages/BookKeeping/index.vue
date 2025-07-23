<!--
 * @Date: 2025-07-11 16:18:38
 * @LastEditors: parker 960822987@qq.com
 * @LastEditTime: 2025-07-23 16:51:16
 * @FilePath: \mobile\src\pages\BookKeeping\index.vue
-->
<route lang="json5" type="page">
{
  layout: "default",
  style: {
    navigationBarTitleText: "记账",
    navigationBarBackgroundColor: "#FFFFFF",
  },
}
</route>

<template>
  <view class="container">
    <!-- 月份切换控制 -->
    <view class="month-control">
      <wd-icon name="arrow-left" @click="changeMonth(-1)"></wd-icon>
      <text class="month-text">{{ currentMonth.format("YYYY年MM月") }}</text>
      <wd-icon name="arrow-right" @click="changeMonth(1)"></wd-icon>
    </view>
    <!-- 收支统计卡片 -->
    <view class="stats-cards">
      <view class="stats-card income">
        <view class="stats-title">本月收入</view>
        <view class="stats-value">¥{{ formatNumber(incomeToday) }}</view>
      </view>
      <view class="stats-card expense">
        <view class="stats-title">本月支出</view>
        <view class="stats-value">¥{{ formatNumber(expenseToday) }}</view>
      </view>
    </view>
    <view class="bills-container">
      <!-- 记录分组1 -->
      <view class="day-group">
        <view class="day-header">
          <text>07月18日 星期五</text>
          <view>
            <text class="expense-label">支出：1</text>
          </view>
        </view>

        <!-- 具体记录 -->
        <view class="record-item">
          <view class="icon shopping"><wd-icon name="add-circle" /></view>
          <view class="record-info">
            <text class="type">购物</text>
            <text class="amount expense">-1</text>
          </view>
        </view>
      </view>

      <!-- 记录分组2 -->
      <view class="day-group">
        <view class="day-header">
          <text>07月17日 星期四</text>
          <view>
            <text class="income-label">收入：1</text>
            <text class="expense-label">支出：83.62</text>
          </view>
        </view>

        <!-- 具体记录 -->
        <view class="record-item">
          <view class="icon salary"><wd-icon name="circle" /></view>
          <view class="record-info">
            <text class="type">工资</text>
            <text class="amount income">1</text>
          </view>
        </view>

        <!-- 更多记录... -->
        <view class="record-item">
          <view class="icon entertainment"><wd-icon name="circle" /></view>
          <view class="record-info">
            <text class="type">腾讯会员</text>
            <text class="amount expense">-8.99</text>
          </view>
        </view>
        <!-- 其他记录结构类似... -->
      </view>
    </view>

    <!-- 图表区域 -->
    <view class="chart-container">
      <view class="chart-header">
        <view class="chart-title">本月统计</view>
        <view class="chart-toggle">
          <wd-button
            size="small"
            :type="chartMode === 'income' ? 'primary' : 'default'"
            @click="chartMode = 'income'"
          >
            收入
          </wd-button>
          <wd-button
            size="small"
            :type="chartMode === 'expense' ? 'warning' : 'default'"
            @click="chartMode = 'expense'"
          >
            支出
          </wd-button>
        </view>
      </view>
      <!-- 修复图表容器，添加条件渲染 -->
      <view class="chart-scroll-container">
        <scroll-view
          class="chart-scroll"
          scroll-x
          :scroll-left="scrollLeft"
          @scroll="onChartScroll"
          :enable-flex="true"
        >
          <view class="chart-wrapper">
            <BaseChart v-if="chartOption && xAxisLabels.length > 0" :option="chartOption" />
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- 弹窗 -->
    <wd-popup v-model="showPopup" position="bottom" round>
      <AmountInput @close="handleClosePopup" />
    </wd-popup>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from "vue"
import BaseChart from "@/components/BaseChart.vue"
import AmountInput from "@/pages/BookKeeping/components/AmountInput.vue"
import { onReady, onShow } from "@dcloudio/uni-app"
import dayjs from "dayjs"
import { useTabbarStore, useBookkeepingStore } from "@/store"

const tabbarStore = useTabbarStore()
const bookkeepingStore = useBookkeepingStore()

// 数据模型
const incomeToday = ref(2580)
const expenseToday = ref(1240)
const safeAreaInsets = ref(uni.getSystemInfoSync().safeAreaInsets || { bottom: 0 })
const showPopup = ref(false)

// 页面显示时检查是否需要显示添加弹窗
onShow(() => {
  console.log("onShow - shouldShowAdd:", bookkeepingStore.shouldShowAdd)
  if (bookkeepingStore.shouldShowAdd) {
    console.log("设置 showPopup 为 true")
    showPopup.value = true
    bookkeepingStore.setShouldShowAdd(false) // 重置标志
  }
})

// 监听事件总线
onMounted(() => {
  uni.$on("showBookkeepingPopup", () => {
    console.log("收到显示弹窗事件")
    showPopup.value = true
  })
})

// 页面卸载时移除监听
onUnmounted(() => {
  uni.$off("showBookkeepingPopup")
})

const handleClosePopup = () => {
  console.log("关闭弹窗")
  showPopup.value = false
}

// 账单数据
const recentBills = ref([
  {
    title: "午餐",
    date: "今天",
    time: "12:30",
    amount: -45,
    type: "expense",
    icon: "bag",
  },
  {
    title: "工资收入",
    date: "昨天",
    time: "09:00",
    amount: 8500,
    type: "income",
    icon: "card",
  },
  {
    title: "房租",
    date: "7月1日",
    time: "10:00",
    amount: -3000,
    type: "expense",
    icon: "home",
  },
  {
    title: "超市购物",
    date: "6月30日",
    time: "18:45",
    amount: -356,
    type: "expense",
    icon: "shop",
  },
  {
    title: "兼职收入",
    date: "6月28日",
    time: "15:20",
    amount: 1500,
    type: "income",
    icon: "wallet",
  },
])

// 图表数据
const incomeData = [1200, 2000, 1500, 3000, 2500, 2000, 1800, 2500, 2800, 3100, 3500, 8500]
const expenseData = [800, 1200, 1000, 1500, 2000, 2400, 3000, 2800, 2200, 1800, 1600, 1240]

// 格式化数字
const formatNumber = (num: number) => {
  return num.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")
}

// 状态管理
const currentMonth = ref(dayjs())
const chartMode = ref("expense") // 默认显示支出

// 数据结构重构成按月份存储
const monthlyData = ref({
  [currentMonth.value.format("YYYY-MM")]: {
    income: [2580],
    expense: [1240],
    dailyExpense: Array(dayjs().daysInMonth()).fill(0),
    dailyIncome: Array(dayjs().daysInMonth()).fill(0),
  },
})

// 计算本月天数
const daysInMonth = computed(() => {
  return dayjs(currentMonth.value).daysInMonth()
})

// 生成X轴日期标签 (1日, 2日,...)
const xAxisLabels = computed(() => {
  return Array.from({ length: daysInMonth.value }, (_, i) => `${i + 1}日`)
})

// 动态图表配置
const chartOption = computed(() => {
  const currentData = monthlyData.value[currentMonth.value.format("YYYY-MM")] || {
    dailyExpense: Array(daysInMonth.value).fill(0),
    dailyIncome: Array(daysInMonth.value).fill(0),
  }

  const today = dayjs().date()
  const isCurrentMonth = currentMonth.value.format("YYYY-MM") === dayjs().format("YYYY-MM")

  return {
    grid: { left: "3%", right: "4%", bottom: "15%" },
    xAxis: {
      type: "category",
      data: xAxisLabels.value,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: "#999",
        fontSize: 11,
      },
    },
    yAxis: {
      type: "value",
      minInterval: 1,
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: {
        lineStyle: {
          color: "#f0f0f0",
          type: "dashed",
        },
      },
    },
    series: [
      {
        type: "bar",
        barWidth: "60%",
        data: (chartMode.value === "income"
          ? currentData.dailyIncome
          : currentData.dailyExpense
        ).map((value, index) => ({
          value,
          itemStyle: {
            color: chartMode.value === "income" ? "#409eff" : "#ffae4c",
            borderRadius: [4, 4, 0, 0],
            // 今天的柱子添加边框
            ...(isCurrentMonth &&
              index + 1 === today && {
                borderColor: "#ff6b6b",
                borderWidth: 2,
                shadowColor: "rgba(255, 107, 107, 0.3)",
                shadowBlur: 8,
              }),
          },
        })),
        label: {
          show: true,
          position: "top",
          color: "#666",
          fontSize: 11,
          formatter: function (params) {
            // 今天的数据添加标记
            if (isCurrentMonth && params.dataIndex + 1 === today) {
              return `${params.value}\n●`
            }
            return params.value
          },
        },
        markLine: isCurrentMonth
          ? {
              silent: true,
              data: [
                {
                  xAxis: today - 1,
                  lineStyle: {
                    color: "#ff6b6b",
                    type: "dashed",
                    width: 1,
                  },
                  label: {
                    show: true,
                    position: "insideEndTop",
                    formatter: "今日",
                    color: "#ff6b6b",
                    fontSize: 10,
                  },
                },
              ],
            }
          : undefined,
      },
    ],
  }
})

// 切换月份功能
const changeMonth = (direction: number) => {
  currentMonth.value = dayjs(currentMonth.value).add(direction, "month")

  // 若不存在该月数据则初始化
  const monthKey = currentMonth.value.format("YYYY-MM")
  if (!monthlyData.value[monthKey]) {
    monthlyData.value[monthKey] = {
      income: [0],
      expense: [0],
      dailyExpense: Array(dayjs(currentMonth.value).daysInMonth()).fill(0),
      dailyIncome: Array(dayjs(currentMonth.value).daysInMonth()).fill(0),
    }
  }
}

// 初始化模拟数据（实际应用需替换为API请求）
onMounted(() => {
  // 为当前月生成测试数据
  const days = dayjs().daysInMonth()
  monthlyData.value[dayjs().format("YYYY-MM")] = {
    income: [2580],
    expense: [1240],
    dailyExpense: Array.from({ length: days }, () => Math.floor(Math.random() * 300)),
    dailyIncome: Array.from({ length: days }, () => Math.floor(Math.random() * 200)),
  }
  console.log("🚀 ~ monthlyData.value[dayjs ~ monthlyData.value:", monthlyData.value)

  // 生成上月/下月测试数据
  const prevMonth = dayjs().subtract(1, "month").format("YYYY-MM")
  monthlyData.value[prevMonth] = {
    income: [2300],
    expense: [1400],
    dailyExpense: Array(dayjs(prevMonth).daysInMonth())
      .fill(0)
      .map(() => Math.floor(Math.random() * 280)),
    dailyIncome: Array(dayjs(prevMonth).daysInMonth())
      .fill(0)
      .map(() => Math.floor(Math.random() * 180)),
  }

  const nextMonth = dayjs().add(1, "month").format("YYYY-MM")
  monthlyData.value[nextMonth] = {
    income: [2700],
    expense: [1300],
    dailyExpense: Array(dayjs(nextMonth).daysInMonth())
      .fill(0)
      .map(() => Math.floor(Math.random() * 320)),
    dailyIncome: Array(dayjs(nextMonth).daysInMonth())
      .fill(0)
      .map(() => Math.floor(Math.random() * 220)),
  }
})

// 页面准备就绪
onReady(() => {})

// 查看所有账单
const viewAllBills = () => {
  uni.navigateTo({
    url: "/pages/finance/bills",
  })
}

// 添加账单
const addBill = () => {
  uni.navigateTo({
    url: "/pages/finance/create",
  })
}

// 页面卸载时销毁图表
onUnmounted(() => {})

// 数字动画相关
const animatedIncome = ref(0)
const animatedExpense = ref(0)
const incomeAnimating = ref(false)
const expenseAnimating = ref(false)

// 改进的数字动画函数
const animateNumber = (target, setter, animatingFlag) => {
  animatingFlag.value = true
  let current = 0
  const duration = 1500 // 动画持续时间
  const steps = 60 // 动画步数
  const increment = target / steps
  const stepTime = duration / steps

  const timer = setInterval(() => {
    current += increment
    if (current >= target) {
      current = target
      clearInterval(timer)
      animatingFlag.value = false
    }
    setter(formatNumber(Math.floor(current)))
  }, stepTime)
}

// 页面挂载时启动动画
onMounted(() => {
  nextTick(() => {
    setTimeout(() => {
      mounted.value = true
      // 启动数字动画，添加延迟让卡片先出现
      setTimeout(() => {
        animateNumber(incomeToday.value, (val) => (animatedIncome.value = val), incomeAnimating)
      }, 600)
      setTimeout(() => {
        animateNumber(expenseToday.value, (val) => (animatedExpense.value = val), expenseAnimating)
      }, 800)
    }, 100)
  })
})
</script>

<style lang="scss">
.container {
  width: 93%;
  padding: 15px;
  background-color: #f7f8fa;
}

.stats-cards {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.stats-card {
  flex: 1;
  padding: 16px;

  // background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgb(0 0 0 / 5%);

  &.income {
    background-color: #409eff;
    border-top: 3px solid #409eff;
  }

  &.expense {
    background-color: #ffae4c;
    border-top: 3px solid #ffae4c;
  }
}

.stats-title {
  margin-bottom: 8px;
  font-size: 14px;
  color: white;
}

.stats-value {
  font-size: 24px;
  font-weight: 700;
  color: white;
}

.chart-container {
  padding: 16px;

  // box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  margin-bottom: 20px;
  background: #fff;
  border-radius: 12px;
}

.chart-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.chart-title {
  font-size: 18px;
  font-weight: 600;
}

.chart-toggle {
  display: flex;
  gap: 8px;
}

.chart {
  width: 100%;
  height: 250px;
  margin-top: 10px;
}

.bills-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 20px 0 12px;
}

.bills-title {
  font-size: 18px;
  font-weight: 600;
}

.bill-item {
  display: flex;
  align-items: center;
  padding: 8px;
  margin-bottom: 12px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgb(0 0 0 / 5%);
}

.bill-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  margin-right: 12px;
  background: #f2f6fc;
  border-radius: 8px;

  &.income {
    color: #409eff;
    background: rgb(64 158 255 / 10%);
  }

  &.expense {
    color: #ffae4c;
    background: rgb(255 174 76 / 10%);
  }
}

.bill-info {
  flex: 1;
}

.bill-title {
  margin-bottom: 4px;
  font-size: 15px;
  font-weight: 500;
}

.bill-date {
  font-size: 12px;
  color: #999;
}

.bill-amount {
  font-size: 16px;
  font-weight: 600;

  &.income {
    color: #409eff;
  }

  &.expense {
    color: #ffae4c;
  }
}

.month-control {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 15px 0;
  font-size: 18px;

  .wd-icon {
    padding: 8px;
    margin: 0 20px;
    font-size: 22px;
    background: #f0f5ff;
    border-radius: 50%;
  }

  .month-text {
    font-weight: 600;
  }
}

.fab {
  position: fixed;
  right: 10rpx;
  bottom: 200rpx;
  width: 100rpx;
  height: 100rpx;
  box-shadow: 0 8rpx 24rpx rgb(0 0 0 / 25%);
}
/* 容器样式 */
.bills-container {
  padding: 10rpx;
  margin-bottom: 15rpx;
  background-color: #fff;
  border-radius: 12rpx;
}
/* 日期分组样式 */
.day-group {
  margin-bottom: 30rpx;
  border-bottom: 1rpx solid #eee;

  // padding-bottom: 10rpx;
}

.day-header {
  display: flex;
  gap: 20rpx;
  justify-content: space-between;

  // background-color: #f8f8f8;
  // padding: 15rpx 20rpx;
  margin-bottom: 10rpx;
  font-size: 28rpx;
  color: #333;
  border-radius: 8rpx;
}

.income-label {
  color: #333;
}

.expense-label {
  color: #999;
}
/* 记录项样式 */
.record-item {
  display: flex;
  align-items: center;
  padding: 20rpx;

  // border-bottom: 1rpx solid #f5f5f5;
}

.icon {
  width: 64rpx;
  height: 64rpx;
  margin-right: 20rpx;
  border-radius: 50%;
}

.shopping {
  background-color: #ffd700; /* 购物图标-黄色 */
}

.salary {
  background-color: #4caf50; /* 工资图标-绿色 */
}

.entertainment {
  background-color: #2196f3; /* 娱乐图标-蓝色 */
}
/* 其他类型图标颜色... */
.food {
  background-color: #ff5722; /* 食物图标-橙色 */
}

.record-info {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: space-between;
}

.type {
  font-size: 32rpx;
  color: #000;
}

.amount {
  font-size: 32rpx;
  font-weight: 500;
}

.income {
  color: #000;
}

.expense {
  color: #999;
}

.record-item .icon {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36rpx;
  color: #fff;
}
</style>
