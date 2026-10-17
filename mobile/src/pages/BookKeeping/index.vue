<!--
 * @Date: 2025-07-11 16:18:38
 * @LastEditors: parker 960822987@qq.com
 * @LastEditTime: 2025-08-13 18:13:58
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
    <!-- <view class="chart-container">
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
      </view> -->
    <!-- 修复图表容器，添加条件渲染 -->
    <!-- <view class="chart-scroll-container">
        <scroll-view class="chart-scroll" scroll-x :enable-flex="true">
          <view class="chart-wrapper"> -->
    <!-- #ifdef H5 -->
    <!-- <BaseChart v-if="chartOption" :option="chartOption" /> -->
    <!-- #endif -->
    <!-- #ifdef MP-WEIXIN -->
    <!-- 只有在没有弹窗时才显示图表 -->
    <!-- <lEchart
              ref="barChartRef"
              :custom-style="`height: 300px; width: 100%; background: transparent; z-index: 1; position: relative;`"
            ></lEchart> -->
    <!-- #endif -->
    <!-- 无数据提示 -->
    <!-- <view v-if="!chartOption" class="no-data">暂无数据</view>
          </view>
        </scroll-view>
      </view>
    </view> -->
    <!-- 调试信息 -->
    <!-- <view style="padding: 20rpx; background: #f0f0f0; margin: 10rpx;">
      <text>调试信息：dailyRecords.length = {{ dailyRecords?.length || 0 }}</text>
    </view> -->
    <view class="bills-container" v-if="dailyRecords && dailyRecords.length > 0">
      <view v-for="dayGroup in dailyRecords" :key="dayGroup.date" class="day-group">
        <view class="day-header">
          <text>{{ dayjs(dayGroup.date).format("MM月DD日 dddd") }}</text>
          <view>
            <text v-if="dayGroup.dayIncome > 0" class="income-label">
              收入：{{ Number(dayGroup.dayIncome).toFixed(2) }}
            </text>
            <text v-if="dayGroup.dayExpense > 0" class="expense-label">
              支出：{{ Number(dayGroup.dayExpense).toFixed(2) }}
            </text>
          </view>
        </view>

        <!-- 具体记录 -->
        <view v-for="record in dayGroup.records" :key="record.id" class="record-wrapper">
          <!-- #ifdef MP-WEIXIN -->
          <!-- 小程序左滑删除 -->
          <movable-area class="movable-area">
            <movable-view
              class="movable-view"
              direction="horizontal"
              :x="0"
              :out-of-bounds="true"
              :damping="50"
              :inertia="true"
              @change="handleMoveChange($event, record)"
            >
              <view class="record-item" @longpress="showDeleteOptions(record)">
                <view class="icon default" @click.stop="editCategory(record)">
                  <wd-icon
                    :name="record.systemCategory?.icon || record.category?.icon || 'star'"
                    :color="record.systemCategory?.color || record.category?.color || '#409eff'"
                  />
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
                        <wd-icon
                          name="picture"
                          size="16px"
                          color="gray"
                          @click.stop="onImageSelect"
                        />
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
                    {{ formatRecordAmount(record) }}
                  </text>
                </view>
              </view>
            </movable-view>
          </movable-area>
          <!-- #endif -->

          <!-- #ifdef H5 -->
          <!-- H5端点击删除 -->
          <view class="h5-record-container">
            <view
              class="record-item"
              @contextmenu.prevent="showDeleteOptions(record)"
              @longpress="showDeleteOptions(record)"
            >
              <view class="icon default" @click.stop="editCategory(record)">
                <wd-icon
                  :name="record.systemCategory?.icon || record.category?.icon || 'star'"
                  :color="record.systemCategory?.color || record.category?.color || '#409eff'"
                />
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
                      <wd-icon
                        name="picture"
                        size="16px"
                        color="gray"
                        @click.stop="onImageSelect"
                      />
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
                  {{ formatRecordAmount(record) }}
                </text>
              </view>
            </view>
            <!-- H5删除按钮 -->
            <view class="delete-icon" @click.stop="showDeleteOptions(record)">
              <wd-icon name="delete" color="#ff4757" size="18px" />
            </view>
          </view>
          <!-- #endif -->
        </view>
      </view>
    </view>

    <!-- 弹窗 -->
    <wd-popup v-model="showPopup" position="bottom" round :z-index="9999">
      <AmountAdd
        v-if="showPopup"
        :edit-record="editingRecord || undefined"
        @close="handleClosePopup"
      />
    </wd-popup>
    <!-- 在页面底部添加 -->
    <wd-popup v-model="showAmountEditPopup" position="bottom" round :z-index="9999">
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
  updateRecord,
  deleteRecord,
} from "@/api/bookkeeping"
import type { MonthlyStatsResult, DailyRecordGroup } from "@/api/bookkeeping/types"

