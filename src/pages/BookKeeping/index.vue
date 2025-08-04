<!--
 * @Date: 2025-07-11 16:18:38
 * @LastEditors: parker 960822987@qq.com
 * @LastEditTime: 2025-08-04 13:10:48
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
        <view class="stats-value">¥{{ animatedIncome || formatNumber(incomeToday) }}</view>
      </view>
      <view class="stats-card expense">
        <view class="stats-title">本月支出</view>
        <view class="stats-value">¥{{ animatedExpense || formatNumber(expenseToday) }}</view>
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
        <scroll-view class="chart-scroll" scroll-x :enable-flex="true">
          <view class="chart-wrapper">
            <BaseChart v-if="chartOption && xAxisLabels.length > 0" :option="chartOption" />
          </view>
        </scroll-view>
      </view>
    </view>
    <view class="bills-container" v-if="dailyRecords">
      <view v-for="dayGroup in dailyRecords" :key="dayGroup.date" class="day-group">
        <view class="day-header">
          <text>{{ dayjs(dayGroup.date).format("MM月DD日 dddd") }}</text>
          <view>
            <text v-if="dayGroup.dayIncome > 0" class="income-label">
              收入：{{ parseFloat(dayGroup.dayIncome).toFixed(2) }}
            </text>
            <text v-if="dayGroup.dayExpense > 0" class="expense-label">
              支出：{{ parseFloat(dayGroup.dayExpense).toFixed(2) }}
            </text>
          </view>
        </view>

        <!-- 具体记录 -->
        <view v-for="record in dayGroup.records" :key="record.id" class="record-item">
          <view class="icon default" @click.stop="editCategory(record)">
            <IconFont :name="record.systemCategory.icon" size="24" color="#f60" />
          </view>
          <view class="record-info">
            <view class="record-left">
              <text class="type">{{ record.title || record.category?.name || "未知" }}</text>
              <!-- 备注可编辑 -->
              <view v-if="editingRemarkId === record.id" class="remark-input-wrapper">
                <input
                  v-model="tempRemark"
                  class="remark-input"
                  @blur="saveRemark(record)"
                  @confirm="saveRemark(record)"
                  auto-focus
                  placeholder="输入备注"
                />
                <view class="remark-icons">
                  <wd-icon name="picture" size="16px" color="gray" @click.stop="onImageSelect" />
                  <wd-icon name="list" size="16px" color="gray" @click.stop="onTagSelect" />
                </view>
              </view>
              <text v-else-if="record.remark" class="remark" @click.stop="editRemark(record)">
                {{ record.remark }}
              </text>
              <text v-else class="remark placeholder" @click.stop="editRemark(record)">
                点击添加备注
              </text>
            </view>
            <text class="amount" :class="record.type" @click.stop="editAmount(record)">
              {{ record.type === "expense" ? "-" : "" }}{{ parseFloat(record.amount).toFixed(2) }}
            </text>
          </view>
        </view>
      </view>
    </view>

    <!-- 弹窗 -->
    <wd-popup v-model="showPopup" position="bottom" round>
      <AmountAdd :edit-record="editingRecord" @close="handleClosePopup" />
    </wd-popup>
    <!-- 在页面底部添加 -->
    <wd-popup v-model="showAmountEditPopup" position="bottom" round>
      <AmountEditKeyboard
        :record="editingAmountRecord"
        :visible="showAmountEditPopup"
        @close="handleCloseAmountEdit"
        @success="handleAmountEditSuccess"
      />
    </wd-popup>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick, type Ref } from "vue"
import type { Dayjs } from "dayjs"
import BaseChart from "@/components/BaseChart.vue"
import AmountAdd from "@/pages/BookKeeping/components/AmountAdd.vue"
import AmountEditKeyboard from "@/pages/BookKeeping/components/AmountEditKeyboard.vue"
import { onReady, onShow } from "@dcloudio/uni-app"
import dayjs from "dayjs"
import "dayjs/locale/zh-cn"

import { useTabbarStore, useBookkeepingStore } from "@/store"
import {
  getMonthlyStats,
  getDailyRecords,
  getMonthlyChartData,
  getRecords,
  updateRecord,
} from "@/api/bookkeeping"
import type { MonthlyStatsResult, DailyRecordGroup } from "@/api/bookkeeping/types"

// 设置dayjs为中文
dayjs.locale("zh-cn")

const tabbarStore = useTabbarStore()
const bookkeepingStore = useBookkeepingStore()

