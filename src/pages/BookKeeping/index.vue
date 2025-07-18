<!--
 * @Date: 2025-07-11 16:18:38
 * @LastEditors: parker 960822987@qq.com
 * @LastEditTime: 2025-07-18 17:24:14
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
      <!-- 条件编译实现跨平台 -->
      <!-- #ifdef H5 || APP -->
      <BaseChart :option="chartOption" />
      <!-- #endif -->
      <!-- #ifdef MP-WEIXIN -->
      <BaseChart :option="chartOption" />
      <!-- #endif -->
    </view>

    <!-- 悬浮按钮 -->
    <wd-button
      class="fab"
      :style="{ position: 'fixed', right: '20px' }"
      type="primary"
      shape="circle"
      size="large"
      @click="showPopup = true"
    >
      <wd-icon name="add" size="22px"></wd-icon>
    </wd-button>
    <wd-popup v-model="showPopup" position="bottom" round>
      <AmountInput @close="handleClosePopup" />
    </wd-popup>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from "vue"
import BaseChart from "@/components/BaseChart.vue"
import AmountInput from "@/pages/BookKeeping/components/AmountInput.vue"
import { onReady } from "@dcloudio/uni-app"
import dayjs from "dayjs"

// 数据模型
const incomeToday = ref(2580)
const expenseToday = ref(1240)
const safeAreaInsets = ref(uni.getSystemInfoSync().safeAreaInsets || { bottom: 0 })
const showPopup = ref(false)
const handleClosePopup = () => {
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

  return {
    grid: { left: "3%", right: "4%", bottom: "15%" },
    xAxis: {
      type: "category",
      data: xAxisLabels.value,
      // axisLabel: {
      //   interval: Math.max(1, Math.floor(daysInMonth.value / 7)) // 动态调整标签密度
      // }
    },
    yAxis: {
      type: "value",
      minInterval: 1,
    },
    dataZoom: [],
    series: [
      {
        type: "bar",
        data: chartMode.value === "income" ? currentData.dailyIncome : currentData.dailyExpense,
        itemStyle: {
          color: chartMode.value === "income" ? "#409eff" : "#ffae4c",
        },
        label: {
          show: true,
          position: "top",
          color: "#333",
          fontSize: 12,
        },
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
</script>

<style lang="scss">
.container {
  padding: 15px;
  width: 93%;
  background-color: #f7f8fa;
}

.stats-cards {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.stats-card {
  flex: 1;
  // background: #fff;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);

  &.income {
    border-top: 3px solid #409eff;

    background-color: #409eff;
  }

  &.expense {
    border-top: 3px solid #ffae4c;
    background-color: #ffae4c;
  }
}

.stats-title {
  font-size: 14px;
  color: white;
  margin-bottom: 8px;
}

.stats-value {
  font-size: 24px;
  font-weight: 700;
  color: white;
}

.chart-container {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  // box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  margin-bottom: 20px;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
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
  justify-content: space-between;
  align-items: center;
  margin: 20px 0 12px;
}

.bills-title {
  font-size: 18px;
  font-weight: 600;
}

.bill-item {
  display: flex;
  background: #fff;
  border-radius: 12px;
  padding: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  margin-bottom: 12px;
  align-items: center;
}

.bill-icon {
  width: 36px;
  height: 36px;
  background: #f2f6fc;
  border-radius: 8px;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-right: 12px;

  &.income {
    background: rgba(64, 158, 255, 0.1);
    color: #409eff;
  }

  &.expense {
    background: rgba(255, 174, 76, 0.1);
    color: #ffae4c;
  }
}

.bill-info {
  flex: 1;
}

.bill-title {
  font-size: 15px;
  font-weight: 500;
  margin-bottom: 4px;
}

.bill-date {
  font-size: 12px;
  color: #999;
}

.bill-amount {
  font-weight: 600;
  font-size: 16px;

  &.income {
    color: #409eff;
  }

  &.expense {
    color: #ffae4c;
  }
}

.month-control {
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 15px 0;
  font-size: 18px;

  .wd-icon {
    font-size: 22px;
    margin: 0 20px;
    padding: 8px;
    border-radius: 50%;
    background: #f0f5ff;
  }

  .month-text {
    font-weight: 600;
  }
}

.fab {
  position: fixed;
  width: 100rpx;
  height: 100rpx;
  bottom: 200rpx;
  right: 10rpx;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.25);
}

/* 容器样式 */
.bills-container {
  background-color: #ffffff;
  padding: 10rpx;
  border-radius: 12rpx;
  margin-bottom: 15rpx;
}

/* 日期分组样式 */
.day-group {
  margin-bottom: 30rpx;
  border-bottom: 1rpx solid #eeeeee;
  // padding-bottom: 10rpx;
}

.day-header {
  // background-color: #f8f8f8;
  // padding: 15rpx 20rpx;
  margin-bottom: 10rpx;
  border-radius: 8rpx;
  font-size: 28rpx;
  color: #333;
  display: flex;
  justify-content: space-between;
  gap: 20rpx;
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
  border-radius: 50%;
  margin-right: 20rpx;
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
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
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