// #ifdef MP-WEIXIN
// @ts-ignore
const echarts = require("../../static/echarts.min.js")
// #endif
// 设置dayjs为中文
dayjs.locale("zh-cn")

/* */
const barChartRef = ref<any>()
let myChart: any = null

// 响应式数据
const activeTab = ref("bar")

// 状态管理 - 移到前面声明
const currentMonth: Ref<Dayjs> = ref(dayjs())
const chartMode: Ref<"income" | "expense"> = ref("expense") // 默认显示支出
const chartData: Ref<number[]> = ref<number[]>([])

const initChart = () => {
  // #ifdef MP-WEIXIN
  try {
    nextTick(() => {
      if (barChartRef.value) {
        barChartRef.value.init(echarts, (chart: any) => {
          try {
            myChart = chart
            console.log("图表初始化成功")

            // 如果有数据，立即设置配置
            if (chartOption.value) {
              chart.clear()
              chart.setOption(chartOption.value, true)
              console.log("图表配置设置成功")
            }
          } catch (error) {
            console.error("图表配置失败:", error)
          }
        })
      } else {
        console.log("barChartRef.value 不存在，延迟重试")
        setTimeout(() => {
          initChart()
        }, 200)
      }
    })
  } catch (error) {
    console.error("图表初始化失败:", error)
  }
  // #endif
}

// 监听图表数据变化，更新微信小程序图表
// #ifdef MP-WEIXIN
watch(
  [chartData, chartMode, currentMonth],
  () => {
    try {
      // 只有在没有弹窗时才更新图表
      if (!showPopup.value && !showAmountEditPopup.value && !hasChildPopup.value) {
        nextTick(() => {
          try {
            if (myChart && chartOption.value) {
              myChart.clear()
              myChart.setOption(chartOption.value, true)
              console.log("图表更新成功")
            } else if (barChartRef.value && chartOption.value) {
              // 如果图表还未初始化，重新初始化
              // initChart()
            }
          } catch (chartError) {
            console.error("更新图表失败:", chartError)
          }
        })
      }
    } catch (error) {
      console.error("图表监听器错误:", error)
    }
  },
  { deep: true },
)
// #endif

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
  // 每次回到记账页都刷新，保证新增/编辑后的数据与首页同步
  init()
})

// 监听子组件弹窗状态
onMounted(() => {
  // 监听子组件弹窗打开
  uni.$on("childPopupShow", () => {
    console.log("子组件弹窗打开，隐藏图表")
    hasChildPopup.value = true
  })

  // 监听子组件弹窗关闭
  uni.$on("childPopupHide", () => {
    console.log("子组件弹窗关闭，显示图表")
    hasChildPopup.value = false
  })

  // #ifdef H5
  // H5环境下添加全局弹窗检测
  const checkForPopups = () => {
    // 检测页面中是否有弹窗元素
    const popupElements = document.querySelectorAll(
      '.wd-popup, .uni-popup, [class*="popup"], [class*="modal"]',
    )
    const hasVisiblePopup = Array.from(popupElements).some((el) => {
      const style = window.getComputedStyle(el)
      return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0"
    })

    if (hasVisiblePopup !== hasChildPopup.value) {
      hasChildPopup.value = hasVisiblePopup
      console.log("检测到弹窗状态变化:", hasVisiblePopup)
    }
  }

  // 定期检查弹窗状态
  const popupCheckInterval = setInterval(checkForPopups, 500)

  // 页面卸载时清除定时器
  onUnmounted(() => {
    clearInterval(popupCheckInterval)
  })
  // #endif
})