// 数据模型
const incomeToday: Ref<number> = ref(0)
const expenseToday: Ref<number> = ref(0)
const safeAreaInsets: Ref<{ bottom: number }> = ref(
  uni.getSystemInfoSync().safeAreaInsets || { bottom: 0 },
)
const showPopup: Ref<boolean> = ref(false)

// 页面显示时检查是否需要显示添加弹窗
onShow(() => {
  console.log("onShow - shouldShowAdd:", bookkeepingStore.shouldShowAdd)
  if (bookkeepingStore.shouldShowAdd) {
    console.log("设置 showPopup 为 true")
    showPopup.value = true
    bookkeepingStore.setShouldShowAdd(false) // 重置标志
  }
})

const init = (): void => {
  const monthKey: string = currentMonth.value.format("YYYY-MM")
  getMonthlyData(monthKey)
  getDailyRecordsData(monthKey)
  getChartData(monthKey, chartMode.value)
}

// 获取顶部板块数据
const getMonthlyData = (val: string): void => {
  getMonthlyStats(val).then(({ data }: { data: MonthlyStatsResult }) => {
    animatedIncome.value = data.income
    animatedExpense.value = data.expense
  })
}

// 每日记录数据
const dailyRecords: Ref<DailyRecordGroup[]> = ref<DailyRecordGroup[]>([])

// 获取每日记录数据
const getDailyRecordsData = (val: string): void => {
  getDailyRecords(val).then(({ data }: { data: DailyRecordGroup[] }) => {
    dailyRecords.value = data
    console.log("🚀 ~ getDailyRecords ~ data:", dailyRecords.value)
  })
}

// 页面卸载时移除监听
onUnmounted(() => {
  uni.$off("showBookkeepingPopup")
  uni.$off("refreshBookkeepingData") // 如果有的话也要移除
})

// 编辑相关状态
const editingRecord = ref(null)
const editingRemarkId = ref(null)
const tempRemark = ref("")

// 编辑记录函数
const editRecord = (record) => {
  console.log("编辑记录:", record)
  editingRecord.value = record
  showPopup.value = true
}

// 编辑分类 - 直接更换分类
const editCategory = (record) => {
  console.log("编辑分类:", record)
  editingRecord.value = { ...record, editType: "category" }
  showPopup.value = true
}

// 编辑备注 - 原位置编辑
const editRemark = (record) => {
  editingRemarkId.value = record.id
  tempRemark.value = record.remark || ""
  // 不要弹出分类选择弹窗
}

// 保存备注
const saveRemark = async (record) => {
  try {
    uni.showLoading({ title: "保存中..." })

    const updatedData = {
      categoryId: record.categoryId,
      type: record.type,
      amount: record.amount,
      title: record.title,
      remark: tempRemark.value,
      recordDate: record.recordDate,
      recordTime: record.recordTime,
    }

    await updateRecord(record.id, updatedData)

    // 更新本地数据 - 修正变量名
    const dayGroup = dailyRecords.value.find((group) =>
      group.records.some((r) => r.id === record.id),
    )
    if (dayGroup) {
      const recordIndex = dayGroup.records.findIndex((r) => r.id === record.id)
      if (recordIndex > -1) {
        dayGroup.records[recordIndex].remark = tempRemark.value
      }
    }

    uni.showToast({ title: "备注已更新", icon: "success" })
  } catch (error) {
    console.error("更新备注失败:", error)
    uni.showToast({ title: "更新失败", icon: "error" })
  } finally {
    uni.hideLoading()
    editingRemarkId.value = null
    tempRemark.value = ""
  }
}

// 添加状态
const showAmountEditPopup = ref(false)
const editingAmountRecord = ref(null)

// 编辑金额 - 显示简化版金额键盘
const editAmount = (record) => {
  console.log("编辑金额:", record)
  editingAmountRecord.value = record
  showAmountEditPopup.value = true
}

// 关闭金额编辑弹窗
const handleCloseAmountEdit = () => {
  showAmountEditPopup.value = false
  editingAmountRecord.value = null
}

// 金额编辑成功
const handleAmountEditSuccess = () => {
  showAmountEditPopup.value = false
  editingAmountRecord.value = null
  // 刷新数据
  init()
}

// 修改关闭弹窗函数，处理编辑完成
const handleClosePopup = (): void => {
  console.log("关闭弹窗")
  showPopup.value = false
  editingRecord.value = null // 清空编辑状态
}

// 格式化数字
const formatNumber = (num: number): string => {
  return num.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")
}

// 状态管理
const currentMonth: Ref<Dayjs> = ref(dayjs())
const chartMode: Ref<"income" | "expense"> = ref("expense") // 默认显示支出