const init = async (): Promise<void> => {
  const monthKey: string = currentMonth.value.format("YYYY-MM")

  // 并行加载数据
  await Promise.all([
    getMonthlyData(monthKey),
    getDailyRecordsData(monthKey),
    getChartData(monthKey, chartMode.value),
  ])

  console.log("数据初始化完成")
}

// 获取顶部板块数据
const getMonthlyData = async (val: string): Promise<void> => {
  try {
    const response: any = await getMonthlyStats(val)
    const data = response.data?.data || response.data
    animatedIncome.value = data.income || 0
    animatedExpense.value = data.expense || 0
  } catch (error) {
    console.error("获取月度统计失败:", error)
    animatedIncome.value = 0
    animatedExpense.value = 0
  }
}

// 每日记录数据
const dailyRecords: Ref<DailyRecordGroup[]> = ref<DailyRecordGroup[]>([])

// 获取每日记录数据
const getDailyRecordsData = async (val: string): Promise<void> => {
  try {
    const response: any = await getDailyRecords(val)
    const data = response.data?.data || response.data
    dailyRecords.value = Array.isArray(data) ? data : []
    console.log("🚀 ~ getDailyRecords ~ data:", dailyRecords.value)
  } catch (error) {
    console.error("获取每日记录失败:", error)
    dailyRecords.value = []
  }
}