// 数据结构重构成按月份存储
const monthlyData: Ref<Record<string, any>> = ref({})

// 新增图表数据状态
const chartData: Ref<number[]> = ref<number[]>([])

// 获取图表数据
const getChartData = async (month: string, type: "income" | "expense"): Promise<void> => {
  try {
    const { data }: { data: number[] } = await getMonthlyChartData(month, type)
    chartData.value = data
  } catch (error) {
    console.error("获取图表数据失败:", error)
    chartData.value = Array(daysInMonth.value).fill(0)
  }
}

// 计算本月天数
const daysInMonth = computed((): number => {
  return dayjs(currentMonth.value).daysInMonth()
})

// 生成X轴日期标签 (1日, 2日,...)
const xAxisLabels = computed((): string[] => {
  return Array.from({ length: daysInMonth.value }, (_, i) => `${i + 1}日`)
})

// 动态图表配置
const chartOption = computed(() => {
  const today: number = dayjs().date()
  const isCurrentMonth: boolean = currentMonth.value.format("YYYY-MM") === dayjs().format("YYYY-MM")

  return {
    grid: { left: "3%", right: "4%", bottom: "15%" },
    xAxis: {
      type: "category" as const,
      data: xAxisLabels.value,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: "#999",
        fontSize: 11,
      },
    },
    yAxis: {
      type: "value" as const,
      minInterval: 1,
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: {
        lineStyle: {
          color: "#f0f0f0",
          type: "dashed" as const,
        },
      },
    },
    series: [
      {
        type: "bar" as const,
        barWidth: "60%",
        data: chartData.value.map((value: number, index: number) => ({
          value,
          itemStyle: {
            color: chartMode.value === "income" ? "#409eff" : "#ffae4c",
            borderRadius: [4, 4, 0, 0],
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
          position: "top" as const,
          color: "#666",
          fontSize: 11,
          formatter: function (params: any) {
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
                    type: "dashed" as const,
                    width: 1,
                  },
                  label: {
                    show: true,
                    position: "insideEndTop" as const,
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

// 监听图表模式变化
watch(chartMode, (newMode: "income" | "expense") => {
  getChartData(currentMonth.value.format("YYYY-MM"), newMode)
})

// 切换月份功能
const changeMonth = (direction: number): void => {
  currentMonth.value = dayjs(currentMonth.value).add(direction, "month")
  const monthKey: string = currentMonth.value.format("YYYY-MM")

  getMonthlyData(monthKey)
  getDailyRecordsData(monthKey)
  getChartData(monthKey, chartMode.value)
}

// 初始化模拟数据（实际应用需替换为API请求）
onMounted(() => {
  init()

  // 监听数据刷新事件
  uni.$on("refreshBookkeepingData", () => {
    console.log("刷新记账数据")
    init() // 重新加载数据
  })

  // 添加事件监听 - 监听来自tabbar的弹窗显示事件
  uni.$on("showBookkeepingPopup", () => {
    console.log("收到显示弹窗事件")
    showPopup.value = true
  })

  nextTick(() => {
    setTimeout(() => {
      mounted.value = true
      setTimeout(() => {
        animateNumber(
          animatedIncome.value,
          (val: string) => (animatedIncome.value = val),
          incomeAnimating,
        )
      }, 600)
      setTimeout(() => {
        animateNumber(
          animatedExpense.value,
          (val: string) => (animatedExpense.value = val),
          expenseAnimating,
        )
      }, 800)
    }, 100)
  })
})

// 页面准备就绪
onReady(() => {})

// 查看所有账单
const viewAllBills = (): void => {
  uni.navigateTo({
    url: "/pages/finance/bills",
  })
}

// 添加账单
const addBill = (): void => {
  uni.navigateTo({
    url: "/pages/finance/create",
  })
}

// 页面卸载时销毁图表
onUnmounted(() => {})

// 数字动画相关
const animatedIncome: Ref<number | string> = ref(0)
const animatedExpense: Ref<number | string> = ref(0)
const incomeAnimating: Ref<boolean> = ref(false)
const expenseAnimating: Ref<boolean> = ref(false)

// 改进的数字动画函数
const animateNumber = (
  target: number,
  setter: (val: string) => void,
  animatingFlag: Ref<boolean>,
): void => {
  animatingFlag.value = true
  let current: number = 0
  const duration: number = 1500 // 动画持续时间
  const steps: number = 60 // 动画步数
  const increment: number = target / steps
  const stepTime: number = duration / steps

  const timer: number = setInterval(() => {
    current += increment
    if (current >= target) {
      current = target
      clearInterval(timer)
      animatingFlag.value = false
    }
    setter(formatNumber(Math.floor(current)))
  }, stepTime)
}

const mounted: Ref<boolean> = ref(false)
// 添加一个标志位
const isClickingIcon = ref(false)

// 处理备注输入框失焦
const handleRemarkBlur = (record) => {
  // 如果正在点击图标，不保存
  if (isClickingIcon.value) {
    isClickingIcon.value = false
    return
  }
  saveRemark(record)
}

// 图片选择
const onImageSelect = () => {
  isClickingIcon.value = true
  uni.chooseImage({
    count: 1,
    success: (res) => {
      uni.showToast({ title: "图片已选择", icon: "success" })
      // 这里可以处理图片上传逻辑
    },
  })
}

// 标签选择
const onTagSelect = () => {
  isClickingIcon.value = true
  uni.showToast({ title: "选择标签", icon: "none" })
  // 这里可以处理标签选择逻辑
}
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
  margin-bottom: 15px;
}

.stats-card {
  flex: 1;
  padding: 12px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgb(0 0 0 / 5%);

  &.income {
    background-color: #409eff;
    border-top: 2px solid #409eff;
  }

  &.expense {
    background-color: #ffae4c;
    border-top: 2px solid #ffae4c;
  }
}

.stats-title {
  margin-bottom: 6px;
  font-size: 12px;
  color: white;
}

.stats-value {
  font-size: 18px;
  font-weight: 600;
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
  padding: 8rpx;
  margin-bottom: 15rpx;
  background-color: #fff;
  border-radius: 12rpx;
}
/* 日期分组样式 */
.day-group {
  margin-bottom: 24rpx;

  &:last-child {
    margin-bottom: 0;
  }
}

.day-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12rpx 16rpx;
  margin-bottom: 8rpx;
  font-size: 26rpx;
  color: #333;
  background-color: #f8f9fa;
  border-radius: 8rpx;
}

.income-label {
  margin-right: 16rpx;
  font-size: 24rpx;
  color: #409eff;
}

.expense-label {
  font-size: 24rpx;
  color: #ffae4c;
}
/* 记录项样式 */
.record-item {
  display: flex;
  align-items: center;
  padding: 12rpx 16rpx;
  margin-bottom: 8rpx;
  border-radius: 8rpx;
  transition: background-color 0.2s;

  &:hover {
    // background-color: #f5f5f5;
  }

  &:last-child {
    margin-bottom: 0;
  }
}

.icon {
  display: flex !important;
  flex-shrink: 0;
  align-items: center !important;
  justify-content: center !important;
  width: 60rpx;
  height: 60rpx;
  margin-right: 20rpx;
  text-align: center;
  border-radius: 50%;

  &.default {
    color: #666;
    background-color: #f8f8f8;
  }
}

.icon {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: 100%;
  height: 100%;
  margin-left: 20rpx;
  font-size: 24rpx; /* 添加字体大小确保图标大小一致 */
  line-height: 1 !important;
}
/* 如果使用IconFont组件，确保图标居中 */
.icon .iconfont {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: 100% !important;
  height: 100% !important;
  line-height: 1 !important;
}
/* 确保图片图标也居中 */
.icon image {
  width: 36rpx !important;
  height: 36rpx !important;
  object-fit: contain;
}

.record-info {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: space-between;
}

.record-left {
  display: flex;
  flex: 1;
  flex-direction: column;
}

.type {
  font-size: 28rpx;
  font-weight: 500;
  line-height: 1.2;
  color: #333;
}

.remark {
  margin-top: 2rpx;
  font-size: 22rpx;
  line-height: 1.2;
  color: #999;
}

.remark-input-wrapper {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 4rpx 8rpx;
  background: transparent;
  border: 1rpx solid #ddd;
  border-radius: 4rpx;
}

.remark-input {
  flex: 1;
  min-height: 32rpx;
  font-size: 24rpx;
  color: #999;
  background: transparent;
  border: none;
  outline: none;
}

.remark-icons {
  display: flex;
  gap: 10rpx;
  align-items: center;
  margin-left: 10rpx;
}

.remark.placeholder {
  font-style: italic;
  color: #ccc;
}

.remark {
  display: inline-block;
  min-height: 32rpx;
  cursor: pointer;
}

.amount {
  flex-shrink: 0;
  font-size: 28rpx;
  font-weight: 600;

  &.income {
    color: #409eff;
  }

  &.expense {
    color: #333;
  }
}
</style>