// 页面卸载时移除监听
onUnmounted(() => {
  uni.$off("showBookkeepingPopup")
  uni.$off("refreshBookkeepingData") // 如果有的话也要移除
  uni.$off("childPopupShow")
  uni.$off("childPopupHide")
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
// 子组件弹窗状态
const hasChildPopup = ref(false)

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

  // #ifdef MP-WEIXIN
  // 弹窗关闭后重新初始化图表
  // nextTick(() => {
  //   setTimeout(() => {
  //     initChart()
  //   }, 100)
  // })
  // #endif
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

  // #ifdef MP-WEIXIN
  // 弹窗关闭后重新初始化图表
  // nextTick(() => {
  //   setTimeout(() => {
  //     initChart()
  //   }, 100)
  // })
  // #endif
}

// 删除相关方法
// 防抖标记，防止重复触发删除对话框
const isShowingDeleteModal = ref(false)

// 处理左滑移动事件
const handleMoveChange = (event: any, record: any) => {
  const { x } = event.detail
  console.log("移动事件:", x, record)

  // 当左滑超过10rpx且没有正在显示删除对话框时，弹出删除确认对话框
  if (x < -80 && !isShowingDeleteModal.value) {
    isShowingDeleteModal.value = true

    // 添加震动反馈
    uni.vibrateShort()

    // 弹出删除确认对话框
    uni.showModal({
      title: "确认删除",
      content: `确定要删除这条记录吗？\n${record.title || record.category?.name || "未知"} ${record.amount}元`,
      confirmText: "删除",
      confirmColor: "#ff4757",
      success: (res) => {
        if (res.confirm) {
          // 立即执行删除操作
          handleDeleteRecord(record)
        }
      },
      complete: () => {
        // 重置防抖标记
        isShowingDeleteModal.value = false
        console.log("删除对话框已关闭")
      },
    })
  }
}

// 显示删除选项
const showDeleteOptions = (record: any) => {
  // #ifdef H5
  // H5端显示确认弹窗
  uni.showModal({
    title: "确认删除",
    content: `确定要删除这条记录吗？\n${record.title || record.category?.name || "未知"} ${record.amount}元`,
    confirmText: "删除",
    confirmColor: "#ff4757",
    success: (res) => {
      if (res.confirm) {
        handleDeleteRecord(record)
      }
    },
  })
  // #endif

  // #ifdef MP-WEIXIN
  // 小程序端显示操作菜单
  uni.showActionSheet({
    itemList: ["删除记录"],
    itemColor: "#ff4757",
    success: (res) => {
      if (res.tapIndex === 0) {
        confirmDelete(record)
      }
    },
  })
  // #endif
}

// 确认删除（小程序左滑删除按钮点击）
const confirmDelete = (record: any) => {
  uni.showModal({
    title: "确认删除",
    content: `确定要删除这条记录吗？\n${record.title || record.category?.name || "未知"} ${record.amount}元`,
    confirmText: "删除",
    confirmColor: "#ff4757",
    success: (res) => {
      if (res.confirm) {
        handleDeleteRecord(record)
      }
    },
  })
}

// 执行删除操作
const handleDeleteRecord = async (record: any) => {
  try {
    uni.showLoading({ title: "删除中..." })

    await deleteRecord(record.id)

    // 立即关闭加载提示
    uni.hideLoading()

    // 从本地数据中移除已删除的记录，避免依赖API刷新
    dailyRecords.value = dailyRecords.value
      .map((dayGroup) => ({
        ...dayGroup,
        records: dayGroup.records.filter((r) => r.id !== record.id),
      }))
      .filter((dayGroup) => dayGroup.records.length > 0) // 移除空的日期组

    uni.showToast({
      title: "删除成功",
      icon: "success",
    })

    // 延迟刷新数据以更新统计信息
    setTimeout(() => {
      const monthKey: string = currentMonth.value.format("YYYY-MM")
      getMonthlyData(monthKey) // 只刷新统计数据
      getChartData(monthKey, chartMode.value) // 刷新图表数据
    }, 300)
  } catch (error) {
    console.error("删除记录失败:", error)
    uni.hideLoading()
    uni.showToast({
      title: "删除失败",
      icon: "error",
    })
  }
}

// 格式化数字
const formatNumber = (num: number): string => {
  return num.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")
}

// 记录金额：支出显示负号，负数（退款/冲正）保留原符号，避免出现 "--" 前缀
const formatRecordAmount = (record: any): string => {
  const value = Number(record?.amount || 0)
  const sign = value < 0 ? "-" : record?.type === "expense" ? "-" : ""
  return `${sign}${Math.abs(value).toFixed(2)}`
}

// 数据结构重构成按月份存储
const monthlyData: Ref<Record<string, any>> = ref({})

// 获取图表数据
const getChartData = async (month: string, type: "income" | "expense"): Promise<void> => {
  try {
    const response: any = await getMonthlyChartData(month, type)
    const data = response.data?.data || response.data
    chartData.value = Array.isArray(data) ? data : []

    console.log("图表数据获取成功:", chartData.value)

    // #ifdef MP-WEIXIN
    // 数据更新后立即更新图表
    nextTick(() => {
      if (myChart && chartOption.value) {
        try {
          myChart.clear()
          myChart.setOption(chartOption.value, true)
          console.log("图表更新成功")
        } catch (chartError) {
          console.error("图表更新失败:", chartError)
        }
      } else if (!myChart && barChartRef.value) {
        // 如果图表还未初始化，重新初始化
        console.log("图表未初始化，重新初始化")
        // initChart()
      }
    })
    // #endif
  } catch (error) {
    console.error("获取图表数据失败:", error)
    try {
      const days = daysInMonth.value
      if (days > 0 && days <= 31) {
        chartData.value = Array(days).fill(0)
      } else {
        chartData.value = Array(31).fill(0) // 默认31天
      }
      console.log("使用默认图表数据:", chartData.value)
    } catch (arrayError) {
      console.error("创建默认图表数据失败:", arrayError)
      chartData.value = [] // 最后的兜底方案
    }
  }
}

// 计算本月天数
const daysInMonth = computed((): number => {
  try {
    const days = dayjs(currentMonth.value).daysInMonth()
    return days > 0 && days <= 31 ? days : 31 // 确保返回有效的天数
  } catch (error) {
    console.error("计算月份天数失败:", error)
    return 31 // 默认返回31天
  }
})

// 生成X轴日期标签 (1日, 2日,...)
const xAxisLabels = computed((): string[] => {
  try {
    const days = daysInMonth.value
    if (days > 0 && days <= 31) {
      return Array.from({ length: days }, (_, i) => `${i + 1}日`)
    }
    return Array.from({ length: 31 }, (_, i) => `${i + 1}日`) // 默认31天
  } catch (error) {
    console.error("生成日期标签失败:", error)
    return Array.from({ length: 31 }, (_, i) => `${i + 1}日`)
  }
})

// 动态图表配置
const chartOption = computed(() => {
  const isCurrentMonth: boolean = currentMonth.value.format("YYYY-MM") === dayjs().format("YYYY-MM")

  // 计算数据的最大值，用于设置Y轴范围
  const maxValue = Math.max(...chartData.value, 0)
  const yAxisMax = maxValue > 0 ? Math.ceil(maxValue * 1.2) : 100 // 如果没有数据，默认最大值100

  // #ifdef MP-WEIXIN
  // 微信小程序端简化配置
  return {
    // 设置图表的z-index
    zlevel: 1,
    z: 1,
    grid: {
      left: "10%",
      right: "4%",
      bottom: "15%",
      top: "10%",
      containLabel: true,
    },
    xAxis: {
      type: "category",
      data: xAxisLabels.value,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: "#999",
        fontSize: 10,
        interval: Math.floor(xAxisLabels.value.length / 8), // 控制显示的标签数量
      },
    },
    yAxis: {
      type: "value",
      min: 0,
      max: yAxisMax,
      minInterval: maxValue > 10 ? Math.ceil(maxValue / 10) : 1,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: "#999",
        fontSize: 10,
        formatter: (value: number) => {
          if (value >= 1000) {
            return (value / 1000).toFixed(1) + "k"
          }
          return value.toString()
        },
      },
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
        barWidth: "50%",
        data: chartData.value.map((value: number, index: number) => ({
          value,
          itemStyle: {
            color: chartMode.value === "income" ? "#409eff" : "#ffae4c",
            borderRadius: [3, 3, 0, 0],
          },
        })),
        label: {
          show: maxValue > 0, // 只有有数据时才显示标签
          position: "top",
          color: "#666",
          fontSize: 9,
          formatter: (params: any) => {
            return params.value > 0 ? params.value : ""
          },
        },
      },
    ],
  }
  // #endif
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

  // 更新微信小程序图表
  // #ifdef MP-WEIXIN
  nextTick(() => {
    console.log("🚀 ~ changeMonth ~ chartOption.value切换:", chartOption.value)
    if (myChart && chartOption.value) {
      myChart.clear()
      myChart.setOption(chartOption.value, true)
    }
  })
  // #endif
}

// 初始化（数据加载已移到 onShow，保证每次进入页面都刷新）
onMounted(async () => {
  // #ifdef MP-WEIXIN
  // 延迟初始化图表，确保数据已加载
  // setTimeout(() => {
  //   console.log("开始初始化图表")
  //   initChart()
  // }, 800)
  // #endif

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
  position: relative;
  z-index: 0; /* 设置页面基础层级 */
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
  position: relative;
  z-index: 1; /* 确保图表容器层级低于弹窗 */
  padding: 16px;
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

.chart-scroll-container {
  position: relative;
  z-index: 1; /* 设置较低的z-index */
  width: 100%;
  height: 320px;
  overflow: hidden;
}

.chart-scroll {
  width: 100%;
  height: 100%;
}

.chart-wrapper {
  position: relative;
  z-index: 1; /* 确保图表容器层级较低 */
  width: 100%;
  min-width: 100%;
  height: 300px;
}

.chart {
  z-index: 1; /* 图表本身也设置较低层级 */
  width: 100%;
  height: 300px;
  margin-top: 10px;
}

.no-data {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 300px;
  font-size: 16px;
  color: #999;
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
  box-sizing: border-box;
  display: flex;
  align-items: center;
  padding: 12rpx 16rpx;
  margin-bottom: 8rpx;
  background-color: #fff;
  border-radius: 16rpx;
  transition: all 0.2s;

  &:hover {
    background-color: #f8f9fa;
    border-color: #e6e6e6;
  }

  &:last-child {
    margin-bottom: 0;
  }
}

.icon {
  display: flex !important;
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
/* 如果使用IconFont组件，确保图标居中 */
.icon .iconfont {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: 100% !important;
  height: 100% !important;
  font-size: 24rpx !important;
  line-height: 1 !important;
}
/* 确保图片图标也居中 */
.icon image {
  width: 36rpx !important;
  height: 36rpx !important;
  object-fit: contain;
}
/* 如果有其他子元素需要居中 */
.icon text {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: 100% !important;
  height: 100% !important;
  font-size: 24rpx !important;
  line-height: 1 !important;
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
  max-width: calc(100% - 120rpx); /* 限制最大宽度，为右侧金额留出空间 */
  // overflow: hidden;
}

.type {
  font-size: 28rpx;
  font-weight: 500;
  line-height: 1.2;
  color: #333;
}

.remark {
  max-width: 100%;
  margin-top: 2rpx;
  overflow: hidden;
  font-size: 22rpx;
  line-height: 1.2;
  color: #999;
  text-overflow: ellipsis;
  word-break: break-all;
  white-space: nowrap;
}

.remark-input-wrapper {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  max-width: 100%;
  height: 32rpx; /* 固定高度，避免抖动 */
  padding: 4rpx 8rpx;
  margin-top: 2rpx;
  background: #f8f9fa;
  border: 1rpx solid #e9ecef;
  border-radius: 6rpx;
  transition: none; /* 移除过渡动画 */
}

.remark-input {
  box-sizing: border-box;
  flex: 1;
  height: 24rpx; /* 固定高度 */
  font-size: 22rpx;
  line-height: 24rpx; /* 与高度一致 */
  color: #333;
  background: transparent;
  border: none;
  outline: none;
}

.remark-icons {
  display: flex;
  flex-shrink: 0;
  gap: 4rpx;
  align-items: center;
  height: 24rpx; /* 与输入框高度一致 */
  margin-left: 8rpx;
}

.remark.placeholder {
  font-style: italic;
  color: #ccc;
}

.remark {
  display: inline-block;
  min-height: 20rpx; /* 与输入框保持一致 */
  margin-top: 2rpx;
  font-size: 20rpx; /* 与输入框字体一致 */
  line-height: 1;
  color: #999;
  cursor: pointer;
}

.amount {
  flex-shrink: 0;
  min-width: 100rpx; /* 确保金额区域有足够宽度 */
  font-size: 28rpx;
  font-weight: 600;
  text-align: right; /* 右对齐 */

  &.income {
    color: #409eff;
  }

  &.expense {
    color: #333;
  }
}
/* 删除功能样式 */
.record-wrapper {
  position: relative;
  margin-bottom: 8rpx;
  overflow: hidden; /* 隐藏超出部分，确保删除按钮初始时不可见 */
}
/* 小程序左滑删除样式 */
.movable-area {
  position: relative;
  width: 100%;
  height: auto; /* 自动高度 */
  min-height: 120rpx; /* 最小高度确保可滑动 */
}

.movable-view {
  width: 100%;
  height: auto;
  min-height: 120rpx;
  background: #fff;
}
/* H5删除按钮样式 */
.h5-record-container {
  display: flex;
  align-items: center;
  width: 100%;
}

.h5-record-container .record-item {
  flex: 1;
  transition: transform 0.2s ease;
}

.delete-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40rpx;
  height: 40rpx;
  margin-left: 16rpx;
  background: #fff;
  border-radius: 50%;
  box-shadow: 0 2rpx 8rpx rgb(255 71 87 / 20%);
  opacity: 0.7;
  transition: all 0.2s ease;
}

.delete-icon:hover {
  background: #ff4757;
  opacity: 1;
  transform: scale(1.1);
}

.delete-icon:hover .wd-icon {
  color: #fff !important;
}
/* 记录项在H5端的调整 */
/* #ifdef H5 */
.h5-record-container:hover .record-item {
  transform: translateX(-10rpx);
}

.h5-record-container:hover .delete-icon {
  opacity: 1;
  transform: translateX(0);
}
/* #endif */
</style>
